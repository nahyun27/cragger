-- 근력/지구력처럼 암장 없이도 기록 가능한 카테고리 지원.
-- sessions.gym_id, session_plans.gym_id 를 NULL 허용으로 변경.

alter table sessions       alter column gym_id drop not null;
alter table session_plans  alter column gym_id drop not null;
