-- 피크닉클라이밍 신규 등록.
-- 경기 수원시 팔달구 효원로 278 (수인분당선 수원시청역 1번 출구 15m).

insert into gyms (name, branch, city, district, address, phone, instagram_handle, has_boulder)
values (
  '피크닉클라이밍',
  null,
  '경기',
  '수원시',
  '경기 수원시 팔달구 효원로 278 지하1층 101호',
  '0507-1313-6839',
  'picnic_climbing',
  true
)
on conflict (name, branch) do nothing;
