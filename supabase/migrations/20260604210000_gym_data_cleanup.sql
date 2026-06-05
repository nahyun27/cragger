-- 사용자 제보로 발견된 데이터 이슈 정리.
--
-- 1) 제주 에이스 — 같은 암장이 다른 이름으로 3건 중복 등록.
--    canonical: '제주 에이스 클라이밍 센터'
--    중복: '제주에이스 클라이밍클럽', '에이스클라이밍 센터 제주점'
--    → 자식 참조 (sessions, color_schemes 등) 를 canonical 로 옮기고 중복 삭제.
--
-- 2) 핸드워크 클라이밍장 — 봉선점이 전대점으로 이사 (실제 이전).
--    → branch 만 '봉선점' → '전대점' 으로 변경. 자식 참조는 그대로 유지.

-- ── 1) 제주 에이스 중복 정리 ─────────────────────────────────
do $$
declare
  v_canonical_id uuid;
  v_dup_ids uuid[];
begin
  -- canonical 찾기 (이름 정확 매치 안 되면 LIKE 로 대체)
  select id into v_canonical_id
    from gyms
   where name = '제주 에이스 클라이밍 센터'
   limit 1;

  if v_canonical_id is null then
    -- 변형도 허용 — 공백 제거 비교
    select id into v_canonical_id
      from gyms
     where replace(name, ' ', '') = '제주에이스클라이밍센터'
     limit 1;
  end if;

  if v_canonical_id is null then
    raise notice '제주 에이스 canonical 찾지 못함 — 정리 skip';
    return;
  end if;

  -- 중복 후보 수집 (canonical 제외)
  select array_agg(id) into v_dup_ids
    from gyms
   where id <> v_canonical_id
     and (
       name = '제주에이스 클라이밍클럽'
       or name = '에이스클라이밍 센터 제주점'
       or replace(name, ' ', '') = '제주에이스클라이밍클럽'
       or replace(name, ' ', '') = '에이스클라이밍센터제주점'
     );

  if v_dup_ids is null or array_length(v_dup_ids, 1) = 0 then
    raise notice '제주 에이스 중복 후보 없음';
    return;
  end if;

  raise notice '제주 에이스 canonical=% 중복=%개', v_canonical_id, array_length(v_dup_ids, 1);

  -- 자식 참조를 canonical 로 이동 (충돌 가능 UNIQUE 가 있는 테이블은 먼저 dedup)
  update sessions             set gym_id = v_canonical_id where gym_id = any(v_dup_ids);
  update problems             set gym_id = v_canonical_id where gym_id = any(v_dup_ids);
  update gym_submissions      set gym_id = v_canonical_id where gym_id = any(v_dup_ids);
  update posts                set gym_id = v_canonical_id where gym_id = any(v_dup_ids);
  update battles              set gym_id = v_canonical_id where gym_id = any(v_dup_ids);
  update crews                set home_gym_id = v_canonical_id where home_gym_id = any(v_dup_ids);

  -- grade_votes: (user_id, gym_id, color) UNIQUE — 동일 색깔 본인 투표 충돌 방지
  delete from grade_votes
    where gym_id = any(v_dup_ids)
      and exists (
        select 1 from grade_votes gv2
        where gv2.user_id = grade_votes.user_id
          and gv2.gym_id = v_canonical_id
          and lower(gv2.color) = lower(grade_votes.color)
      );
  update grade_votes set gym_id = v_canonical_id where gym_id = any(v_dup_ids);

  -- memberships: (user_id, gym_id) 본인 회원권 중복 가능 → 본인거 canonical 에 있으면 dup 제거
  delete from memberships
    where gym_id = any(v_dup_ids)
      and exists (
        select 1 from memberships m2
        where m2.user_id = memberships.user_id and m2.gym_id = v_canonical_id
      );
  update memberships set gym_id = v_canonical_id where gym_id = any(v_dup_ids);

  -- 즐겨찾기: (user_id, gym_id) UNIQUE
  delete from gym_favorites
    where gym_id = any(v_dup_ids)
      and exists (
        select 1 from gym_favorites gf2
        where gf2.user_id = gym_favorites.user_id and gf2.gym_id = v_canonical_id
      );
  update gym_favorites set gym_id = v_canonical_id where gym_id = any(v_dup_ids);

  -- 색깔 스키마는 중복 (canonical 에 이미 있을 수 있음) → conflict 방지 후 삭제
  delete from gym_color_schemes
    where gym_id = any(v_dup_ids)
      and exists (
        select 1 from gym_color_schemes cs2
        where cs2.gym_id = v_canonical_id and lower(cs2.color) = lower(gym_color_schemes.color)
      );
  -- 남은 색깔은 canonical 로 흡수 (없는 색만)
  update gym_color_schemes set gym_id = v_canonical_id where gym_id = any(v_dup_ids);

  -- 가격
  delete from gym_prices where gym_id = any(v_dup_ids);

  -- 마지막으로 중복 gym 삭제
  delete from gyms where id = any(v_dup_ids);
end $$;

-- ── 2) 핸드워크 봉선점 → 전대점 ─────────────────────────────
update gyms
   set branch = '전대점',
       updated_at = now()
 where (name = '핸드워크 클라이밍장' or name = '핸드워크 클라이밍짐' or name like '핸드워크%')
   and branch = '봉선점';
