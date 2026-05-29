-- 크루 공개 모집 기능.
-- is_recruiting = true 이면 크루 목록(/crews/explore) + 커뮤니티 상단 가로 스크롤에 노출.
-- 가입은 기존 crew_join_requests 흐름 그대로 (코드 없이 crewId 직접 지정).

alter table crews
  add column if not exists is_recruiting boolean not null default false;

-- 공개 모집 크루 빠른 조회 (created_at desc, 최신 우선)
create index if not exists idx_crews_recruiting
  on crews(is_recruiting, created_at desc)
  where is_recruiting = true;
