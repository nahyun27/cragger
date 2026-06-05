-- 프로필 공개/비공개 시맨틱 통일 — UI 의 canSeeContent 와 RLS 를 일치시킴.
--
-- 정책:
--   공개 계정 (is_private=false): 누구나 본인의 활동(통계, 뱃지, 신발) 조회 가능
--   비공개 계정 (is_private=true): 본인 + 팔로워(follows.follower_id=me)만 조회 가능
--
-- 적용 대상: climbing_shoes, user_badges, sessions, attempts
-- (crew_members 는 크루 단위 공개 정책이라 별개 — 여기선 안 건드림)

-- ── 1) 가시성 헬퍼 함수 ─────────────────────────────────────
create or replace function profile_is_visible_to_me(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = target
    or exists (
      select 1 from profiles p
      where p.id = target and coalesce(p.is_private, false) = false
    )
    or exists (
      select 1 from follows f
      where f.follower_id = auth.uid() and f.followee_id = target
    );
$$;

grant execute on function profile_is_visible_to_me(uuid) to authenticated, anon;

-- ── 2) climbing_shoes — 본인만 → 가시성 기준 ────────────────
drop policy if exists shoes_select_self on climbing_shoes;
create policy shoes_select_visible on climbing_shoes
  for select using (profile_is_visible_to_me(user_id));

-- ── 3) user_badges — 누구나 → 가시성 기준 ──────────────────
drop policy if exists ub_select_all on user_badges;
create policy ub_select_visible on user_badges
  for select using (profile_is_visible_to_me(user_id));

-- ── 4) sessions — 본인만 → 가시성 기준 ─────────────────────
drop policy if exists "sessions_select_self" on sessions;
create policy sessions_select_visible on sessions
  for select using (profile_is_visible_to_me(user_id));

-- ── 5) attempts — sessions 의 user_id 기준 ─────────────────
drop policy if exists "attempts_select_self" on attempts;
create policy attempts_select_visible on attempts
  for select using (
    exists (
      select 1 from sessions s
      where s.id = attempts.session_id
        and profile_is_visible_to_me(s.user_id)
    )
  );
