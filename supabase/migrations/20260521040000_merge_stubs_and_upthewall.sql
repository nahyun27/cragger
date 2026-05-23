-- ──────────────────────────────────────────────────────────────
-- (1) Merge 2 duplicate stubs created by 20260521000000_kilter_tension_flags
--     My kilter migration INSERT'd standalone rows for '닷클라이밍짐'
--     and '클라임어스 미사점' before realizing the bulk_gym_import
--     already had '닷 클라이밍짐' and '클라임 어스 미사점' with a space.
--     Both pairs share normalized name + city + district → same gym.
--
--     For each pair: forward the has_kilter flag to the bulk row,
--     re-point any FK references that landed on the stub, drop the
--     stub. Same dedupe-per-UNIQUE pattern used in koala merge.
-- ──────────────────────────────────────────────────────────────

do $$
declare
  cid uuid;
  did uuid;
begin
  -- ── 닷 클라이밍짐 ─────────────────────────────────────────────
  select id into cid from gyms where name = '닷 클라이밍짐' and branch is null;
  select id into did from gyms where name = '닷클라이밍짐'  and branch is null;

  if cid is not null and did is not null then
    update gyms set
      has_kilter  = has_kilter  or (select has_kilter  from gyms where id = did),
      has_tension = has_tension or (select has_tension from gyms where id = did),
      updated_at  = now()
    where id = cid;

    update profiles set home_gym_id = cid where home_gym_id = did;
    delete from gym_color_schemes where gym_id = did and
      (color in (select color from gym_color_schemes where gym_id = cid)
       or order_index in (select order_index from gym_color_schemes where gym_id = cid));
    update gym_color_schemes set gym_id = cid where gym_id = did;
    update gym_prices    set gym_id = cid where gym_id = did;
    update sessions      set gym_id = cid where gym_id = did;
    update problems      set gym_id = cid where gym_id = did;
    update memberships   set gym_id = cid where gym_id = did;
    delete from grade_votes where gym_id = did and (user_id, color) in
      (select user_id, color from grade_votes where gym_id = cid);
    update grade_votes   set gym_id = cid where gym_id = did;
    delete from gym_favorites where gym_id = did and user_id in
      (select user_id from gym_favorites where gym_id = cid);
    update gym_favorites set gym_id = cid where gym_id = did;
    update posts         set gym_id = cid where gym_id = did;

    delete from gyms where id = did;
  end if;

  -- ── 킨디 클라이밍 ─────────────────────────────────────────────
  -- canonical = '킨디클라이밍' / NULL / 경기 권선구  (correct address)
  -- dup       = '킨디 클라이밍' / 'KIN:D' / 수원 영통구  (seed; district wrong,
  --             'KIN:D' was brand subtitle not a real branch)
  -- Carry seed's size_pyeong + opened_at into the canonical row.
  select id into cid from gyms where name = '킨디클라이밍'  and branch is null;
  select id into did from gyms where name = '킨디 클라이밍' and branch = 'KIN:D';

  if cid is not null and did is not null then
    update gyms set
      size_pyeong = coalesce(size_pyeong, (select size_pyeong from gyms where id = did)),
      opened_at   = coalesce(opened_at,   (select opened_at   from gyms where id = did)),
      description = coalesce(description, (select description from gyms where id = did)),
      has_kilter  = has_kilter  or (select has_kilter  from gyms where id = did),
      has_tension = has_tension or (select has_tension from gyms where id = did),
      updated_at  = now()
    where id = cid;

    update profiles set home_gym_id = cid where home_gym_id = did;
    delete from gym_color_schemes where gym_id = did and
      (color in (select color from gym_color_schemes where gym_id = cid)
       or order_index in (select order_index from gym_color_schemes where gym_id = cid));
    update gym_color_schemes set gym_id = cid where gym_id = did;
    update gym_prices    set gym_id = cid where gym_id = did;
    update sessions      set gym_id = cid where gym_id = did;
    update problems      set gym_id = cid where gym_id = did;
    update memberships   set gym_id = cid where gym_id = did;
    delete from grade_votes where gym_id = did and (user_id, color) in
      (select user_id, color from grade_votes where gym_id = cid);
    update grade_votes   set gym_id = cid where gym_id = did;
    delete from gym_favorites where gym_id = did and user_id in
      (select user_id from gym_favorites where gym_id = cid);
    update gym_favorites set gym_id = cid where gym_id = did;
    update posts         set gym_id = cid where gym_id = did;

    delete from gyms where id = did;
  end if;

  -- ── 락클라이밍 산본 ──────────────────────────────────────────
  -- canonical = '락클라이밍 산본' / NULL  (cleaner branch label)
  -- dup       = '락클라이밍 산본' / '클라이밍센터'  ('클라이밍센터' was a
  --             generic suffix, not a real branch)
  -- Same gym per user — address column on canonical stays as-is.
  select id into cid from gyms where name = '락클라이밍 산본' and branch is null;
  select id into did from gyms where name = '락클라이밍 산본' and branch = '클라이밍센터';

  if cid is not null and did is not null then
    update gyms set
      address          = coalesce(address,          (select address          from gyms where id = did)),
      latitude         = coalesce(latitude,         (select latitude         from gyms where id = did)),
      longitude        = coalesce(longitude,        (select longitude        from gyms where id = did)),
      phone            = coalesce(phone,            (select phone            from gyms where id = did)),
      website_url      = coalesce(website_url,      (select website_url      from gyms where id = did)),
      instagram_handle = coalesce(instagram_handle, (select instagram_handle from gyms where id = did)),
      has_kilter       = has_kilter  or (select has_kilter  from gyms where id = did),
      has_tension      = has_tension or (select has_tension from gyms where id = did),
      has_moonboard    = has_moonboard or (select has_moonboard from gyms where id = did),
      updated_at       = now()
    where id = cid;

    update profiles set home_gym_id = cid where home_gym_id = did;
    delete from gym_color_schemes where gym_id = did and
      (color in (select color from gym_color_schemes where gym_id = cid)
       or order_index in (select order_index from gym_color_schemes where gym_id = cid));
    update gym_color_schemes set gym_id = cid where gym_id = did;
    update gym_prices    set gym_id = cid where gym_id = did;
    update sessions      set gym_id = cid where gym_id = did;
    update problems      set gym_id = cid where gym_id = did;
    update memberships   set gym_id = cid where gym_id = did;
    delete from grade_votes where gym_id = did and (user_id, color) in
      (select user_id, color from grade_votes where gym_id = cid);
    update grade_votes   set gym_id = cid where gym_id = did;
    delete from gym_favorites where gym_id = did and user_id in
      (select user_id from gym_favorites where gym_id = cid);
    update gym_favorites set gym_id = cid where gym_id = did;
    update posts         set gym_id = cid where gym_id = did;

    delete from gyms where id = did;
  end if;

  -- ── 클라임 어스 미사점 ────────────────────────────────────────
  select id into cid from gyms where name = '클라임 어스' and branch = '미사점';
  select id into did from gyms where name = '클라임어스'  and branch = '미사점';

  if cid is not null and did is not null then
    update gyms set
      has_kilter  = has_kilter  or (select has_kilter  from gyms where id = did),
      has_tension = has_tension or (select has_tension from gyms where id = did),
      updated_at  = now()
    where id = cid;

    update profiles set home_gym_id = cid where home_gym_id = did;
    delete from gym_color_schemes where gym_id = did and
      (color in (select color from gym_color_schemes where gym_id = cid)
       or order_index in (select order_index from gym_color_schemes where gym_id = cid));
    update gym_color_schemes set gym_id = cid where gym_id = did;
    update gym_prices    set gym_id = cid where gym_id = did;
    update sessions      set gym_id = cid where gym_id = did;
    update problems      set gym_id = cid where gym_id = did;
    update memberships   set gym_id = cid where gym_id = did;
    delete from grade_votes where gym_id = did and (user_id, color) in
      (select user_id, color from grade_votes where gym_id = cid);
    update grade_votes   set gym_id = cid where gym_id = did;
    delete from gym_favorites where gym_id = did and user_id in
      (select user_id from gym_favorites where gym_id = cid);
    update gym_favorites set gym_id = cid where gym_id = did;
    update posts         set gym_id = cid where gym_id = did;

    delete from gyms where id = did;
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- (2) 클라이밍 업더월 일산 — full info from gym's Naver page
--     Address & city/district already populated in bulk import.
--     Adds phone, instagram, parking note, kilter flag, prices.
-- ──────────────────────────────────────────────────────────────

update gyms set
  phone            = '0507-1367-4757',
  instagram_handle = 'climbing_upthewall',
  website_url      = 'https://www.instagram.com/climbing_upthewall/',
  parking_info     = '주차 가능 · 무선 인터넷 · 남/녀 화장실 구분',
  has_kilter       = true,
  updated_at       = now()
where name = '클라이밍 업더월 일산';

-- Add the 3 day-pass / lesson prices listed on Naver
insert into gym_prices (gym_id, product_type, name, price_krw)
select g.id, 'single', p.name, p.price_krw
from gyms g
cross join (values
  ('일일이용권',               15000),
  ('일일 체험 강습 (미성년자)', 20000),
  ('일일 체험 강습 (성인)',    25000)
) as p(name, price_krw)
where g.name = '클라이밍 업더월 일산'
  and not exists (
    select 1 from gym_prices gp where gp.gym_id = g.id and gp.name = p.name
  );

-- ──────────────────────────────────────────────────────────────
-- (3) Closed gyms — remove
-- ──────────────────────────────────────────────────────────────
-- 락랜드 클라이밍 (서울 강북구) — 폐업.
-- 모든 FK는 CASCADE 또는 SET NULL이라 안전하게 행 삭제 가능.
delete from gyms where name = '락랜드 클라이밍' and branch is null;
