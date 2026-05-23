-- 서울숲클라이밍 전 지점 난이도 체계 초기화 (2025-11-04 적용 기준).
-- HARD → EASY: 분홍 / 검정 / 갈색 / 보라 / 남색 / 하늘 / 초록 / 노랑 / 주황 / 빨강
-- order_index 는 낮을수록 쉬움 (빨강=1, 분홍=10).
--
-- 기존 schemes 모두 삭제 후 재삽입. grade_votes 는 (gym_id, color) text 매칭이라
-- 색깔 키가 동일하면 통계는 그대로 살아남고, 신규 색이면 빈 상태부터 시작.

do $$
declare
  ids uuid[];
begin
  select array_agg(id) into ids from gyms where name = '서울숲클라이밍';
  if ids is null then
    raise notice '서울숲클라이밍 gym row 없음 — skip';
    return;
  end if;

  delete from gym_color_schemes where gym_id = any(ids);

  insert into gym_color_schemes (gym_id, color, color_hex, order_index)
  select g.id, c.color, c.color_hex, c.order_index
  from gyms g
  cross join (values
    ('red',    '#E22C2C',  1),
    ('orange', '#F09339',  2),
    ('yellow', '#F5D04C',  3),
    ('green',  '#7DC354',  4),
    ('sky',    '#5BBDF0',  5),
    ('navy',   '#1E3FAF',  6),
    ('purple', '#9F5BFF',  7),
    ('brown',  '#7E4F4F',  8),
    ('black',  '#1a1a1a',  9),
    ('pink',   '#EE85C0', 10)
  ) as c(color, color_hex, order_index)
  where g.name = '서울숲클라이밍';
end $$;
