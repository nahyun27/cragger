-- profile 에 몸무게 + 공개 여부 토글 추가.
-- weight_kg: 30~300 범위 체크
-- weight_visible: 친구 기능 대비. true 면 본인 마이페이지/공유 카드에 표시.
alter table profiles
  add column weight_kg int check (weight_kg is null or (weight_kg between 30 and 300)),
  add column weight_visible boolean not null default true;
