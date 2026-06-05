-- sessions 에 membership_id 추가 + 다회권 자동 차감/환불 트리거.
--
-- 사용자가 세션 기록 시 사용한 회원권을 연결할 수 있게 한다.
-- 'passes' 타입 회원권일 경우 자동으로 used_passes 가 증가/감소된다.
--
-- INSERT NEW.membership_id (passes)         → +1
-- UPDATE OLD→NEW 가 바뀐 경우 양쪽 처리       → 환불 -1 / 청구 +1
-- DELETE OLD.membership_id (passes)         → -1

alter table sessions
  add column if not exists membership_id uuid references memberships(id) on delete set null;

create index if not exists idx_sessions_membership on sessions(membership_id);

create or replace function sync_membership_passes()
returns trigger as $$
declare
  v_type text;
begin
  if (TG_OP = 'DELETE' or TG_OP = 'UPDATE') and OLD.membership_id is not null then
    if TG_OP = 'DELETE' or OLD.membership_id is distinct from NEW.membership_id then
      select membership_type into v_type from memberships where id = OLD.membership_id;
      if v_type = 'passes' then
        update memberships
          set used_passes = greatest(used_passes - 1, 0)
          where id = OLD.membership_id;
      end if;
    end if;
  end if;

  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') and NEW.membership_id is not null then
    if TG_OP = 'INSERT' or OLD.membership_id is distinct from NEW.membership_id then
      select membership_type into v_type from memberships where id = NEW.membership_id;
      if v_type = 'passes' then
        update memberships
          set used_passes = used_passes + 1
          where id = NEW.membership_id;
      end if;
    end if;
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_membership_passes on sessions;
create trigger trg_sync_membership_passes
  after insert or update or delete on sessions
  for each row execute function sync_membership_passes();
