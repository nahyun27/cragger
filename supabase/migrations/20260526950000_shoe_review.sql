-- 암벽화 후기 풀 스펙 — 소유 상태/핏 인식/성능 9개 평점 등.
-- 기존 status (active/resole_pending/retired) 는 신발 수명 단계라 유지.
-- 새 ownership_status 는 "처분 의도" 라 별개 차원.

alter table climbing_shoes
  add column ownership_status   text,           -- 현재 보유/사이즈 미스/족형 안맞음
  add column wanted_fit         text,           -- performance | comfort
  add column fit_perception     text,           -- 핏 인식 5단계
  add column stiffness          text,           -- 부드러움 5단계
  add column stretch            text,           -- 늘어남 5단계
  add column usages             text[] not null default '{}',  -- 자연 볼더링 등
  add column fit_features       text[] not null default '{}',  -- 발볼 등
  add column is_primary         boolean not null default false,
  add column rating_overall     int,
  add column rating_edging      int,
  add column rating_smearing    int,
  add column rating_toehook     int,
  add column rating_heelhook    int,
  add column rating_sensitivity int,
  add column rating_comfort     int,
  add column rating_durability  int,
  add column rating_value       int,
  add column rating_design      int;

-- Enum 검증
alter table climbing_shoes
  add constraint cs_ownership_status_check check (
    ownership_status is null or ownership_status in ('owned', 'resale_size', 'resale_fit')
  ),
  add constraint cs_wanted_fit_check check (
    wanted_fit is null or wanted_fit in ('performance', 'comfort')
  ),
  add constraint cs_fit_perception_check check (
    fit_perception is null or fit_perception in (
      'much_smaller', 'slightly_smaller', 'perfect', 'slightly_larger', 'much_larger'
    )
  ),
  add constraint cs_stiffness_check check (
    stiffness is null or stiffness in ('very_soft', 'soft', 'normal', 'stiff', 'very_stiff')
  ),
  add constraint cs_stretch_check check (
    stretch is null or stretch in ('none', 'little', 'normal', 'much', 'very_much')
  );

-- 평점 0~10 범위
alter table climbing_shoes
  add constraint cs_rating_overall_range     check (rating_overall     is null or (rating_overall     between 0 and 10)),
  add constraint cs_rating_edging_range      check (rating_edging      is null or (rating_edging      between 0 and 10)),
  add constraint cs_rating_smearing_range    check (rating_smearing    is null or (rating_smearing    between 0 and 10)),
  add constraint cs_rating_toehook_range     check (rating_toehook     is null or (rating_toehook     between 0 and 10)),
  add constraint cs_rating_heelhook_range    check (rating_heelhook    is null or (rating_heelhook    between 0 and 10)),
  add constraint cs_rating_sensitivity_range check (rating_sensitivity is null or (rating_sensitivity between 0 and 10)),
  add constraint cs_rating_comfort_range     check (rating_comfort     is null or (rating_comfort     between 0 and 10)),
  add constraint cs_rating_durability_range  check (rating_durability  is null or (rating_durability  between 0 and 10)),
  add constraint cs_rating_value_range       check (rating_value       is null or (rating_value       between 0 and 10)),
  add constraint cs_rating_design_range      check (rating_design      is null or (rating_design      between 0 and 10));

-- 사용자당 주력 신발 1켤레 제약 — partial unique index.
create unique index idx_shoes_one_primary
  on climbing_shoes(user_id)
  where is_primary;
