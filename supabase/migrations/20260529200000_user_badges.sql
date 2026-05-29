-- 뱃지 정의는 코드 상수, 획득 기록만 저장.

create table user_badges (
  user_id    uuid not null references profiles(id) on delete cascade,
  badge_key  text not null,
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_key)
);
create index idx_user_badges_user on user_badges(user_id, earned_at desc);

alter table user_badges enable row level security;

-- 남의 뱃지도 프로필에서 노출되어야 하므로 select all.
create policy ub_select_all on user_badges for select using (true);
-- 본인만 본인 뱃지 INSERT (클라이언트 판정 후 INSERT).
create policy ub_insert_self on user_badges for insert with check (auth.uid() = user_id);
