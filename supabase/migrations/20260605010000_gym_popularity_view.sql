-- 암장별 인기 지표 (즐겨찾기 수) — 공개 view.
-- gym_favorites 는 RLS 로 본인 것만 SELECT 가능 → 공개 집계는 view + security_invoker=false 로 우회.
-- 정렬용으로만 쓰이고 개별 사용자 정보는 안 노출.

create or replace view gym_popularity
with (security_invoker = false) as
select
  g.id as gym_id,
  coalesce(count(f.user_id), 0)::int as favorite_count
from gyms g
left join gym_favorites f on f.gym_id = g.id
group by g.id;

grant select on gym_popularity to authenticated, anon;
