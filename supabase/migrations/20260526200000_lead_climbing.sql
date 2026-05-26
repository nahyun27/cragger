-- 리드 클라이밍 기록 지원.
-- 1) attempt_result 에 'redpoint' 추가 (onsight/flash 는 이미 있음)
-- 2) problems.color NOT NULL → nullable (리드는 색깔 없음)
-- 3) problems.route_grade 컬럼 추가 (5.10a, 5.11b 등)
--
-- 기존 볼더링 데이터 영향: 없음.
--   - 색깔 컬럼은 그대로 채워져 있고 nullable 로 바뀌어도 기존 값 유지.
--   - send/project/fall 그대로 사용 가능.

-- enum 확장
alter type attempt_result add value if not exists 'redpoint';

-- color nullable
alter table problems alter column color drop not null;

-- route_grade (Yosemite Decimal 5.6~5.15d)
alter table problems add column if not exists route_grade text;

-- 인덱스: 리드 등급 조회용 (옵셔널)
create index if not exists idx_problems_gym_route_grade
  on problems(gym_id, route_grade)
  where route_grade is not null;
