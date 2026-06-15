-- 스프레이월 홀드 재설계: 문제당 마커 1개 → 홀드 여러 개
-- hold_type: start(S) | middle(번호) | top(T) | foot(번호 없음)

-- 1. spray_wall_holds 테이블
create table if not exists spray_wall_holds (
  id          uuid primary key default gen_random_uuid(),
  problem_id  uuid not null references spray_wall_problems(id) on delete cascade,
  hold_type   text not null check (hold_type in ('start', 'middle', 'top', 'foot')),
  marker_x    numeric(5,2) not null,
  marker_y    numeric(5,2) not null,
  created_at  timestamptz not null default now()
);

create index if not exists spray_wall_holds_problem_id_idx on spray_wall_holds(problem_id);

alter table spray_wall_holds enable row level security;

create policy spray_wall_holds_select on spray_wall_holds
  for select using (true);

create policy spray_wall_holds_write on spray_wall_holds
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 2. 기존 데이터 마이그레이션: 단일 마커 → middle 홀드
insert into spray_wall_holds (problem_id, hold_type, marker_x, marker_y, created_at)
select id, 'middle', marker_x, marker_y, created_at
from spray_wall_problems
where marker_x is not null and marker_y is not null;

-- 3. spray_wall_problems 에서 마커 좌표 컬럼 제거
alter table spray_wall_problems drop column if exists marker_x;
alter table spray_wall_problems drop column if exists marker_y;
