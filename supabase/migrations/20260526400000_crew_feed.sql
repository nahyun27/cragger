-- 크루 2단계: 크루 전용 피드.
-- posts.crew_id 추가 (NULL=전체공개, 값=크루 전용).
-- RLS: 크루 글은 그 크루 멤버만 조회.

alter table posts
  add column if not exists crew_id uuid references crews(id) on delete cascade;

create index if not exists idx_posts_crew
  on posts(crew_id, created_at desc)
  where crew_id is not null;

-- 기존 posts_select_all 정책을 크루 인식 버전으로 교체.
drop policy if exists posts_select_all on posts;
drop policy if exists posts_select_visible on posts;

create policy posts_select_visible on posts for select using (
  crew_id is null
  or exists (
    select 1 from crew_members
    where crew_members.crew_id = posts.crew_id
      and crew_members.user_id = auth.uid()
  )
);
