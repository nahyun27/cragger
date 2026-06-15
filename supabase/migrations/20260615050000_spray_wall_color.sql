-- 스프레이월 문제에 색깔(난이도)과 문제 종류 컬럼 추가
alter table spray_wall_problems add column if not exists color text;
alter table spray_wall_problems add column if not exists problem_type text not null default 'boulder' check (problem_type in ('boulder', 'endurance'));
