-- 크루 공지 + 인앱 알림.
-- 공지 INSERT 시 크루 멤버 전원에게 notifications 자동 생성 (작성자 제외).

create table crew_announcements (
  id          uuid primary key default gen_random_uuid(),
  crew_id     uuid not null references crews(id) on delete cascade,
  author_id   uuid not null references profiles(id) on delete cascade,
  title       text not null,
  body        text not null,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index idx_crew_announcements_crew on crew_announcements(crew_id, created_at desc);

-- 인앱 알림 — 범용 (type 으로 확장 여지)
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  type        text not null,    -- 'crew_announcement' 등
  title       text not null,
  body        text,
  link        text,             -- 예: '/crew/<id>'
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index idx_notifications_user_unread
  on notifications(user_id, created_at desc)
  where read_at is null;
create index idx_notifications_user_all
  on notifications(user_id, created_at desc);

alter table crew_announcements enable row level security;
alter table notifications enable row level security;

-- 공지 조회: 크루 멤버만
create policy ca_select_member on crew_announcements for select using (
  exists (
    select 1 from crew_members
    where crew_members.crew_id = crew_announcements.crew_id
      and crew_members.user_id = auth.uid()
  )
);
-- 공지 작성: 크루 멤버 (본인 author_id)
create policy ca_insert_member on crew_announcements for insert with check (
  auth.uid() = author_id and exists (
    select 1 from crew_members
    where crew_members.crew_id = crew_announcements.crew_id
      and crew_members.user_id = auth.uid()
  )
);
-- 공지 수정/삭제: 작성자
create policy ca_update_author on crew_announcements for update using (author_id = auth.uid());
create policy ca_delete_author on crew_announcements for delete using (author_id = auth.uid());

-- 알림 조회/수정/삭제: 본인만. INSERT 는 트리거(security definer)만.
create policy notif_select_self on notifications for select using (user_id = auth.uid());
create policy notif_update_self on notifications for update using (user_id = auth.uid());
create policy notif_delete_self on notifications for delete using (user_id = auth.uid());

-- 공지 fanout 트리거 — 멤버 전원에게 알림 (작성자 제외)
create or replace function fanout_crew_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  crew_name text;
begin
  select name into crew_name from crews where id = new.crew_id;
  insert into notifications (user_id, type, title, body, link)
  select cm.user_id,
         'crew_announcement',
         '[' || coalesce(crew_name, '크루') || '] ' || new.title,
         left(new.body, 80),
         '/crew/' || new.crew_id
  from crew_members cm
  where cm.crew_id = new.crew_id
    and cm.user_id <> new.author_id;
  return null;
end;
$$;

create trigger trg_crew_announcement_fanout
  after insert on crew_announcements
  for each row execute function fanout_crew_announcement();
