-- 8개 암장 색깔 체계 시드.
-- 체인 (서울숲클라이밍 / 더클라임 / 노루클라이밍) 은 모든 지점에 동일 적용.
-- 단독 지점 (클라이밍파크 강남 / 알레 강동 / 알레 혜화 / 알레 영등포 / 허브클라이밍) 은 해당 행만.

-- 색깔 hex 표준
-- red=E24B4A, orange=F39322, yellow=F4D03F, lime=C8E6A0,
-- green=27AE60, blue=3498DB, navy=1E3A8A, purple=8E44AD,
-- pink=EC407A, brown=7B4B2A, grey=94A3B8, black=0F172A, white=F8FAFC

-- ── 헬퍼: gym 의 색깔 체계 reset (insert 전 delete)
create or replace function pg_temp.reset_colors(p_gym_id uuid) returns void as $$
begin
  delete from gym_color_schemes where gym_id = p_gym_id;
end;
$$ language plpgsql;

-- ──────────────────────────────────────────────────────────
-- 1) 클라이밍파크 (모든 지점 동일)
-- ──────────────────────────────────────────────────────────
do $$
declare gid uuid;
begin
  for gid in select id from gyms where name like '%클라이밍파크%' loop
    perform pg_temp.reset_colors(gid);
    insert into gym_color_schemes (gym_id, color, color_hex, order_index, official_label) values
      (gid, 'yellow',  '#F4D03F',  1, 'Vb-V0-'),
      (gid, 'pink',    '#EC407A',  2, 'V0'),
      (gid, 'blue',    '#3498DB',  3, 'V0+'),
      (gid, 'red',     '#E24B4A',  4, 'V1'),
      (gid, 'purple',  '#8E44AD',  5, 'V2'),
      (gid, 'brown',   '#7B4B2A',  6, 'V3-V4'),
      (gid, 'gray',    '#94A3B8',  7, 'V5-V6'),
      (gid, 'black',   '#0F172A',  8, 'V7'),
      (gid, 'white',   '#F8FAFC',  9, 'V8');
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────
-- 2) 노루클라이밍 (모든 지점 동일)
-- ──────────────────────────────────────────────────────────
do $$
declare gid uuid;
begin
  for gid in select id from gyms where name like '%노루클라이밍%' loop
    perform pg_temp.reset_colors(gid);
    insert into gym_color_schemes (gym_id, color, color_hex, order_index, official_label) values
      (gid, 'red',    '#E24B4A',  1, 'Vb'),
      (gid, 'orange', '#F39322',  2, 'V0-'),
      (gid, 'yellow', '#F4D03F',  3, 'V0'),
      (gid, 'green',  '#27AE60',  4, 'V0+'),
      (gid, 'blue',   '#3498DB',  5, 'V1'),
      (gid, 'navy',   '#1E3A8A',  6, 'V2-V3'),
      (gid, 'purple', '#8E44AD',  7, 'V4'),
      (gid, 'brown',  '#7B4B2A',  8, 'V5-V6'),
      (gid, 'black',  '#0F172A',  9, 'V7'),
      (gid, 'white',  '#F8FAFC', 10, 'V8');
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────
-- 3) 알레 클라이밍 강동
-- ──────────────────────────────────────────────────────────
do $$
declare gid uuid;
begin
  select id into gid from gyms where name like '%알레%' and branch like '%강동%' limit 1;
  if gid is null then raise notice '알레 강동 없음'; return; end if;
  perform pg_temp.reset_colors(gid);
  insert into gym_color_schemes (gym_id, color, color_hex, order_index, official_label) values
    (gid, 'white',  '#F8FAFC',  1, 'Vb'),
    (gid, 'yellow', '#F4D03F',  2, 'V0-'),
    (gid, 'lime',   '#C8E6A0',  3, 'V0'),
    (gid, 'green',  '#27AE60',  4, 'V0+'),
    (gid, 'blue',   '#3498DB',  5, 'V1'),
    (gid, 'red',    '#E24B4A',  6, 'V2'),
    (gid, 'gray',   '#94A3B8',  7, 'V3-V4'),
    (gid, 'brown',  '#7B4B2A',  8, 'V5'),
    (gid, 'pink',   '#EC407A',  9, 'V6'),
    (gid, 'black',  '#0F172A', 10, 'V7');
end $$;

-- ──────────────────────────────────────────────────────────
-- 4) 알레 클라이밍 혜화
-- ──────────────────────────────────────────────────────────
do $$
declare gid uuid;
begin
  select id into gid from gyms where name like '%알레%' and branch like '%혜화%' limit 1;
  if gid is null then raise notice '알레 혜화 없음'; return; end if;
  perform pg_temp.reset_colors(gid);
  insert into gym_color_schemes (gym_id, color, color_hex, order_index, official_label) values
    (gid, 'white',  '#F8FAFC',  1, 'Vb'),
    (gid, 'yellow', '#F4D03F',  2, 'V0-'),
    (gid, 'lime',   '#C8E6A0',  3, 'V0'),
    (gid, 'green',  '#27AE60',  4, 'V0+'),
    (gid, 'blue',   '#3498DB',  5, 'V1'),
    (gid, 'red',    '#E24B4A',  6, 'V2'),
    (gid, 'gray',   '#94A3B8',  7, 'V3-V4'),
    (gid, 'brown',  '#7B4B2A',  8, 'V5'),
    (gid, 'pink',   '#EC407A',  9, 'V6');
end $$;

-- ──────────────────────────────────────────────────────────
-- 5) 서울숲클라이밍 (모든 지점 동일)
-- ──────────────────────────────────────────────────────────
do $$
declare gid uuid;
begin
  for gid in select id from gyms where name like '%서울숲클라이밍%' loop
    perform pg_temp.reset_colors(gid);
    insert into gym_color_schemes (gym_id, color, color_hex, order_index, official_label) values
      (gid, 'pink',   '#EC407A',  1, 'V-4'),
      (gid, 'red',    '#E24B4A',  2, 'Vb'),
      (gid, 'orange', '#F39322',  3, 'V0-'),
      (gid, 'yellow', '#F4D03F',  4, 'V0'),
      (gid, 'green',  '#27AE60',  5, 'V0+'),
      (gid, 'blue',   '#3498DB',  6, 'V1-V2'),
      (gid, 'navy',   '#1E3A8A',  7, 'V3'),
      (gid, 'purple', '#8E44AD',  8, 'V4-V5'),
      (gid, 'brown',  '#7B4B2A',  9, 'V6'),
      (gid, 'black',  '#0F172A', 10, 'V7');
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────
-- 6) 알레 클라이밍 영등포점
-- ──────────────────────────────────────────────────────────
do $$
declare gid uuid;
begin
  select id into gid from gyms where name like '%알레%' and branch like '%영등포%' limit 1;
  if gid is null then raise notice '알레 영등포 없음'; return; end if;
  perform pg_temp.reset_colors(gid);
  insert into gym_color_schemes (gym_id, color, color_hex, order_index, official_label) values
    (gid, 'white',  '#F8FAFC',  1, 'V0-'),
    (gid, 'yellow', '#F4D03F',  2, 'V0'),
    (gid, 'lime',   '#C8E6A0',  3, 'V0+'),
    (gid, 'green',  '#27AE60',  4, 'V1'),
    (gid, 'blue',   '#3498DB',  5, 'V2'),
    (gid, 'red',    '#E24B4A',  6, 'V3'),
    (gid, 'gray',   '#94A3B8',  7, 'V4'),
    (gid, 'brown',  '#7B4B2A',  8, 'V5'),
    (gid, 'pink',   '#EC407A',  9, 'V6-V7');
end $$;

-- ──────────────────────────────────────────────────────────
-- 7) 더클라임 (모든 지점 동일)
-- ──────────────────────────────────────────────────────────
do $$
declare gid uuid;
begin
  for gid in select id from gyms where name like '%더클라임%' loop
    perform pg_temp.reset_colors(gid);
    insert into gym_color_schemes (gym_id, color, color_hex, order_index, official_label) values
      (gid, 'white',  '#F8FAFC',  1, 'Vb'),
      (gid, 'yellow', '#F4D03F',  2, 'V0-'),
      (gid, 'orange', '#F39322',  3, 'V0'),
      (gid, 'green',  '#27AE60',  4, 'V0+'),
      (gid, 'blue',   '#3498DB',  5, 'V1-V2'),
      (gid, 'red',    '#E24B4A',  6, 'V3-V4'),
      (gid, 'pink',   '#EC407A',  7, 'V5'),
      (gid, 'purple', '#8E44AD',  8, 'V6'),
      (gid, 'gray',   '#94A3B8',  9, 'V7'),
      (gid, 'brown',  '#7B4B2A', 10, 'V8'),
      (gid, 'black',  '#0F172A', 11, 'V9-V10');
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────
-- 8) 허브클라이밍
-- ──────────────────────────────────────────────────────────
do $$
declare gid uuid;
begin
  select id into gid from gyms where name like '%허브클라이밍%' limit 1;
  if gid is null then raise notice '허브클라이밍 없음'; return; end if;
  perform pg_temp.reset_colors(gid);
  insert into gym_color_schemes (gym_id, color, color_hex, order_index, official_label) values
    (gid, 'red',    '#E24B4A',  1, 'Vb'),
    (gid, 'yellow', '#F4D03F',  2, 'V0-'),
    (gid, 'orange', '#F39322',  3, 'V0'),
    (gid, 'green',  '#27AE60',  4, 'V0+'),
    (gid, 'blue',   '#3498DB',  5, 'V1-V2'),
    (gid, 'navy',   '#1E3A8A',  6, 'V3'),
    (gid, 'purple', '#8E44AD',  7, 'V4'),
    (gid, 'gray',   '#94A3B8',  8, 'V5'),
    (gid, 'black',  '#0F172A',  9, 'V6-V7'),
    (gid, 'white',  '#F8FAFC', 10, 'V8');
end $$;
