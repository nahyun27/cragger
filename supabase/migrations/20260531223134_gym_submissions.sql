-- 암장 정보 크라우드소싱: 사용자 제보 → 관리자 승인.
-- 1) profiles.is_admin (관리자 플래그 — 본인 SQL 로 토글)
-- 2) gyms 에 amenity 컬럼 추가
-- 3) gym_submissions 테이블 + RLS + 승인 트리거 (changes JSONB 를 gyms 행에 머지)

-- ─── 1. profiles.is_admin ───────────────────────────────────
alter table profiles
  add column if not exists is_admin boolean not null default false;

-- ─── 2. gyms amenity / 로고 컬럼 ────────────────────────────
alter table gyms
  add column if not exists has_shower  boolean not null default false,
  add column if not exists has_locker  boolean not null default false,
  add column if not exists has_parking boolean not null default false,
  add column if not exists logo_url    text;

-- ─── 3. gym_submissions ────────────────────────────────────
create table gym_submissions (
  id           uuid primary key default gen_random_uuid(),
  gym_id       uuid references gyms(id) on delete cascade,  -- null = 신규 암장 제안 (v1.2)
  submitter_id uuid not null references profiles(id) on delete cascade,
  changes      jsonb not null,                              -- {field: proposed_value} map
  note         text,                                         -- 사용자 자유 설명
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   uuid references profiles(id) on delete set null,
  admin_notes  text
);

create index idx_gym_submissions_pending
  on gym_submissions(created_at desc) where status = 'pending';
create index idx_gym_submissions_submitter
  on gym_submissions(submitter_id, created_at desc);

alter table gym_submissions enable row level security;

-- 본인 INSERT
create policy gs_insert_self on gym_submissions for insert
  with check (submitter_id = auth.uid());

-- 본인 SELECT (내 제보 목록) + 관리자 SELECT (전체)
create policy gs_select_self_or_admin on gym_submissions for select
  using (
    submitter_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

-- 관리자 UPDATE (승인/거절)
create policy gs_update_admin on gym_submissions for update
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

-- ─── 4. 승인 트리거 — changes JSONB 를 gyms 행에 머지 ─────────
create or replace function apply_gym_submission()
returns trigger as $$
begin
  if new.status = 'approved' and old.status <> 'approved' and new.gym_id is not null then
    update gyms set
      city             = coalesce(new.changes->>'city', city),
      district         = coalesce(new.changes->>'district', district),
      address          = coalesce(new.changes->>'address', address),
      size_pyeong      = coalesce((new.changes->>'size_pyeong')::int, size_pyeong),
      floors_count     = coalesce((new.changes->>'floors_count')::int, floors_count),
      opened_at        = coalesce((new.changes->>'opened_at')::date, opened_at),
      description      = coalesce(new.changes->>'description', description),
      parking_info     = coalesce(new.changes->>'parking_info', parking_info),
      phone            = coalesce(new.changes->>'phone', phone),
      website_url      = coalesce(new.changes->>'website_url', website_url),
      instagram_handle = coalesce(new.changes->>'instagram_handle', instagram_handle),
      has_boulder      = coalesce((new.changes->>'has_boulder')::boolean, has_boulder),
      has_lead         = coalesce((new.changes->>'has_lead')::boolean, has_lead),
      has_top_rope     = coalesce((new.changes->>'has_top_rope')::boolean, has_top_rope),
      has_speed        = coalesce((new.changes->>'has_speed')::boolean, has_speed),
      has_auto_belay   = coalesce((new.changes->>'has_auto_belay')::boolean, has_auto_belay),
      has_moonboard    = coalesce((new.changes->>'has_moonboard')::boolean, has_moonboard),
      has_kilter       = coalesce((new.changes->>'has_kilter')::boolean, has_kilter),
      has_tension      = coalesce((new.changes->>'has_tension')::boolean, has_tension),
      has_shower       = coalesce((new.changes->>'has_shower')::boolean, has_shower),
      has_locker       = coalesce((new.changes->>'has_locker')::boolean, has_locker),
      has_parking      = coalesce((new.changes->>'has_parking')::boolean, has_parking),
      logo_url         = coalesce(new.changes->>'logo_url', logo_url),
      updated_at       = now()
    where id = new.gym_id;
  end if;

  -- 승인/거절 시 제보자에게 알림
  if new.status <> old.status and new.status in ('approved', 'rejected') then
    declare
      v_gym_name text;
      v_title text;
      v_body text;
    begin
      select name into v_gym_name from gyms where id = new.gym_id;
      if new.status = 'approved' then
        v_title := '암장 정보 제보가 반영됐어요';
        v_body := coalesce(v_gym_name, '암장') || ' 정보 제보가 승인됐어요. 감사합니다!';
      else
        v_title := '암장 정보 제보가 거절됐어요';
        v_body := coalesce(v_gym_name, '암장') || ' 정보 제보가 거절됐어요.'
          || case when new.admin_notes is not null then ' 사유: ' || new.admin_notes else '' end;
      end if;
      insert into notifications(user_id, type, title, body, link)
      values (
        new.submitter_id,
        'gym_submission_' || new.status,
        v_title,
        v_body,
        case when new.gym_id is not null then '/gym/' || new.gym_id::text else null end
      );
    end;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_apply_gym_submission
  after update of status on gym_submissions
  for each row execute function apply_gym_submission();

-- ─── 5. Storage bucket: gym-logos ───────────────────────────
-- 사용자가 제보 시 임시 업로드. 승인 시 changes.logo_url 이 gyms.logo_url 로 머지.
insert into storage.buckets (id, name, public)
values ('gym-logos', 'gym-logos', true)
on conflict (id) do nothing;

-- 모든 사람 read (public bucket — 정적 자원)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'gym_logos_public_read'
  ) then
    create policy gym_logos_public_read on storage.objects for select
      using (bucket_id = 'gym-logos');
  end if;
end $$;

-- 인증된 사용자만 INSERT
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'gym_logos_auth_insert'
  ) then
    create policy gym_logos_auth_insert on storage.objects for insert
      with check (bucket_id = 'gym-logos' and auth.role() = 'authenticated');
  end if;
end $$;

-- admin 만 DELETE (정리용)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'gym_logos_admin_delete'
  ) then
    create policy gym_logos_admin_delete on storage.objects for delete
      using (
        bucket_id = 'gym-logos'
        and exists (select 1 from profiles where id = auth.uid() and is_admin)
      );
  end if;
end $$;

