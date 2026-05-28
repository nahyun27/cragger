-- 에픽클라임 볼더링 색깔 체계 시드.
-- 난이도 순서 (easy → hard):
--   red → orange → yellow → green → blue → violet
--   → brown → black → white → grey (가장 어려움)

do $$
declare
  gym_uuid uuid;
begin
  -- 에픽클라임 gym 찾기 (이름에 '에픽클라임' 포함)
  select id into gym_uuid
    from gyms
    where name like '%에픽클라임%'
    order by created_at asc
    limit 1;

  if gym_uuid is null then
    raise notice '에픽클라임 gym 없음 — skip';
    return;
  end if;

  -- 기존 색깔 체계가 있으면 삭제 후 재시드
  delete from gym_color_schemes where gym_id = gym_uuid;

  insert into gym_color_schemes (gym_id, color, color_hex, order_index, official_label) values
    (gym_uuid, 'red',    '#E24B4A', 1, 'red'),
    (gym_uuid, 'orange', '#F39322', 2, 'orange'),
    (gym_uuid, 'yellow', '#F4D03F', 3, 'yellow'),
    (gym_uuid, 'green',  '#27AE60', 4, 'green'),
    (gym_uuid, 'blue',   '#3498DB', 5, 'blue'),
    (gym_uuid, 'violet', '#8E44AD', 6, 'violet'),
    (gym_uuid, 'brown',  '#7B4B2A', 7, 'brown'),
    (gym_uuid, 'black',  '#0F172A', 8, 'black'),
    (gym_uuid, 'white',  '#F8FAFC', 9, 'white'),
    (gym_uuid, 'gray',   '#94A3B8', 10, 'gray');

  raise notice '에픽클라임 색깔 시드 완료 (10색)';
end $$;
