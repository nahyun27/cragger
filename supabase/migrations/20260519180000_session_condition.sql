-- ============================================================
-- Sessions: add condition column (1-5 scale, optional)
-- 사후 기록 폼에서 5단계 이모지 라디오로 수집:
--   1 = 😵 (최악), 2 = 😟, 3 = 😐, 4 = 🙂, 5 = 😄 (최상)
-- 미응답 가능하므로 nullable. 범위는 CHECK로 강제.
-- ============================================================

alter table sessions
  add column if not exists condition smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sessions_condition_range'
  ) then
    alter table sessions
      add constraint sessions_condition_range
      check (condition is null or (condition between 1 and 5));
  end if;
end $$;
