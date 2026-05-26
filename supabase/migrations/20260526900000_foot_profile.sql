-- 내 발 프로필 — 암벽화 추천/사이징을 위한 발 형태 데이터.
-- 모두 nullable — 사용자가 점진적으로 채울 수 있음.

alter table profiles
  add column foot_length_mm  int,
  add column shoe_size_mm    int,
  add column foot_shape      text,   -- 'egyptian' | 'greek' | 'roman' | 'square'
  add column foot_width      text,   -- 'narrow' | 'normal' | 'wide' | 'very_wide'
  add column instep_height   text,   -- 'low' | 'normal' | 'high'
  add column arch_type       text;   -- 'flat' | 'normal' | 'high'

-- 값 검증 — 잘못된 enum 값 들어오는 것 방지.
alter table profiles
  add constraint foot_shape_check check (
    foot_shape is null or foot_shape in ('egyptian', 'greek', 'roman', 'square')
  ),
  add constraint foot_width_check check (
    foot_width is null or foot_width in ('narrow', 'normal', 'wide', 'very_wide')
  ),
  add constraint instep_height_check check (
    instep_height is null or instep_height in ('low', 'normal', 'high')
  ),
  add constraint arch_type_check check (
    arch_type is null or arch_type in ('flat', 'normal', 'high')
  ),
  add constraint foot_length_range check (
    foot_length_mm is null or (foot_length_mm between 150 and 350)
  ),
  add constraint shoe_size_range check (
    shoe_size_mm is null or (shoe_size_mm between 150 and 350)
  );
