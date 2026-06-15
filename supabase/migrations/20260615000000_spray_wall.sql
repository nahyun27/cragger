-- 스프레이월 기능
-- 암장별 스프레이월 여부, 사진, 문제(번호+마커 좌표) 관리.

-- 1) 암장에 스프레이월 여부 플래그
alter table gyms
  add column if not exists has_spray_wall boolean not null default false;

-- 2) 스프레이월 사진 (암장당 N장)
create table if not exists spray_wall_photos (
  id            uuid primary key default gen_random_uuid(),
  gym_id        uuid not null references gyms(id) on delete cascade,
  photo_url     text not null,
  display_order integer not null default 0,
  uploaded_by   uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists spray_wall_photos_gym_id_idx on spray_wall_photos(gym_id, display_order);

-- 3) 스프레이월 문제 (사진 위 번호 마커)
create table if not exists spray_wall_problems (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references gyms(id) on delete cascade,
  photo_id    uuid references spray_wall_photos(id) on delete cascade,
  created_by  uuid references profiles(id) on delete set null,
  number      integer not null,          -- 문제 번호 (암장 내 유일)
  description text,                      -- 설명 (선택)
  marker_x    numeric(5,2) not null,     -- 0~100, 사진 가로 %
  marker_y    numeric(5,2) not null,     -- 0~100, 사진 세로 %
  created_at  timestamptz not null default now(),
  constraint spray_wall_problems_gym_number_unique unique (gym_id, number)
);

create index if not exists spray_wall_problems_photo_id_idx on spray_wall_problems(photo_id);
create index if not exists spray_wall_problems_gym_id_idx   on spray_wall_problems(gym_id, number);

-- 4) RLS
alter table spray_wall_photos   enable row level security;
alter table spray_wall_problems enable row level security;

-- 사진: 모두 읽기, 로그인 사용자 추가, 본인만 삭제
create policy "spray_wall_photos_select"
  on spray_wall_photos for select using (true);

create policy "spray_wall_photos_insert"
  on spray_wall_photos for insert
  with check (auth.uid() = uploaded_by);

create policy "spray_wall_photos_delete"
  on spray_wall_photos for delete
  using (auth.uid() = uploaded_by);

-- 문제: 모두 읽기, 로그인 사용자 추가, 본인만 삭제
create policy "spray_wall_problems_select"
  on spray_wall_problems for select using (true);

create policy "spray_wall_problems_insert"
  on spray_wall_problems for insert
  with check (auth.uid() = created_by);

create policy "spray_wall_problems_delete"
  on spray_wall_problems for delete
  using (auth.uid() = created_by);
