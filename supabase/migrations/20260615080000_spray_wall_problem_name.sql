-- 스프레이월 문제 이름 (선택적, 미입력 시 list index로 표시)
alter table spray_wall_problems
  add column if not exists name text;
