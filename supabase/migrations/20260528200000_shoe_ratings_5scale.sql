-- 암벽화 평점 10점 만점 → 5점 만점.
-- 기존 데이터는 절반으로 축소 후 반올림 (10→5, 9→5, 8→4, ...).

-- 1) 기존 check constraint 제거
alter table climbing_shoes
  drop constraint if exists cs_rating_overall_range,
  drop constraint if exists cs_rating_edging_range,
  drop constraint if exists cs_rating_smearing_range,
  drop constraint if exists cs_rating_toehook_range,
  drop constraint if exists cs_rating_heelhook_range,
  drop constraint if exists cs_rating_sensitivity_range,
  drop constraint if exists cs_rating_comfort_range,
  drop constraint if exists cs_rating_durability_range,
  drop constraint if exists cs_rating_value_range,
  drop constraint if exists cs_rating_design_range;

-- 2) 기존 값 축소 (round(v / 2.0))
update climbing_shoes set
  rating_overall     = case when rating_overall     is null then null else round(rating_overall::numeric     / 2)::int end,
  rating_edging      = case when rating_edging      is null then null else round(rating_edging::numeric      / 2)::int end,
  rating_smearing    = case when rating_smearing    is null then null else round(rating_smearing::numeric    / 2)::int end,
  rating_toehook     = case when rating_toehook     is null then null else round(rating_toehook::numeric     / 2)::int end,
  rating_heelhook    = case when rating_heelhook    is null then null else round(rating_heelhook::numeric    / 2)::int end,
  rating_sensitivity = case when rating_sensitivity is null then null else round(rating_sensitivity::numeric / 2)::int end,
  rating_comfort     = case when rating_comfort     is null then null else round(rating_comfort::numeric     / 2)::int end,
  rating_durability  = case when rating_durability  is null then null else round(rating_durability::numeric  / 2)::int end,
  rating_value       = case when rating_value       is null then null else round(rating_value::numeric       / 2)::int end,
  rating_design      = case when rating_design      is null then null else round(rating_design::numeric      / 2)::int end;

-- 3) 새 check constraint (0~5)
alter table climbing_shoes
  add constraint cs_rating_overall_range     check (rating_overall     is null or (rating_overall     between 0 and 5)),
  add constraint cs_rating_edging_range      check (rating_edging      is null or (rating_edging      between 0 and 5)),
  add constraint cs_rating_smearing_range    check (rating_smearing    is null or (rating_smearing    between 0 and 5)),
  add constraint cs_rating_toehook_range     check (rating_toehook     is null or (rating_toehook     between 0 and 5)),
  add constraint cs_rating_heelhook_range    check (rating_heelhook    is null or (rating_heelhook    between 0 and 5)),
  add constraint cs_rating_sensitivity_range check (rating_sensitivity is null or (rating_sensitivity between 0 and 5)),
  add constraint cs_rating_comfort_range     check (rating_comfort     is null or (rating_comfort     between 0 and 5)),
  add constraint cs_rating_durability_range  check (rating_durability  is null or (rating_durability  between 0 and 5)),
  add constraint cs_rating_value_range       check (rating_value       is null or (rating_value       between 0 and 5)),
  add constraint cs_rating_design_range      check (rating_design      is null or (rating_design      between 0 and 5));
