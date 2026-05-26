-- 크루 기능 1단계: 생성 + 가입(초대코드) + 멤버 관리.
-- 크루 공간/모임/대결은 다음 단계.

-- ── invite_code 생성 함수 (먼저 만들어야 default 로 쓸 수 있음)
create or replace function gen_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- 혼동 문자(I/O/0/1) 제외
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- ── crews
create table crews (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  invite_code   text not null unique default gen_invite_code(),
  owner_id      uuid not null references profiles(id) on delete cascade,
  home_gym_id   uuid references gyms(id) on delete set null,
  image_url     text,
  member_count  int not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_crews_owner on crews(owner_id);

-- ── crew_members
create table crew_members (
  crew_id    uuid not null references crews(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       text not null default 'member',   -- owner / member (admin v2)
  joined_at  timestamptz not null default now(),
  primary key (crew_id, user_id)
);
create index idx_crew_members_user on crew_members(user_id);

-- ── RLS
alter table crews enable row level security;
alter table crew_members enable row level security;

create policy crews_select_all on crews for select using (true);
create policy crews_insert_auth on crews for insert with check (auth.uid() = owner_id);
create policy crews_update_owner on crews for update using (auth.uid() = owner_id);
create policy crews_delete_owner on crews for delete using (auth.uid() = owner_id);

create policy cm_select_all on crew_members for select using (true);
create policy cm_insert_self on crew_members for insert with check (auth.uid() = user_id);
create policy cm_delete_self on crew_members for delete using (auth.uid() = user_id);
create policy cm_delete_by_owner on crew_members for delete using (
  exists (
    select 1 from crews
    where crews.id = crew_members.crew_id and crews.owner_id = auth.uid()
  )
);

-- ── member_count 트리거
create or replace function bump_crew_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update crews set member_count = member_count + 1 where id = new.crew_id;
  elsif tg_op = 'DELETE' then
    update crews set member_count = greatest(0, member_count - 1) where id = old.crew_id;
  end if;
  return null;
end;
$$;

create trigger trg_crew_member_count
  after insert or delete on crew_members
  for each row execute function bump_crew_member_count();
