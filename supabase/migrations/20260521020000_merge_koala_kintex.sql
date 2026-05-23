-- Merge duplicate 코알라 킨텍스 rows.
--
-- Two rows ended up in gyms for the same physical location:
--   canonical: ('코알라클라이밍',  '킨텍스점')  ← initial seed; has size_pyeong + opened_at
--   duplicate: ('코알라 클라이밍', '킨텍스')    ← bulk import; has full address + (now) has_kilter
--
-- They slipped past the (name, branch) unique constraint because the
-- name has a different space and the branch suffix differs.
--
-- This script:
--   1. Folds the duplicate's useful fields into the canonical row.
--   2. Re-points every gym_id FK reference from dup → canonical,
--      deduping per UNIQUE constraints where they exist.
--   3. Deletes the duplicate row.
-- Idempotent — if either row is already missing, it's a no-op.

do $$
declare
  cid uuid;
  did uuid;
begin
  select id into cid
    from gyms where name = '코알라클라이밍' and branch = '킨텍스점';
  select id into did
    from gyms where name = '코알라 클라이밍' and branch = '킨텍스';

  if cid is null or did is null then
    raise notice '코알라 merge skipped — canonical=% dup=%', cid, did;
    return;
  end if;

  -- ── Merge useful fields from dup into canonical ────────────────
  --    Canonical's value wins when both have non-null; flags OR together.
  update gyms set
    address          = coalesce(address,          (select address          from gyms where id = did)),
    latitude         = coalesce(latitude,         (select latitude         from gyms where id = did)),
    longitude        = coalesce(longitude,        (select longitude        from gyms where id = did)),
    phone            = coalesce(phone,            (select phone            from gyms where id = did)),
    website_url      = coalesce(website_url,      (select website_url      from gyms where id = did)),
    instagram_handle = coalesce(instagram_handle, (select instagram_handle from gyms where id = did)),
    parking_info     = coalesce(parking_info,     (select parking_info     from gyms where id = did)),
    description      = coalesce(description,      (select description      from gyms where id = did)),
    has_lead         = has_lead         or (select has_lead         from gyms where id = did),
    has_top_rope     = has_top_rope     or (select has_top_rope     from gyms where id = did),
    has_speed        = has_speed        or (select has_speed        from gyms where id = did),
    has_auto_belay   = has_auto_belay   or (select has_auto_belay   from gyms where id = did),
    has_moonboard    = has_moonboard    or (select has_moonboard    from gyms where id = did),
    has_kilter       = has_kilter       or (select has_kilter       from gyms where id = did),
    has_tension      = has_tension      or (select has_tension      from gyms where id = did),
    updated_at       = now()
  where id = cid;

  -- ── Re-point FK references; dedupe per UNIQUE constraints ──────

  -- profiles.home_gym_id (no unique)
  update profiles set home_gym_id = cid where home_gym_id = did;

  -- gym_color_schemes UNIQUE (gym_id, color) AND UNIQUE (gym_id, order_index)
  delete from gym_color_schemes
   where gym_id = did
     and (color in (select color from gym_color_schemes where gym_id = cid)
       or order_index in (select order_index from gym_color_schemes where gym_id = cid));
  update gym_color_schemes set gym_id = cid where gym_id = did;

  -- gym_prices (no unique on gym_id alone)
  update gym_prices set gym_id = cid where gym_id = did;

  -- sessions (no unique)
  update sessions set gym_id = cid where gym_id = did;

  -- problems (no unique on gym_id alone)
  update problems set gym_id = cid where gym_id = did;

  -- memberships (no unique on gym_id alone)
  update memberships set gym_id = cid where gym_id = did;

  -- grade_votes PRIMARY KEY (user_id, gym_id, color)
  delete from grade_votes
   where gym_id = did
     and (user_id, color) in (
       select user_id, color from grade_votes where gym_id = cid
     );
  update grade_votes set gym_id = cid where gym_id = did;

  -- gym_favorites PRIMARY KEY (user_id, gym_id)
  delete from gym_favorites
   where gym_id = did
     and user_id in (select user_id from gym_favorites where gym_id = cid);
  update gym_favorites set gym_id = cid where gym_id = did;

  -- posts.gym_id (no unique)
  update posts set gym_id = cid where gym_id = did;

  -- ── Finally drop the duplicate row ─────────────────────────────
  delete from gyms where id = did;
end $$;
