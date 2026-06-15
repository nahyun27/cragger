-- 암장 폐업 처리 — soft delete. 과거 세션/기록 보존을 위해 row 자체는 유지.
-- closed_at IS NULL 이면 운영 중. 클라이언트 picker/list에서 필터 적용.

alter table gyms add column if not exists closed_at timestamptz;
create index if not exists gyms_closed_at_idx on gyms (closed_at) where closed_at is null;

-- 폐업 제보 받은 암장 mark.
update gyms set closed_at = now()
where (name = '노루클라이밍'   and branch = '영남대점')
   or (name = '락트리 클라이밍' and branch = '강남');
