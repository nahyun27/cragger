-- 팔로워 기능 활성화 + 프로필 비공개 토글.
-- follows 테이블은 v1.0 schema 에서 이미 생성됨 (+ RLS: select all / insert self / delete self).

-- 1) 프로필 비공개 토글 — 디폴트 공개
alter table profiles
  add column if not exists is_private boolean not null default false;

-- 2) 검색용 인덱스 (lower username/display_name LIKE 가속)
create index if not exists idx_profiles_username_lower
  on profiles (lower(username));
create index if not exists idx_profiles_display_name_lower
  on profiles (lower(display_name));

-- 3) follows INSERT → followee 에게 알림
create or replace function follows_notify_followee()
returns trigger as $$
declare
  v_follower_name text;
begin
  select coalesce(p.display_name, p.username) into v_follower_name
    from profiles p where p.id = new.follower_id;

  insert into notifications(user_id, type, title, body, link)
  values (
    new.followee_id,
    'follow',
    '새 팔로워',
    coalesce(v_follower_name, '누군가') || ' 님이 팔로우했어요.',
    '/u/' || new.follower_id::text
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_follows_notify_followee on follows;
create trigger trg_follows_notify_followee
  after insert on follows
  for each row execute function follows_notify_followee();
