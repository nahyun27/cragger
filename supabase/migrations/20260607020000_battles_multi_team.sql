-- 크루 내 팀전 — 2팀(A/B)에서 N팀(2~6)으로 확장.
-- team_configs jsonb: [{key: 'a', name: '이름'}, ...] — UI에서 순서대로 노출.
-- battle_participants.team 의 CHECK 제약은 풀어서 a~f 같은 임의 키 허용.

alter table battles
  add column if not exists team_configs jsonb not null default '[]'::jsonb;

-- 기존 (A/B) 팀전 데이터 backfill
update battles
set team_configs = jsonb_build_array(
  jsonb_build_object('key', 'a', 'name', coalesce(team_a_name, 'A팀')),
  jsonb_build_object('key', 'b', 'name', coalesce(team_b_name, 'B팀'))
)
where battle_type = 'crew_internal_team'
  and team_configs = '[]'::jsonb;

-- 팀 키 제약 해제 (a, b 외에 c, d, e, f 허용)
alter table battle_participants drop constraint if exists battle_participants_team_check;
