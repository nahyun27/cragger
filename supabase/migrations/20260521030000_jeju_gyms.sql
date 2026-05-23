-- Jeju climbing gyms — user-provided list (Naver search + supplemental list)
--
-- 픽스볼더 연동점 / 아라점은 bulk_gym_import에 이미 있어서 제외.
-- 에이스클라이밍센터(서울 구로) 동명 row가 있어 branch로 구분.
-- ON CONFLICT (name, branch) DO NOTHING — 멱등.

insert into gyms (name, branch, city, district, address, phone, has_kilter) values
  -- Located on the screenshot (district + phone where given) ──────
  ('에이스클라이밍센터',           '제주오라점',  '제주', '제주시',  '제주 제주시 오라동',     '0507-1475-0044', false),
  ('한림스포츠클라이밍경기장',     NULL,          '제주', '제주시',  '제주 제주시 한림읍',     NULL,             false),
  ('스포츠클라이밍아카데미',       NULL,          '제주', '제주시',  '제주 제주시 이도이동',   '064-723-5014',   false),
  ('제주클라이밍스쿨',             NULL,          '제주', '제주시',  '제주 제주시 삼도동',     NULL,             false),

  -- Name-only stubs ────────────────────────────────────────────────
  ('더 패스 클라이밍짐',           NULL,          '제주', NULL,      NULL,                     NULL,             false),
  ('제주 무브존',                  NULL,          '제주', NULL,      NULL,                     NULL,             false),
  ('제주에이스클라이밍클럽',       NULL,          '제주', NULL,      NULL,                     NULL,             false),
  ('제주종합경기장 인공암벽장',    NULL,          '제주', '제주시',  NULL,                     NULL,             false),
  ('표선산악회 인공암장',          NULL,          '제주', '서귀포시',NULL,                     NULL,             false)
on conflict (name, branch) do nothing;
