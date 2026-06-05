-- 대결 생성 시 호스트가 색깔별로 점수를 직접 지정 → 송 1개에 그 점수가 합산된다.
--
-- color_grades: [{ "color": "yellow", "points": 5 }, { "color": "green", "points": 10 }, ...]
-- 순서 = 호스트가 정한 난이도 순서 (쉬운 것부터). 인라인 기록 그리드에 이 순서로 노출.

alter table battles
  add column if not exists color_grades jsonb not null default '[]'::jsonb;
