-- 크루 가입 요청 흐름.
-- 기존: 초대코드 입력 시 즉시 crew_members INSERT.
-- 변경: 초대코드 입력 시 crew_join_requests INSERT (pending) → 크루장 수락 시 멤버 추가.

create table crew_join_requests (
  id           uuid primary key default gen_random_uuid(),
  crew_id      uuid not null references crews(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  message      text,                  -- 한 줄 소개 (옵션)
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   uuid references profiles(id) on delete set null
);

-- 한 사용자가 한 크루에 pending 은 1 개만 (수락/거절/취소된 건 재요청 가능)
create unique index idx_crew_join_requests_unique_pending
  on crew_join_requests(crew_id, user_id)
  where status = 'pending';

create index idx_crew_join_requests_crew_pending
  on crew_join_requests(crew_id, created_at desc)
  where status = 'pending';

create index idx_crew_join_requests_user
  on crew_join_requests(user_id, created_at desc);

alter table crew_join_requests enable row level security;

-- 본인 요청 SELECT (내 요청 목록 조회)
create policy cjr_select_self on crew_join_requests for select
  using (user_id = auth.uid());

-- 크루장 SELECT (해당 크루의 요청 보기)
create policy cjr_select_owner on crew_join_requests for select
  using (
    exists (
      select 1 from crews
      where crews.id = crew_join_requests.crew_id
        and crews.owner_id = auth.uid()
    )
  );

-- 본인 INSERT (요청 생성). user_id = 본인.
create policy cjr_insert_self on crew_join_requests for insert
  with check (user_id = auth.uid());

-- 본인 UPDATE (cancelled 로만 — 내 요청 취소)
create policy cjr_update_self_cancel on crew_join_requests for update
  using (user_id = auth.uid() and status = 'pending');

-- 크루장 UPDATE (accepted / rejected)
create policy cjr_update_owner on crew_join_requests for update
  using (
    exists (
      select 1 from crews
      where crews.id = crew_join_requests.crew_id
        and crews.owner_id = auth.uid()
    )
  );

-- 트리거: INSERT(pending) 시 크루장에게 알림
create or replace function crew_join_request_notify_owner()
returns trigger as $$
declare
  v_crew_name text;
  v_owner_id uuid;
  v_username text;
begin
  if new.status <> 'pending' then return new; end if;
  select c.name, c.owner_id into v_crew_name, v_owner_id
    from crews c where c.id = new.crew_id;
  select coalesce(p.display_name, p.username) into v_username
    from profiles p where p.id = new.user_id;

  if v_owner_id is not null and v_owner_id <> new.user_id then
    insert into notifications(user_id, type, title, body, link)
    values (
      v_owner_id,
      'crew_join_request',
      '가입 요청 도착',
      coalesce(v_username, '누군가') || ' 님이 ' || v_crew_name || ' 가입을 요청했어요.',
      '/crew/' || new.crew_id::text
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_crew_join_request_notify_owner
  after insert on crew_join_requests
  for each row execute function crew_join_request_notify_owner();

-- 트리거: status='accepted' 로 UPDATE 시 → crew_members INSERT + 요청자에게 알림
create or replace function crew_join_request_on_accept()
returns trigger as $$
declare
  v_crew_name text;
begin
  if old.status = new.status then return new; end if;
  if new.status = 'accepted' then
    -- 멤버 추가 (이미 있으면 무시)
    insert into crew_members(crew_id, user_id, role)
    values (new.crew_id, new.user_id, 'member')
    on conflict (crew_id, user_id) do nothing;

    select name into v_crew_name from crews where id = new.crew_id;
    insert into notifications(user_id, type, title, body, link)
    values (
      new.user_id,
      'crew_join_accepted',
      '가입 승인',
      v_crew_name || ' 가입이 승인됐어요.',
      '/crew/' || new.crew_id::text
    );
  elsif new.status = 'rejected' then
    select name into v_crew_name from crews where id = new.crew_id;
    insert into notifications(user_id, type, title, body, link)
    values (
      new.user_id,
      'crew_join_rejected',
      '가입 거절',
      v_crew_name || ' 가입 요청이 거절됐어요.',
      null
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_crew_join_request_on_decide
  after update of status on crew_join_requests
  for each row execute function crew_join_request_on_accept();
