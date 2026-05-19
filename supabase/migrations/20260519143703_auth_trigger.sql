-- ============================================================
-- Auth trigger: auto-create profile row on signup
-- Fires after a new row lands in auth.users and inserts the matching
-- public.profiles row with a derived, collision-resistant username.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  email_local  text;
  base_random  text;   -- ≤ 26 chars: leaves room for 4-digit suffix
  base_fallback text;  -- ≤ 22 chars: leaves room for 8-hex UUID suffix
  candidate    text;
  attempts     int := 0;
begin
  -- Strip non-alphanumeric and lowercase the email local part.
  email_local := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]', '', 'g'));
  if char_length(email_local) < 2 then
    email_local := 'user';
  end if;
  base_random   := substr(email_local, 1, 26);
  base_fallback := substr(email_local, 1, 22);

  -- Try up to 5 random 4-digit suffixes.
  loop
    candidate := base_random || lpad(floor(random() * 10000)::int::text, 4, '0');
    begin
      insert into public.profiles (id, username) values (new.id, candidate);
      return new;
    exception when unique_violation then
      attempts := attempts + 1;
      exit when attempts >= 5;
    end;
  end loop;

  -- Fallback: 8 hex chars from a fresh UUID — effectively no collisions.
  candidate := base_fallback || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  insert into public.profiles (id, username) values (new.id, candidate);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
