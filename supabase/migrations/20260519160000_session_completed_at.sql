-- ============================================================
-- Sessions: add completed_at marker for active/finished state
-- - completed_at IS NULL  → 진행 중
-- - completed_at IS NOT NULL → 종료된 세션, 그 시각
-- 진행 중 세션 lookup이 핫패스라 partial index 추가.
-- ============================================================

alter table sessions
  add column if not exists completed_at timestamptz;

create index if not exists idx_sessions_active
  on sessions(user_id, session_date)
  where completed_at is null;
