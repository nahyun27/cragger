-- ============================================================
-- Grade votes: 색깔↔V그레이드 크라우드 투표를 attempts에서 분리
-- 시도 안 한 색깔에도 투표 가능. (user_id, gym_id, color) PK로 UPSERT.
-- gym_color_grade_stats view를 attempts.felt_grade 기반에서 grade_votes 기반으로 재작성.
-- attempts.felt_grade 컬럼은 deprecated — v1.1에서 별도 마이그레이션으로 정리.
-- ============================================================

create table if not exists grade_votes (
  user_id    uuid not null references profiles(id) on delete cascade,
  gym_id     uuid not null references gyms(id) on delete cascade,
  color      text not null,
  grade      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, gym_id, color)
);

create index if not exists idx_grade_votes_gym_color
  on grade_votes(gym_id, color);

-- RLS
alter table grade_votes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'grade_votes_select_all' and tablename = 'grade_votes') then
    create policy grade_votes_select_all on grade_votes
      for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'grade_votes_insert_self' and tablename = 'grade_votes') then
    create policy grade_votes_insert_self on grade_votes
      for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'grade_votes_update_self' and tablename = 'grade_votes') then
    create policy grade_votes_update_self on grade_votes
      for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'grade_votes_delete_self' and tablename = 'grade_votes') then
    create policy grade_votes_delete_self on grade_votes
      for delete using (auth.uid() = user_id);
  end if;
end $$;

-- View 재작성: attempts → grade_votes
create or replace view gym_color_grade_stats as
select
  gym_id,
  color,
  count(*) as vote_count,
  round(avg(v_grade_to_num(grade)), 1) as avg_v_grade,
  percentile_cont(0.5) within group (order by v_grade_to_num(grade)) as median_v_grade,
  num_to_v_grade(round(avg(v_grade_to_num(grade)), 1)) as avg_v_grade_label
from grade_votes
group by gym_id, color
having count(*) > 0;
