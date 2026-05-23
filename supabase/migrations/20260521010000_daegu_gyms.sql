-- Daegu (+ adjacent 경북) bouldering gyms — user-provided list
-- (Challenge N Climbing CREW map + 31-name supplemental list).
--
-- Schema only requires (name, city). District/address are populated
-- where the map gave us a full street address; the rest are name-only
-- stubs that can be filled in via gym_requests later.
--
-- ON CONFLICT (name, branch) DO NOTHING — re-runnable, won't disturb
-- existing rows.

insert into gyms (name, branch, city, district, address, has_kilter) values
  -- Located on the map (full address) ─────────────────────────
  ('볼더라운지', '플립',         '대구', '서구',   '대구 서구 달성공원로 9-2',                       false),
  ('뉴비클라이밍', '경북대점',   '대구', '동구',   '대구 동구 경대로 48 3층',                         false),
  ('초크업 더 볼더', NULL,       '대구', '달서구', '대구 달서구 이곡공원로 24 6층',                   false),
  ('동성로클라이밍짐', NULL,     '대구', '중구',   '대구 중구 동성로 10-1 4층',                       false),
  ('노루클라이밍', '진천점',     '대구', '달서구', '대구 달서구 진천로23길 58',                       false),
  ('손세동클라이밍', '두류점',   '대구', '달서구', '대구 달서구 달구벌대로 1770 208~210호',           false),
  ('뉴비클라이밍', '수성점',     '대구', '수성구', '대구 수성구 수성로 146 1층',                      false),
  ('노루클라이밍', '영남대점',   '경북', '경산시', '경북 경산시 청운로 24 1층',                       false),
  ('DSR 클라이밍짐', NULL,       '대구', NULL,     NULL,                                              false),

  -- Name-only stubs (city/district guessed from name where possible) ─
  ('광장클라이밍센터', NULL,            '대구', NULL,     NULL, false),
  ('다이노캣 클라이밍짐', NULL,         '대구', NULL,     NULL, false),
  ('대구 다사 클라이밍 짐', NULL,       '대구', '달성군', NULL, false),
  ('대구 나이너 클럽 클라이밍 센터', NULL, '대구', NULL,  NULL, false),
  ('대구 드림 스포츠클라이밍 센터', NULL,  '대구', NULL,  NULL, false),
  ('대구 락 클라이밍 센터', NULL,       '대구', NULL,     NULL, false),
  ('대구 연경 도약대', NULL,            '대구', '북구',   NULL, false),
  ('대구 챌린져클라이밍 센터', NULL,    '대구', NULL,     NULL, false),
  ('대구체육공원암벽등반장', NULL,      '대구', NULL,     NULL, false),
  ('대구파워클라이밍센터', NULL,        '대구', NULL,     NULL, false),
  ('대구팔공산 동화캠핑장 인공암벽장', NULL, '대구', '동구', NULL, false),
  ('대구 펀앤펀 클라이밍 센터', NULL,   '대구', NULL,     NULL, false),
  ('델타클라이밍', NULL,                '대구', NULL,     NULL, false),
  ('락매니아클라이밍짐', NULL,          '대구', NULL,     NULL, false),
  ('락토피아클라이밍짐', NULL,          '대구', NULL,     NULL, false),
  ('몬스터클라이밍짐', NULL,            '대구', NULL,     NULL, false),
  ('벽클라이밍스쿨', NULL,              '대구', NULL,     NULL, false),
  ('붐 클라이밍짐', NULL,               '대구', NULL,     NULL, false),
  ('손세동클라이밍', '칠곡점',          '대구', '북구',   NULL, false),
  ('손세동클라이밍', '침산점',          '대구', '북구',   NULL, false),
  ('위드클라이밍센터', NULL,            '대구', NULL,     NULL, false),
  ('점프클라이밍짐', NULL,              '대구', NULL,     NULL, false),
  ('칠곡 클라이밍 센터', NULL,          '대구', '북구',   NULL, false),
  ('킹콩클라이밍', '대구점',            '대구', NULL,     NULL, false),
  ('핸즈 클라이밍짐', NULL,             '대구', NULL,     NULL, false),
  ('GO클라이밍센터', NULL,              '대구', NULL,     NULL, false),
  ('LK 클라이밍', NULL,                 '대구', NULL,     NULL, false),
  ('M 클라이밍짐', '남대구점',          '대구', '남구',   NULL, false),
  ('M 클라이밍짐', '성서점',            '대구', '달서구', NULL, false),
  ('M 클라이밍짐', '이곡점',            '대구', '달서구', NULL, false)
on conflict (name, branch) do nothing;
