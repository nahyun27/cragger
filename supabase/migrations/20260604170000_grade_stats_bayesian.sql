-- 공식 그레이드를 prior 로 한 Bayesian 가중 평균.
--
-- 의도:
--   - 투표가 적을 때 (n 작음) → 공식이 앵커
--   - 투표가 쌓이면 (n 큼) → 커뮤니티가 평균을 지배
--
-- 공식:
--   avg = (k * prior + Σvotes) / (k + n)
--   prior = official_label_to_v(official_label)
--   k = 10  (공식 1개의 영향력 ≈ 투표 10표)
--
-- 공식 없거나 파싱 불가 → 순수 산술 평균 (기존 동작).

-- ── 1) official_label → V numeric 파서 ─────────────────────
-- 처리 케이스:
--   'V3', 'V4'           → 3, 4
--   'V3+', 'V3-'         → 3.5, 2.5
--   'V3-V4', 'V3~V4'     → 중간값 3.5
--   기타 (색이름, 급수, null) → null  (prior 미적용)

create or replace function official_label_to_v(label text)
returns numeric language sql immutable as $$
  with t as (select coalesce(upper(trim(label)), '') as s)
  select case
    -- 'V3-V4' 또는 'V3~V4' 범위 → 중간값
    when (select s from t) ~ '^V\d+\s*[-~]\s*V\d+$' then
      (
        (regexp_replace((select s from t), '^V(\d+).*$', '\1'))::numeric
        + (regexp_replace((select s from t), '^.*V(\d+)$', '\1'))::numeric
      ) / 2
    -- 'V3', 'V3+', 'V3-' 단일
    when (select s from t) ~ '^V\d+[+-]?$' then
      (regexp_replace((select s from t), '^V(\d+)[+-]?$', '\1'))::numeric
      + case
          when (select s from t) like '%+' then 0.5
          when (select s from t) like '%-' then -0.5
          else 0
        end
    else null
  end;
$$;

-- ── 2) gym_color_grade_stats — Bayesian 적용 ─────────────────
drop view if exists gym_color_grade_stats;

create or replace view gym_color_grade_stats as
with vote_agg as (
  select
    gym_id,
    color,
    count(*)                                              as vote_count,
    sum(v_grade_to_num(grade))                            as sum_v,
    percentile_cont(0.5) within group (order by v_grade_to_num(grade)) as median_v
  from grade_votes
  where v_grade_to_num(grade) is not null
  group by gym_id, color
),
combined as (
  select
    cs.gym_id,
    cs.color,
    coalesce(va.vote_count, 0)                            as vote_count,
    coalesce(va.sum_v, 0)                                 as sum_v,
    va.median_v                                            as median_v,
    official_label_to_v(cs.official_label)                as prior_v
  from gym_color_schemes cs
  left join vote_agg va on va.gym_id = cs.gym_id and va.color = cs.color
)
select
  gym_id,
  color,
  vote_count,
  median_v                                                 as median_v_grade,
  -- prior 있고 투표 1개라도 있으면 Bayesian, prior 없으면 순수 평균, 둘 다 없으면 prior 만, 다 없으면 NULL
  case
    when prior_v is not null and vote_count > 0 then
      round((10::numeric * prior_v + sum_v) / (10 + vote_count), 1)
    when prior_v is not null and vote_count = 0 then
      round(prior_v, 1)
    when vote_count > 0 then
      round(sum_v / vote_count, 1)
    else null
  end                                                      as avg_v_grade,
  num_to_v_grade(
    case
      when prior_v is not null and vote_count > 0 then
        round((10::numeric * prior_v + sum_v) / (10 + vote_count), 1)
      when prior_v is not null and vote_count = 0 then
        round(prior_v, 1)
      when vote_count > 0 then
        round(sum_v / vote_count, 1)
      else null
    end
  )                                                        as avg_v_grade_label
from combined
where vote_count > 0 or prior_v is not null;
