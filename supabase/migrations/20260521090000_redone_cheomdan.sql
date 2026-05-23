-- 레드원 클라이밍 — 봉선점 정규화 + 첨단점 신규 등록
--
-- 기존 DB:
--   ('레드원클라이밍 봉선', NULL, '광주', '남구', '광주 남구 봉선2로 81 가로수빌딩 3층', ...)
--   ↑ name 안에 '봉선'이 박혀있는 비표준 패턴.
--
-- 처리:
--   (1) 봉선 행을 (name='레드원클라이밍', branch='봉선점')로 정규화
--   (2) 첨단점 신규 INSERT
--   (3) 첨단점 가격 3건

-- (1) 봉선 row 정규화 (id 유지 → FK 안전)
update gyms set
  name   = '레드원클라이밍',
  branch = '봉선점',
  updated_at = now()
where name = '레드원클라이밍 봉선' and branch is null;

-- (2) 첨단점 신규
insert into gyms (name, branch, city, district, address, phone) values
  (
    '레드원클라이밍', '첨단점', '광주', '광산구',
    '광주 광산구 첨단강변로87번길 20 2층 201호',
    '0507-1429-1150'
  )
on conflict (name, branch) do nothing;

-- (3) 첨단점 가격
insert into gym_prices (gym_id, product_type, name, price_krw, is_student)
select g.id, p.product_type::membership_type, p.name, p.price_krw, p.is_student
from gyms g
cross join (values
  ('single'::text, '클라이밍 체험 프로그램 (장비, 레슨)',  25000, false),
  ('single',       '청소년 클라이밍 강습',                150000, true),
  ('single',       '성인 클라이밍 강습',                  180000, false)
) as p(product_type, name, price_krw, is_student)
where g.name = '레드원클라이밍' and g.branch = '첨단점'
  and not exists (
    select 1 from gym_prices gp where gp.gym_id = g.id and gp.name = p.name
  );
