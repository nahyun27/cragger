-- 일부 환경에서 20260531223134_gym_submissions.sql 의 gyms.logo_url 컬럼이 누락된 채
-- 후속 트리거(apply_gym_submission)만 적용된 상태가 발견됨. 승인 시
-- `column "logo_url" does not exist` 에러가 나서 idempotent guard 로 한 번 더 보장.

alter table gyms
  add column if not exists logo_url text;
