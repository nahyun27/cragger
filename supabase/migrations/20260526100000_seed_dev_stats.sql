-- DEV ONLY: 통계 UI 시각 검증용 가짜 데이터.
-- ichanwoong@gmail.com 계정에 지난 6개월간 sessions+attempts 시드.
--
-- 정리 방법:
--   delete from sessions where notes = 'dev-seed';
--   delete from problems where description = 'dev-seed';
--   (sessions cascade 로 attempts 도 함께 삭제)

do $$
declare
  uid uuid;
  gyms_arr uuid[];
  colors text[] := ARRAY['red','orange','yellow','green','blue','purple','pink','black'];
  grades text[] := ARRAY['V0','V1','V1+','V2','V2+','V3','V3+','V4','V4+','V5','V5+','V6'];
  results attempt_result[] := ARRAY[
    'send','send','send','send','send',
    'flash','flash',
    'project','project','project',
    'fall']::attempt_result[];
  sess_id uuid;
  prob_id uuid;
  problem_pool uuid[];
  gym_id_var uuid;
  i int; j int; n_attempts int;
begin
  select id into uid from auth.users where email = 'ichanwoong@gmail.com';
  if uid is null then
    raise notice 'no user — skip dev seed';
    return;
  end if;

  -- 자주 가는 gym 3개 random
  select array_agg(id) into gyms_arr from (
    select id from gyms order by random() limit 3
  ) t;
  if gyms_arr is null or array_length(gyms_arr, 1) = 0 then
    raise notice 'no gyms — skip';
    return;
  end if;

  -- gym 당 problem pool (color random 10개)
  problem_pool := ARRAY[]::uuid[];
  for i in 1..array_length(gyms_arr, 1) loop
    for j in 1..10 loop
      insert into problems (gym_id, color, created_by, description)
        values (
          gyms_arr[i],
          colors[1 + floor(random() * array_length(colors, 1))::int],
          uid,
          'dev-seed')
        returning id into prob_id;
      problem_pool := array_append(problem_pool, prob_id);
    end loop;
  end loop;

  -- 80 sessions / 지난 180일 random 분포
  for i in 1..80 loop
    gym_id_var := gyms_arr[1 + floor(random() * array_length(gyms_arr, 1))::int];
    insert into sessions (user_id, gym_id, session_date, notes)
      values (
        uid,
        gym_id_var,
        current_date - (random() * 180)::int,
        'dev-seed')
      returning id into sess_id;

    n_attempts := 5 + floor(random() * 9)::int;  -- 5~13
    for j in 1..n_attempts loop
      insert into attempts (session_id, climbing_type, problem_id, result, tries, felt_grade)
        values (
          sess_id,
          'boulder',
          problem_pool[1 + floor(random() * array_length(problem_pool, 1))::int],
          results[1 + floor(random() * array_length(results, 1))::int],
          1 + floor(random() * 4)::int,
          grades[1 + floor(random() * array_length(grades, 1))::int]);
    end loop;
  end loop;
end $$;
