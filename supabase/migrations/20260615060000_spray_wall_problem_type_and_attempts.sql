-- 050000 이후 추가: 문제 종류 컬럼
alter table spray_wall_problems
  add column if not exists problem_type text not null default 'boulder'
  check (problem_type in ('boulder', 'endurance'));

-- 세션 시도에서 스프레이월 문제 연결 (선택적)
alter table attempts
  add column if not exists spray_wall_problem_id uuid
  references spray_wall_problems(id) on delete set null;
