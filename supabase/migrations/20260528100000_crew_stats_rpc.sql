-- 크루 통계용 SECURITY DEFINER 함수.
-- sessions/attempts RLS 가 본인 행만 노출하지만 크루 멤버는 동료의
-- 집계 결과를 봐야 함. 따라서 RLS 를 우회하는 RPC 로 노출.
-- 인증 함수에서 호출자의 crew_members 가입 여부를 검증해 누수 차단.

create or replace function crew_home_stats(p_crew_id uuid)
returns table (
  activity_rate int,
  avg_v_grade text,
  meetup_count_last_month int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  member_total int;
  active_users int;
  avg_v numeric;
  meetup_cnt int;
  last_from date;
  last_to date;
begin
  -- 호출자가 해당 크루 멤버인지 확인
  if uid is null then
    raise exception 'unauthorized';
  end if;
  if not exists (
    select 1 from crew_members
    where crew_id = p_crew_id and user_id = uid
  ) then
    raise exception 'not a member';
  end if;

  -- 멤버 총원
  select count(*) into member_total
    from crew_members where crew_id = p_crew_id;
  if member_total = 0 then
    activity_rate := 0;
    avg_v_grade := null;
    meetup_count_last_month := 0;
    return next;
    return;
  end if;

  -- 30일 내 세션 있는 멤버 수
  select count(distinct s.user_id) into active_users
    from sessions s
    join crew_members cm on cm.user_id = s.user_id and cm.crew_id = p_crew_id
    where s.session_date >= current_date - interval '30 days';
  activity_rate := round((active_users::numeric / member_total) * 100)::int;

  -- 평균 V그레이드 (send 결과 + felt_grade)
  select avg(
    case
      when a.felt_grade ~ '^V(\d+)\+$' then (substring(a.felt_grade from '\d+'))::int + 0.5
      when a.felt_grade ~ '^V(\d+)-$' then (substring(a.felt_grade from '\d+'))::int - 0.5
      when a.felt_grade ~ '^V(\d+)$'  then (substring(a.felt_grade from '\d+'))::int
      else null
    end
  ) into avg_v
    from attempts a
    join sessions s on s.id = a.session_id
    join crew_members cm on cm.user_id = s.user_id and cm.crew_id = p_crew_id
    where a.result in ('send', 'onsight', 'flash', 'redpoint')
      and a.felt_grade is not null;

  if avg_v is not null then
    avg_v_grade := 'V' || round(avg_v)::int;
  else
    avg_v_grade := null;
  end if;

  -- 지난달 모임 수
  last_from := date_trunc('month', current_date - interval '1 month');
  last_to   := date_trunc('month', current_date);
  select count(*) into meetup_cnt
    from posts
    where crew_id = p_crew_id
      and post_type = 'meetup'
      and meetup_at >= last_from and meetup_at < last_to;
  meetup_count_last_month := meetup_cnt;

  return next;
end;
$$;

grant execute on function crew_home_stats(uuid) to authenticated;

-- 크루원 실력 분포 — 멤버별 max V (반올림) 의 분포 + 호출자 max V
create or replace function crew_grade_distribution(p_crew_id uuid)
returns table (
  v_num int,
  member_count int,
  is_me boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  my_v int;
begin
  if uid is null then
    raise exception 'unauthorized';
  end if;
  if not exists (
    select 1 from crew_members
    where crew_id = p_crew_id and user_id = uid
  ) then
    raise exception 'not a member';
  end if;

  return query
  with member_max as (
    select
      s.user_id,
      max(
        case
          when a.felt_grade ~ '^V(\d+)\+$' then (substring(a.felt_grade from '\d+'))::int + 0.5
          when a.felt_grade ~ '^V(\d+)-$' then (substring(a.felt_grade from '\d+'))::int - 0.5
          when a.felt_grade ~ '^V(\d+)$'  then (substring(a.felt_grade from '\d+'))::int
          else null
        end
      ) as max_v
    from attempts a
    join sessions s on s.id = a.session_id
    join crew_members cm on cm.user_id = s.user_id and cm.crew_id = p_crew_id
    where a.result in ('send', 'onsight', 'flash', 'redpoint')
      and a.felt_grade is not null
    group by s.user_id
  ),
  rounded as (
    select user_id, round(max_v)::int as v_num
    from member_max
    where max_v is not null
  )
  select
    r.v_num,
    count(*)::int as member_count,
    bool_or(r.user_id = uid) as is_me
  from rounded r
  group by r.v_num
  order by r.v_num;
end;
$$;

grant execute on function crew_grade_distribution(uuid) to authenticated;
