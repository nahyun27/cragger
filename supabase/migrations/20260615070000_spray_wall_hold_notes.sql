-- 홀드별 설명 (어떤 홀드인지 식별 메모)
alter table spray_wall_holds
  add column if not exists notes text;
