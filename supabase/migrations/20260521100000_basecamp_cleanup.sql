-- 베이스캠프 정리
-- (1) 안산 베이스캠프 클라이밍 vs 안산베이스캠프클라이밍 머지
--      - canonical: '안산 베이스캠프 클라이밍' (with spaces) — bulk import 주소·연락처 보유
--      - duplicate: '안산베이스캠프클라이밍' (no spaces) — moonboard 마이그레이션의 stub
--      - has_moonboard 플래그를 canonical로 이관 후 dup 삭제
-- (2) 베이스캠프 볼더스팟 클라이밍 유성점 — 폐업

do $$
declare
  cid uuid;
  did uuid;
begin
  select id into cid from gyms where name = '안산 베이스캠프 클라이밍' and branch is null;
  select id into did from gyms where name = '안산베이스캠프클라이밍'  and branch is null;

  if cid is not null and did is not null then
    update gyms set
      has_kilter    = has_kilter    or (select has_kilter    from gyms where id = did),
      has_tension   = has_tension   or (select has_tension   from gyms where id = did),
      has_moonboard = has_moonboard or (select has_moonboard from gyms where id = did),
      updated_at    = now()
    where id = cid;

    update profiles set home_gym_id = cid where home_gym_id = did;
    delete from gym_color_schemes where gym_id = did and
      (color in (select color from gym_color_schemes where gym_id = cid)
       or order_index in (select order_index from gym_color_schemes where gym_id = cid));
    update gym_color_schemes set gym_id = cid where gym_id = did;
    update gym_prices  set gym_id = cid where gym_id = did;
    update sessions    set gym_id = cid where gym_id = did;
    update problems    set gym_id = cid where gym_id = did;
    update memberships set gym_id = cid where gym_id = did;
    delete from grade_votes where gym_id = did and (user_id, color) in
      (select user_id, color from grade_votes where gym_id = cid);
    update grade_votes set gym_id = cid where gym_id = did;
    delete from gym_favorites where gym_id = did and user_id in
      (select user_id from gym_favorites where gym_id = cid);
    update gym_favorites set gym_id = cid where gym_id = did;
    update posts set gym_id = cid where gym_id = did;

    delete from gyms where id = did;
  end if;
end $$;

-- 베이스캠프 볼더스팟 클라이밍 — 유성점·둔산점 모두 폐업
delete from gyms
 where name = '베이스캠프 볼더스팟 클라이밍'
   and branch in ('유성점', '둔산점');
