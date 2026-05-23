-- Nationwide MoonBoard gyms (출처: climberstory.tistory.com/4 / 감자의 클라이밍 스토리)
--
-- Same pattern as the kilter migration: INSERT ... ON CONFLICT (name, branch)
-- DO UPDATE SET has_moonboard = true. Existing rows get the flag flipped;
-- gyms not yet in the DB are inserted as minimal stubs (name + branch + city
-- + sometimes district) so they show up in the filter.
--
-- Name/branch values below were chosen to match the DB's existing rows where
-- possible (space + 'XX점' branch convention), so the ON CONFLICT path
-- triggers an UPDATE instead of a duplicate INSERT.

insert into gyms (name, branch, city, district, has_moonboard) values
  -- ── 서울/경기 ─────────────────────────────────────────────
  ('교하스포츠클라이밍짐',       NULL,       '경기', '파주시', true),
  ('더클라이밍짐',               NULL,       '서울', NULL,     true),
  ('더플라스틱클라이밍',         '염창점',   '서울', '강서구', true),
  ('두드림클라이밍센터',         NULL,       '서울', NULL,     true),
  ('디스커버리클라이밍 클라임스퀘어', 'ICN',  '인천', '서구',   true),
  ('락트리 클라이밍',            '분당',     '경기', '성남시', true),
  ('락페이스클라이밍',           NULL,       '경기', NULL,     true),
  ('볼더가든 클라이밍',          NULL,       '경기', NULL,     true),
  ('볼더팝',                     NULL,       '서울', NULL,     true),
  ('산본클라이밍센터',           NULL,       '경기', '군포시', true),
  ('산타클라이밍',               NULL,       '서울', NULL,     true),
  ('서수원클라이밍센터',         NULL,       '경기', '수원시', true),
  ('서울숲클라이밍',             '종로점',   '서울', '종로구', true),
  ('써니사이드 클라이밍',        NULL,       '서울', NULL,     true),
  ('안산베이스캠프클라이밍',     NULL,       '경기', '안산시', true),
  ('온플릭 클라이밍짐',          '삼성점',   '서울', '강남구', true),
  ('온플릭 클라이밍짐',          '천호점',   '서울', '강동구', true),
  ('용마폭포공원',               NULL,       '서울', '광진구', true),
  ('을지로 담장',                NULL,       '서울', '중구',   true),
  ('인클라이밍센터',             NULL,       '서울', NULL,     true),
  ('코알라클라이밍',             '상암',     '서울', '마포구', true),
  ('코알라클라이밍',             '킨텍스점', '고양', '일산서구', true),
  ('클라이밍줌',                 NULL,       '인천', NULL,     true),
  ('클라이밍파크',               '성수점',   '서울', '성동구', true),
  ('클라임어클락',               NULL,       '경기', NULL,     true),
  ('클라임크루',                 NULL,       '경기', NULL,     true),
  ('클라임투더문 클라이밍',      NULL,       '서울', NULL,     true),
  ('킨디클라이밍',               NULL,       '경기', '권선구', true),
  ('킹콩클라이밍',               NULL,       '경기', '수원시', true),
  ('파주클라이밍',               NULL,       '경기', '파주시', true),
  ('플래시볼더스',               NULL,       '서울', NULL,     true),
  ('훅클라이밍',                 '왕십리점', '서울', '성동구', true),

  -- ── 부산/대구/울산/경상 ──────────────────────────────────
  ('광클라이밍',                 NULL,       '부산', NULL,     true),
  ('다이노캣 클라이밍짐',        NULL,       '대구', NULL,     true),
  ('돌멩이 클라이밍',            NULL,       '부산', NULL,     true),
  ('리버스락',                   NULL,       '부산', NULL,     true),
  ('몽클라이밍센터',             NULL,       '부산', NULL,     true),
  ('코아 클라이밍',              NULL,       '부산', NULL,     true),
  ('퍼스트클라이밍짐',           NULL,       '부산', NULL,     true),
  ('OTTERCLIMBING',              NULL,       '부산', NULL,     true),
  ('SO 클라이밍짐',              NULL,       '부산', NULL,     true),

  -- ── 대전/충청 ────────────────────────────────────────────
  ('고릴라클라이밍',             NULL,       '충남', '서산시', true),
  ('서산클라이밍',               NULL,       '충남', '서산시', true),
  ('어웨이크 클라이밍',          '타임월드점','대전', '서구',  true),
  ('청주오르다클라이밍센터',     NULL,       '충북', '청주시', true),
  ('클라이밍짐리드',             '유성점',   '대전', '유성구', true),
  ('클라이밍짐리드',             '충대점',   '대전', NULL,     true),
  ('하나클라이밍짐',             NULL,       '대전', '유성구', true),

  -- ── 광주/전라 ────────────────────────────────────────────
  ('군산스포츠클라이밍센터',     NULL,       '전북', '군산시', true),
  ('지락펀락 클라이밍 센터',     NULL,       '전북', '익산시', true),
  ('클라이븐',                   NULL,       '광주', NULL,     true),
  ('클라임라운지',               NULL,       '광주', NULL,     true),
  ('핸드워크 클라이밍',          '봉선점',   '광주', '남구',   true),

  -- ── 강원 ─────────────────────────────────────────────────
  ('클라임투게더',               '원주점',   '강원', '원주시', true),
  ('클리프스테이',               NULL,       '강원', NULL,     true)
on conflict (name, branch) do update
  set has_moonboard = excluded.has_moonboard;
