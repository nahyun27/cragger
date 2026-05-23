-- 모임 기능 1단계
-- posts 의 post_type='meetup' + meetup_at + meetup_capacity 는 이미 있음.
-- 여기서는 참가자 테이블과 보조 필드 추가.

-- (1) 참가자 테이블 — 2단계에서 채움
create table meetup_participants (
  post_id    uuid not null references posts(id)    on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  status     text not null default 'joined',  -- joined / cancelled
  joined_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- 활성 참가자만 빠르게 카운트
create index idx_meetup_participants_post
  on meetup_participants(post_id)
  where status = 'joined';

-- (2) posts 보조 필드
alter table posts add column if not exists meetup_location   text;
alter table posts add column if not exists participant_count int not null default 0;

-- (3) RLS
alter table meetup_participants enable row level security;

create policy mp_select_all on meetup_participants
  for select using (true);

create policy mp_insert_self on meetup_participants
  for insert with check (auth.uid() = user_id);

create policy mp_update_self on meetup_participants
  for update using (auth.uid() = user_id);

create policy mp_delete_self on meetup_participants
  for delete using (auth.uid() = user_id);
