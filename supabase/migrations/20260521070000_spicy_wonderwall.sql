-- 스파이시클라이밍 (경기 군포) + 원더월클라이밍 (경기 안성) 신규 등록.
-- 두 가게 정보는 Naver 매장 페이지에서 확인.
-- 가격은 gym_prices에 멱등 insert (이미 있으면 skip).

insert into gyms (name, branch, city, district, address, phone) values
  (
    '스파이시클라이밍', NULL, '경기', '군포시',
    '경기 군포시 엘에스로 153-8 111호',
    '0507-1382-5513'
  ),
  (
    '원더월클라이밍', NULL, '경기', '안성시',
    '경기 안성시 공도읍 진건중길 121 102호',
    NULL
  )
on conflict (name, branch) do nothing;

-- 원더월 인스타 핸들도 같이
update gyms set
  instagram_handle = 'wonderwall_climb',
  website_url      = 'https://www.instagram.com/wonderwall_climb/',
  parking_info     = '단체 이용 가능 · 예약 · 무선 인터넷 · 남/녀 화장실 구분',
  updated_at       = now()
where name = '원더월클라이밍' and branch is null;

-- ── 스파이시 가격 (3건) ──────────────────────────────────────
insert into gym_prices (gym_id, product_type, name, price_krw, total_passes, notes)
select g.id, p.product_type::membership_type, p.name, p.price_krw, p.total_passes, p.notes
from gyms g
cross join (values
  ('single'::text, '체험강습 30분+자유이용+암벽화대여', 25000, NULL::int, NULL::text),
  ('single',       '일일 이용권 (당일 자유이용)',       20000, NULL,       NULL),
  ('passes',       '5회권',                              90000, 5,          '6개월 내 사용')
) as p(product_type, name, price_krw, total_passes, notes)
where g.name = '스파이시클라이밍' and g.branch is null
  and not exists (
    select 1 from gym_prices gp where gp.gym_id = g.id and gp.name = p.name
  );

-- ── 원더월 가격 (10건) ───────────────────────────────────────
insert into gym_prices (gym_id, product_type, name, price_krw, total_passes, duration_days, is_student, notes)
select g.id, p.product_type::membership_type, p.name, p.price_krw, p.total_passes, p.duration_days, p.is_student, p.notes
from gyms g
cross join (values
  ('single'::text, '스타터 패키지',              200000, NULL::int, NULL::int,  false, NULL::text),
  ('single',       '일일 체험권',                 30000, NULL,      NULL,        false, '네이버 예약 필수'),
  ('single',       '일일 이용권 (성인)',          20000, NULL,      NULL,        false, NULL),
  ('single',       '일일 이용권 (청소년)',        18000, NULL,      NULL,        true,  NULL),
  ('passes',       '5회 이용권',                  90000, 5,         NULL,        false, NULL),
  ('passes',       '10회 이용권',                170000, 10,        NULL,        false, NULL),
  ('monthly',      '1개월 회원권 (성인)',        130000, NULL,      30,          false, NULL),
  ('monthly',      '1개월 회원권 (청소년)',      110000, NULL,      30,          true,  NULL),
  ('period',       '3개월 회원권 (성인)',        330000, NULL,      90,          false, NULL),
  ('period',       '3개월 회원권 (청소년)',      300000, NULL,      90,          true,  NULL)
) as p(product_type, name, price_krw, total_passes, duration_days, is_student, notes)
where g.name = '원더월클라이밍' and g.branch is null
  and not exists (
    select 1 from gym_prices gp where gp.gym_id = g.id and gp.name = p.name
  );
