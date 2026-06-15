-- 회원권 — 다중 암장 지원 + 사용자 지정 이름.
-- T-pass 같은 연합 패스 케이스: 1개 회원권 → 여러 암장 사용 가능.
--
-- 변경:
--   - memberships.name text       (옵션, 사용자 지정 별칭)
--   - memberships.gym_ids uuid[]  (다중 암장. gym_id 는 backward compat 으로 유지 = 첫 번째)

alter table memberships
  add column if not exists name text,
  add column if not exists gym_ids uuid[] not null default '{}';

-- 기존 데이터 backfill — 단일 gym_id 를 gym_ids array 첫 원소로
update memberships
set gym_ids = array[gym_id]
where cardinality(gym_ids) = 0 and gym_id is not null;

-- gym_ids 안에서 gym 조회 인덱스
create index if not exists memberships_gym_ids_gin_idx on memberships using gin (gym_ids);
