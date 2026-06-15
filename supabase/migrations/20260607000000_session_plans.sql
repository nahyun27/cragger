-- 운동 계획 (사전 등록) — 캘린더 미래 날짜 탭으로 등록.
-- 실제 세션 기록과 분리. 계획 → 실제 세션 매핑은 completed_session_id 로.

create table session_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  gym_id uuid not null references gyms on delete cascade,
  planned_date date not null,
  planned_time time,                                                       -- 옵션 (예: 19:00)
  notes text,
  completed_session_id uuid references sessions on delete set null,        -- 계획이 실현되면 매핑
  created_at timestamptz not null default now()
);

create index session_plans_user_date_idx on session_plans (user_id, planned_date);
create index session_plans_completed_session_idx on session_plans (completed_session_id);

-- RLS — 본인만 CRUD
alter table session_plans enable row level security;

create policy "own plans select" on session_plans
  for select using (user_id = auth.uid());

create policy "own plans insert" on session_plans
  for insert with check (user_id = auth.uid());

create policy "own plans update" on session_plans
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own plans delete" on session_plans
  for delete using (user_id = auth.uid());
