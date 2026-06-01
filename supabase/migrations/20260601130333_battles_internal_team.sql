-- 크루 내 팀전 추가 + 상태는 호스트가 수동 제어 (날짜는 기록용).
--
-- battle_type 새 값: 'crew_internal_team' (크루 내 A vs B 팀전)
-- battles 에 team_a_name / team_b_name (팀전일 때만 사용)
-- battle_participants 에 team text — 팀전일 때 'a' / 'b' 중 하나

-- 1) battle_type CHECK 갱신
alter table battles drop constraint if exists battles_battle_type_check;
alter table battles add constraint battles_battle_type_check
  check (battle_type in ('crew_internal', 'crew_internal_team', 'crew_vs_crew'));

-- 2) 팀 이름 컬럼
alter table battles
  add column if not exists team_a_name text,
  add column if not exists team_b_name text;

-- 3) battle_participants 에 team
alter table battle_participants
  add column if not exists team text check (team in ('a', 'b'));
