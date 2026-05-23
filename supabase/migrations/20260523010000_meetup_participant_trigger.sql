-- 모임 기능 2단계
-- meetup_participants 의 status='joined' 행 수를 posts.participant_count 에
-- 자동 동기화. 다른 사람이 신청/취소해도 다음 fetch에서 정확한 정원이 반영됨.

create or replace function refresh_meetup_participant_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  -- INSERT 면 NEW.post_id, DELETE 면 OLD.post_id, UPDATE 는 양쪽 다.
  -- UPDATE 가 post_id 를 옮길 일은 없지만 방어적으로 양쪽 갱신.
  if (tg_op = 'INSERT') then
    target := new.post_id;
  elsif (tg_op = 'DELETE') then
    target := old.post_id;
  else
    target := new.post_id;
    if old.post_id is distinct from new.post_id then
      update posts set participant_count = (
        select count(*) from meetup_participants
        where post_id = old.post_id and status = 'joined'
      ) where id = old.post_id;
    end if;
  end if;

  update posts set participant_count = (
    select count(*) from meetup_participants
    where post_id = target and status = 'joined'
  ) where id = target;

  return null;
end;
$$;

drop trigger if exists trg_mp_after_insert on meetup_participants;
drop trigger if exists trg_mp_after_update on meetup_participants;
drop trigger if exists trg_mp_after_delete on meetup_participants;

create trigger trg_mp_after_insert
  after insert on meetup_participants
  for each row execute function refresh_meetup_participant_count();

create trigger trg_mp_after_update
  after update on meetup_participants
  for each row execute function refresh_meetup_participant_count();

create trigger trg_mp_after_delete
  after delete on meetup_participants
  for each row execute function refresh_meetup_participant_count();

-- 기존 데이터 백필 (1단계에서 누구도 신청 못 했으니 사실상 0으로 리셋)
update posts p set participant_count = (
  select count(*) from meetup_participants mp
  where mp.post_id = p.id and mp.status = 'joined'
) where post_type = 'meetup';
