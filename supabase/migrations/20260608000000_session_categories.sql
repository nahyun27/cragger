-- 세션 / 계획 카테고리 — 그 날의 운동 성격 (개별 시도의 climbing_type 과는 별개).
-- boulder/lead/board 는 실제 등반, endurance/strength 는 컨디셔닝성 훈련.
-- NULL 허용 — 사용자가 지정 안 하면 attempts 기반으로 클라이언트에서 추론 가능.

create type session_category as enum (
  'boulder',     -- 볼더 위주
  'lead',        -- 리드 위주
  'board',       -- 보드(문/킬터/텐션) 위주
  'endurance',   -- 지구력 (서킷, 봉/링 등)
  'strength'     -- 근력 (캠퍼스, 행보드, 웨이트)
);

alter table sessions
  add column if not exists category session_category;

alter table session_plans
  add column if not exists category session_category;

-- 인덱스 — "이번 달 지구력 X번" 같은 통계 쿼리용
create index if not exists sessions_category_idx on sessions (user_id, category)
  where category is not null;
