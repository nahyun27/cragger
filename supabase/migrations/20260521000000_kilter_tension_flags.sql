-- User-provided list of gyms with Kilter Board (+ 슈퍼비클라이밍 also has Tension).
--
-- 14 of the listed gyms already exist in gyms() — these UPDATE only.
-- The rest don't exist in our DB yet. For those we INSERT a minimal row
-- (name + branch + a coarse city) with has_kilter=true. ON CONFLICT keys
-- to (name, branch) so a future-correct row will just flip the flag
-- instead of duplicating. Addresses / district / pyeong / opened_at can
-- be filled in later via gym_requests.
--
-- The migration is idempotent — re-running just refreshes the flags.

-- ── UPDATE: already in DB ──────────────────────────────────────
update gyms set has_kilter = true
 where (name, branch) in (
   ('더클라임',                       '양재점'),
   ('더클라임',                       '이수점'),
   ('락스타 클라이밍',                NULL),
   ('코알라 클라이밍',                '킨텍스'),
   ('클라이밍 업더월 일산',           NULL),
   ('클라임바운스',                   '수원점'),
   ('킨디클라이밍',                   NULL),
   ('디스커버리클라이밍 클라임스퀘어','ICN'),
   ('웨이브락 클라이밍',              '광안점')
 );

-- 슈퍼비클라이밍: 킬터 + 텐션 둘 다
update gyms set has_kilter = true, has_tension = true
 where name = '슈퍼비클라이밍';

-- ── INSERT ... ON CONFLICT: missing rows (stub with name+city) ─
insert into gyms (name, branch, city, district, has_kilter) values
  -- 서울/경기
  ('닷클라이밍짐',           NULL,       '서울', NULL,     true),
  ('에어즈락 클라이밍',      '위례점',   '서울', '송파구', true),
  ('클라임어스',             '미사점',   '경기', '하남시', true),
  -- 부산/대구/울산/경상
  ('비스타클라이밍',         NULL,       '부산', NULL,     true),
  ('초크업 클라이밍',        '월성점',   '대구', NULL,     true),
  ('코아 클라이밍',          NULL,       '부산', NULL,     true),
  ('퍼스트클라이밍짐',       NULL,       '부산', NULL,     true),
  -- 대전/충청
  ('청주국제스포츠클라이밍센터', NULL,   '충북', '청주시', true),
  ('클라이밍짐리드',         '충대점',   '대전', NULL,     true),
  -- 광주/전라
  ('클라이븐',               NULL,       '광주', NULL,     true),
  ('핸드워크 클라이밍',      '양산점',   '경남', '양산시', true),
  -- 강원
  ('원더스카이',             NULL,       '강원', NULL,     true),
  -- 제주
  ('오르멍',                 NULL,       '제주', NULL,     true)
on conflict (name, branch) do update set has_kilter = excluded.has_kilter;
