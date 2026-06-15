-- 보드 / 지구력 세션 지원.
-- 종목별 부가 정보 — boulder/lead 는 기존 attempts 만으로 충분, board/endurance 는 부가 enum 필요.

-- 1) 지구력 스타일 enum
create type endurance_style as enum (
  'spraywall',     -- 스프레이월
  'overhang',      -- 오버행
  'vertical'       -- 직벽
);

-- 2) sessions 에 부가 컬럼
alter table sessions
  add column if not exists board_type      board_type        null,    -- moonboard/kilter/tension
  add column if not exists endurance_style endurance_style   null;

-- 3) 사용자 임의 보드 문제 기록을 위해 angle NULL 허용
alter table board_problems
  alter column angle drop not null;
