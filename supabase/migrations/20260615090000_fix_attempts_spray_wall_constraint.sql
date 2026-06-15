-- attempts.exactly_one_problem 제약에 spray_wall_problem_id 허용 추가
alter table attempts drop constraint exactly_one_problem;

alter table attempts add constraint exactly_one_problem check (
  (climbing_type = 'board'
    and board_problem_id is not null
    and problem_id is null
    and spray_wall_problem_id is null)
  or
  (climbing_type in ('boulder', 'lead')
    and problem_id is not null
    and board_problem_id is null
    and spray_wall_problem_id is null)
  or
  (spray_wall_problem_id is not null
    and problem_id is null
    and board_problem_id is null)
);
