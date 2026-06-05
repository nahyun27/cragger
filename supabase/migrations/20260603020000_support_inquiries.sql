-- 고객센터/문의하기 — 사용자가 보낸 문의 + 관리자 답변
--
-- 사용자: 본인 문의만 조회/작성/취소
-- 관리자: 전체 조회 + status / admin_response 수정
-- 이메일은 옵셔널 (계정 메일 외에 답변받을 곳 따로 적고 싶을 때)

create type support_category as enum (
  'general',     -- 일반 문의
  'bug',         -- 버그 신고
  'feature',     -- 기능 제안
  'account',     -- 계정/로그인
  'gym_data',    -- 암장 데이터 오류
  'other'        -- 기타
);

create type support_status as enum (
  'open',         -- 새 문의 (관리자 미확인)
  'in_progress',  -- 확인됨, 처리 중
  'resolved',     -- 답변 완료
  'cancelled'     -- 사용자 취소
);

create table support_inquiries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  category      support_category not null default 'general',
  subject       text not null check (char_length(subject) between 1 and 100),
  body          text not null check (char_length(body) between 1 and 2000),
  contact_email text,
  status        support_status not null default 'open',
  admin_response text,
  responded_by  uuid references profiles(id) on delete set null,
  responded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index support_inquiries_user_idx on support_inquiries (user_id, created_at desc);
create index support_inquiries_status_idx on support_inquiries (status, created_at desc);

-- updated_at 트리거
create or replace function support_inquiries_touch_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

create trigger support_inquiries_touch
before update on support_inquiries
for each row execute function support_inquiries_touch_updated();

-- 관리자 응답이 추가/수정되면 responded_at 자동 기록
create or replace function support_inquiries_track_response()
returns trigger language plpgsql as $$
begin
  if new.admin_response is distinct from old.admin_response then
    new.responded_at = now();
  end if;
  return new;
end$$;

create trigger support_inquiries_response_at
before update on support_inquiries
for each row execute function support_inquiries_track_response();

alter table support_inquiries enable row level security;

-- 본인 문의 조회
create policy support_inquiries_select_own
on support_inquiries for select
using (auth.uid() = user_id);

-- 관리자 전체 조회
create policy support_inquiries_select_admin
on support_inquiries for select
using (
  exists (
    select 1 from admins where admins.user_id = auth.uid()
  )
);

-- 본인 문의 작성
create policy support_inquiries_insert_own
on support_inquiries for insert
with check (auth.uid() = user_id);

-- 본인이 취소(cancelled) 만 가능 — 다른 필드는 못 바꿈
create policy support_inquiries_update_own_cancel
on support_inquiries for update
using (auth.uid() = user_id and status = 'open')
with check (
  auth.uid() = user_id
  and status in ('open', 'cancelled')
  and admin_response is not distinct from (select admin_response from support_inquiries where id = support_inquiries.id)
);

-- 관리자 상태/응답 수정
create policy support_inquiries_update_admin
on support_inquiries for update
using (
  exists (
    select 1 from admins where admins.user_id = auth.uid()
  )
);
