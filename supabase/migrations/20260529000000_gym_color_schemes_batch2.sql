-- 추가 5개 체인 색깔 체계 시드 (전 지점 동일 적용).
-- 손상원클라이밍짐 / 피커스클라이밍 / 웨이브락클라이밍 / 더플라스틱클라이밍
-- 클라이밍파크는 이전 마이그레이션에서 전 지점 적용됨.

create or replace function pg_temp.reset_colors(p_gym_id uuid) returns void as $$
begin
  delete from gym_color_schemes where gym_id = p_gym_id;
end;
$$ language plpgsql;

-- ──────────────────────────────────────────────────────────
-- 1) 손상원클라이밍짐 (전 지점)
-- ──────────────────────────────────────────────────────────
do $$
declare gid uuid;
begin
  for gid in select id from gyms where name like '%손상원%' loop
    perform pg_temp.reset_colors(gid);
    insert into gym_color_schemes (gym_id, color, color_hex, order_index, official_label) values
      (gid, 'white',  '#F8FAFC',  1, 'V0-'),
      (gid, 'yellow', '#F4D03F',  2, 'V0'),
      (gid, 'green',  '#27AE60',  3, 'V0+'),
      (gid, 'blue',   '#3498DB',  4, 'V1'),
      (gid, 'red',    '#E24B4A',  5, 'V2'),
      (gid, 'black',  '#0F172A',  6, 'V3-V4'),
      (gid, 'gray',   '#94A3B8',  7, 'V5'),
      (gid, 'brown',  '#7B4B2A',  8, 'V6'),
      (gid, 'pink',   '#EC407A',  9, 'V7'),
      (gid, 'purple', '#8E44AD', 10, 'V8');
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────
-- 2) 피커스클라이밍 (전 지점)
-- ──────────────────────────────────────────────────────────
do $$
declare gid uuid;
begin
  for gid in select id from gyms where name like '%피커스%' loop
    perform pg_temp.reset_colors(gid);
    insert into gym_color_schemes (gym_id, color, color_hex, order_index, official_label) values
      (gid, 'red',    '#E24B4A',  1, 'Vb'),
      (gid, 'orange', '#F39322',  2, 'V0-'),
      (gid, 'yellow', '#F4D03F',  3, 'V0'),
      (gid, 'green',  '#27AE60',  4, 'V0+'),
      (gid, 'blue',   '#3498DB',  5, 'V1'),
      (gid, 'navy',   '#1E3A8A',  6, 'V2'),
      (gid, 'purple', '#8E44AD',  7, 'V3-V4'),
      (gid, 'gray',   '#94A3B8',  8, 'V5'),
      (gid, 'black',  '#0F172A',  9, 'V6');
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────
-- 3) 웨이브락클라이밍 (전 지점)
-- ──────────────────────────────────────────────────────────
do $$
declare gid uuid;
begin
  for gid in select id from gyms where name like '%웨이브락%' loop
    perform pg_temp.reset_colors(gid);
    insert into gym_color_schemes (gym_id, color, color_hex, order_index, official_label) values
      (gid, 'red',    '#E24B4A',  1, 'Vb'),
      (gid, 'orange', '#F39322',  2, 'V0-'),
      (gid, 'yellow', '#F4D03F',  3, 'V0'),
      (gid, 'green',  '#27AE60',  4, 'V0+'),
      (gid, 'blue',   '#3498DB',  5, 'V1-V2'),
      (gid, 'navy',   '#1E3A8A',  6, 'V3-V4'),
      (gid, 'purple', '#8E44AD',  7, 'V5'),
      (gid, 'brown',  '#7B4B2A',  8, 'V6'),
      (gid, 'white',  '#F8FAFC',  9, 'V7'),
      (gid, 'gray',   '#94A3B8', 10, 'V8'),
      (gid, 'black',  '#0F172A', 11, 'V9-V10');
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────
-- 4) 더플라스틱클라이밍 (전 지점)
-- ──────────────────────────────────────────────────────────
do $$
declare gid uuid;
begin
  for gid in select id from gyms where name like '%더플라스틱%' loop
    perform pg_temp.reset_colors(gid);
    insert into gym_color_schemes (gym_id, color, color_hex, order_index, official_label) values
      (gid, 'red',    '#E24B4A',  1, 'Vb'),
      (gid, 'orange', '#F39322',  2, 'V0-'),
      (gid, 'yellow', '#F4D03F',  3, 'V0'),
      (gid, 'green',  '#27AE60',  4, 'V0+'),
      (gid, 'blue',   '#3498DB',  5, 'V1-V2'),
      (gid, 'navy',   '#1E3A8A',  6, 'V3-V4'),
      (gid, 'purple', '#8E44AD',  7, 'V5-V6'),
      (gid, 'black',  '#0F172A',  8, 'V7'),
      (gid, 'white',  '#F8FAFC',  9, 'V8');
  end loop;
end $$;
