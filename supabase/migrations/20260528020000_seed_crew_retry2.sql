-- 맵짜단 시드 재시도 v2 — created_by FK 안전 처리 (owner_id 사용).
-- 정리: delete from auth.users where email like 'crewbot%@test.local';

do $$
declare
  owner_uid uuid;
  crew_id_var uuid;
  bot_ids uuid[] := ARRAY[]::uuid[];
  bot_id uuid;
  bot_names text[] := ARRAY[
    '클라이밍요정', '바위곰', '홀드마스터', '볼더보이',
    '슬랩퀸', '크랙킹', '토훅왕', '힐훅요정'
  ];
  bot_emails text[] := ARRAY[
    'crewbot1@test.local', 'crewbot2@test.local', 'crewbot3@test.local', 'crewbot4@test.local',
    'crewbot5@test.local', 'crewbot6@test.local', 'crewbot7@test.local', 'crewbot8@test.local'
  ];
  bot_max_v int[] := ARRAY[2, 3, 3, 4, 5, 5, 6, 7];
  grades text[] := ARRAY['V0','V1','V2','V2+','V3','V3+','V4','V4+','V5','V5+','V6','V6+','V7'];
  colors text[] := ARRAY['red','orange','yellow','green','blue','purple','pink','black'];
  results attempt_result[] := ARRAY[
    'send','send','send','send','flash','flash','project','project','fall']::attempt_result[];
  gyms_arr uuid[];
  prob_pool uuid[];
  prob_id uuid;
  sess_id uuid;
  i int; j int; k int;
  n_sessions int;
  n_attempts int;
  felt text;
  gym_var uuid;
begin
  -- 맵짜단 크루 + owner
  select id, owner_id into crew_id_var, owner_uid
    from crews where name = '맵짜단' limit 1;
  if crew_id_var is null then
    raise notice '맵짜단 크루 없음'; return;
  end if;
  if owner_uid is null then
    raise notice 'owner 없음'; return;
  end if;

  -- 이미 봇 가입돼 있으면 skip
  if exists (
    select 1 from crew_members cm
    join auth.users u on u.id = cm.user_id
    where cm.crew_id = crew_id_var and u.email like 'crewbot%@test.local'
  ) then
    raise notice '이미 봇 가입됨 — skip'; return;
  end if;

  -- gym 3개
  select array_agg(id) into gyms_arr from (select id from gyms order by random() limit 3) t;
  if gyms_arr is null then raise notice 'no gyms'; return; end if;

  -- problem pool — owner_uid 를 created_by 로 (FK 보장)
  prob_pool := ARRAY[]::uuid[];
  for i in 1..array_length(gyms_arr, 1) loop
    for j in 1..10 loop
      insert into problems (gym_id, color, created_by, description)
        values (
          gyms_arr[i],
          colors[1 + floor(random() * array_length(colors, 1))::int],
          owner_uid,
          'crew-seed')
        returning id into prob_id;
      prob_pool := array_append(prob_pool, prob_id);
    end loop;
  end loop;

  -- 봇 8명
  for i in 1..8 loop
    select id into bot_id from auth.users where email = bot_emails[i];
    if bot_id is null then
      bot_id := gen_random_uuid();
      insert into auth.users (
        id, instance_id, aud, role, email,
        encrypted_password, email_confirmed_at,
        created_at, updated_at
      ) values (
        bot_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated',
        bot_emails[i],
        crypt('TestPass123!', gen_salt('bf')),
        now(), now(), now()
      );
      update profiles
        set display_name = bot_names[i],
            username = 'bot' || i || '_' || substr(bot_id::text, 1, 4)
        where id = bot_id;
    end if;
    bot_ids := array_append(bot_ids, bot_id);

    insert into crew_members (crew_id, user_id, role)
      values (crew_id_var, bot_id, 'member')
      on conflict do nothing;
  end loop;

  -- 세션 + 시도
  for i in 1..8 loop
    n_sessions := 8 + floor(random() * 15)::int;
    for j in 1..n_sessions loop
      gym_var := gyms_arr[1 + floor(random() * array_length(gyms_arr, 1))::int];
      insert into sessions (user_id, gym_id, session_date, notes)
        values (bot_ids[i], gym_var, current_date - (random() * 90)::int, 'crew-seed')
        returning id into sess_id;

      n_attempts := 5 + floor(random() * 8)::int;
      for k in 1..n_attempts loop
        felt := grades[greatest(1, least(
          array_length(grades, 1),
          bot_max_v[i] + 1 + floor(random() * 3 - 1)::int
        ))];
        insert into attempts (session_id, climbing_type, problem_id, result, tries, felt_grade)
          values (
            sess_id, 'boulder',
            prob_pool[1 + floor(random() * array_length(prob_pool, 1))::int],
            results[1 + floor(random() * array_length(results, 1))::int],
            1 + floor(random() * 4)::int,
            felt);
      end loop;
    end loop;
  end loop;

  -- 모임 2개
  insert into posts (author_id, post_type, title, body, crew_id, meetup_at, meetup_capacity, meetup_location)
    values (
      owner_uid, 'meetup', '정기 모임',
      '이번 달 정기 모임입니다! 많이 와주세요.',
      crew_id_var,
      date_trunc('month', current_date) + interval '14 days 18 hours',
      10, '홈짐'
    );
  insert into posts (author_id, post_type, title, body, crew_id, meetup_at, meetup_capacity, meetup_location)
    values (
      owner_uid, 'meetup', '지난달 번개',
      '지난달에 했던 번개 모임입니다.',
      crew_id_var,
      date_trunc('month', current_date) - interval '10 days 18 hours',
      8, '근처 암장'
    );

  -- 공지
  insert into crew_announcements (crew_id, author_id, title, body, pinned)
    values (
      crew_id_var, owner_uid,
      '크루 규칙 안내',
      '1. 정기 모임은 매월 둘째 주 토요일입니다.\n2. 신규 멤버는 자기소개를 올려주세요.\n3. 즐겁게 등반합시다!',
      true
    );

  raise notice '맵짜단 시드 완료';
end $$;
