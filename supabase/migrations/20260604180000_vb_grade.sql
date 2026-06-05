-- VB (V-basic) 입문 등급 추가.
-- V0 보다 한 단계 아래 — 입문/키즈 코스가 있는 암장에서 사용.
--
-- 매핑:
--   'VB-' → -1.5
--   'VB'  → -1
--   'VB+' → -0.5
--   'V0'  →  0  (이후 기존과 동일)
--
-- 이전 정규식 ^V\d+[+-]?$ 는 숫자 그레이드만 받았음 → VB 패턴 추가.

-- ── 1) text → numeric ─────────────────────────────────────
create or replace function v_grade_to_num(grade text)
returns numeric language sql immutable as $$
  with t as (select coalesce(upper(trim(grade)), '') as s)
  select case
    -- VB / VB+ / VB-
    when (select s from t) ~ '^VB[+-]?$' then
      -1::numeric
      + case
          when (select s from t) like '%+' then 0.5
          when (select s from t) like '%-' then -0.5
          else 0
        end
    -- V0 ~ Vn (기존)
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

-- ── 2) numeric → text ─────────────────────────────────────
-- 0.5 단위 bin:
--   n < -1.0   → 'VB-'
--   -1.0 ≤ n < -0.5 → 'VB'
--   -0.5 ≤ n < 0    → 'VB+'
--   0 ≤ n < 0.5     → 'V0'
--   0.5 ≤ n < 1.0   → 'V0+'
--   1.0 ≤ n < 1.5   → 'V1' ...

create or replace function num_to_v_grade(n numeric)
returns text language sql immutable as $$
  select case
    when n is null then null
    when n < -1.0  then 'VB-'
    when n < -0.5  then 'VB'
    when n < 0     then 'VB+'
    else 'V' || floor(n)::int
      || case when (n - floor(n)) >= 0.5 then '+' else '' end
  end;
$$;

-- ── 3) official_label 파서도 VB 지원 ──────────────────────
create or replace function official_label_to_v(label text)
returns numeric language sql immutable as $$
  with t as (select coalesce(upper(trim(label)), '') as s)
  select case
    -- 'VB-V0' / 'VB~V0' 범위
    when (select s from t) ~ '^VB\s*[-~]\s*V\d+$' then
      ( -1::numeric
        + (regexp_replace((select s from t), '^.*V(\d+)$', '\1'))::numeric
      ) / 2
    -- 'V3-V4' / 'V3~V4' 범위
    when (select s from t) ~ '^V\d+\s*[-~]\s*V\d+$' then
      (
        (regexp_replace((select s from t), '^V(\d+).*$', '\1'))::numeric
        + (regexp_replace((select s from t), '^.*V(\d+)$', '\1'))::numeric
      ) / 2
    -- VB / VB+ / VB-
    when (select s from t) ~ '^VB[+-]?$' then
      -1::numeric
      + case
          when (select s from t) like '%+' then 0.5
          when (select s from t) like '%-' then -0.5
          else 0
        end
    -- V3 / V3+ / V3-
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
