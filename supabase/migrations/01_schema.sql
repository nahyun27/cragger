-- ============================================================
-- Climbing App Schema (Supabase / Postgres)
-- MVP + follows 테이블 (UI는 v1.1)
-- ============================================================

-- 필요한 확장
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ============================================================
-- ENUMS
-- ============================================================

create type climbing_type as enum ('boulder', 'lead', 'board');
create type attempt_result as enum ('onsight', 'flash', 'send', 'project', 'fall');
create type lead_style as enum ('lead', 'top_rope');
create type board_type as enum ('moonboard', 'kilter', 'tension');
create type membership_type as enum ('monthly', 'period', 'passes', 'single');
create type wall_angle as enum ('slab', 'vertical', 'overhang', 'roof', 'arete', 'dihedral');

-- ============================================================
-- PROFILES (Supabase auth.users 확장)
-- ============================================================

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null check (char_length(username) between 2 and 30),
  display_name text,
  avatar_url   text,
  bio          text,
  instagram_handle text,  -- 외부 링크용 (e.g. "@beckyclimb")
  home_gym_id  uuid,      -- FK는 gyms 생성 후 추가
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- GYMS
-- ============================================================

create table gyms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,             -- '더클라임'
  branch        text,                       -- '문래점'
  city          text not null,              -- '서울'
  district      text,                       -- '영등포구'
  address       text,
  latitude      double precision,
  longitude     double precision,

  -- 규모/연식
  size_pyeong   int,                        -- 평수 (KR 단위)
  floors_count  int default 1,
  opened_at     date,

  -- 시설 메타데이터
  parking_info  text,                       -- '건물 지하 2시간 무료' 같은 자유서식
  phone         text,
  website_url   text,
  instagram_handle text,
  description   text,

  -- 종목 보유 (자주 필터링되니까 boolean)
  has_boulder    boolean not null default true,
  has_lead       boolean not null default false,
  has_top_rope   boolean not null default false,
  has_speed      boolean not null default false,
  has_auto_belay boolean not null default false,
  has_moonboard  boolean not null default false,
  has_kilter     boolean not null default false,
  has_tension    boolean not null default false,

  -- 트레이닝 시설 array
  -- 가능값: 'spray_wall' | 'campus_board' | 'hangboard' | 'system_wall' | 'endurance_wall' | 'cave' | 'ice_wall'
  facilities    text[] not null default '{}',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_gyms_city on gyms(city);
create index idx_gyms_location on gyms(latitude, longitude);

-- profiles.home_gym_id FK (forward reference 해소)
alter table profiles
  add constraint fk_profiles_home_gym
  foreign key (home_gym_id) references gyms(id) on delete set null;

-- ============================================================
-- GYM_COLOR_SCHEMES (암장별 색깔 체계)
-- ============================================================

create table gym_color_schemes (
  id              uuid primary key default gen_random_uuid(),
  gym_id          uuid not null references gyms(id) on delete cascade,
  color           text not null,           -- 'red', 'yellow', 'green', 'pink', 'black' ...
  color_hex       text,                     -- '#E24B4A' (UI 표시용)
  order_index     int not null,             -- 난이도 순서 (낮을수록 쉬움)
  official_label  text,                     -- '5급', 'V3-V4' 등 암장 공식 표기
  unique (gym_id, color),
  unique (gym_id, order_index)
);

create index idx_color_schemes_gym on gym_color_schemes(gym_id);

-- ============================================================
-- GYM_PRICES (요금)
-- ============================================================

create table gym_prices (
  id            uuid primary key default gen_random_uuid(),
  gym_id        uuid not null references gyms(id) on delete cascade,
  product_type  membership_type not null,
  name          text not null,              -- '1일권', '월 회원권', '10회권', '학생 1일권'
  price_krw     int not null,
  duration_days int,                         -- period/monthly 용
  total_passes  int,                         -- passes 용
  is_student    boolean not null default false,
  notes         text,
  created_at    timestamptz not null default now()
);

create index idx_gym_prices_gym on gym_prices(gym_id);

-- ============================================================
-- SESSIONS (운동 세션 컨테이너)
-- ============================================================

create table sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  gym_id        uuid references gyms(id) on delete set null,  -- 보드만 한 경우 NULL 가능
  session_date  date not null,
  duration_min  int,
  notes         text,
  created_at    timestamptz not null default now()
);

create index idx_sessions_user_date on sessions(user_id, session_date desc);

-- ============================================================
-- PROBLEMS (암장 문제, 일회성 / 세팅마다 갱신)
-- ============================================================

create table problems (
  id            uuid primary key default gen_random_uuid(),
  gym_id        uuid not null references gyms(id) on delete cascade,
  color         text not null,
  setting_date  date,                       -- 세팅일 (모르면 NULL)
  wall_angle    wall_angle,
  photo_url     text,
  description   text,                       -- 위치 메모 '입구 들어가서 왼쪽 두번째' 등
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index idx_problems_gym_color on problems(gym_id, color);
create index idx_problems_setting_date on problems(setting_date desc);

-- ============================================================
-- BOARD_PROBLEMS (문보드/킬터/텐션, 영구)
-- ============================================================

create table board_problems (
  id              uuid primary key default gen_random_uuid(),
  board_type      board_type not null,
  external_id     text,                     -- 공식 앱의 problem ID (있으면)
  name            text not null,
  setter          text,
  official_grade  text not null,            -- 'V4', 'V5+'
  angle           int not null,              -- 40, 45, 50, 70 도
  description     text,
  created_at      timestamptz not null default now(),
  unique (board_type, external_id)
);

-- ============================================================
-- ATTEMPTS (개별 시도/완등 기록)
-- ============================================================

create table attempts (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references sessions(id) on delete cascade,
  climbing_type     climbing_type not null,

  -- 정확히 둘 중 하나만 채워짐 (아래 CHECK 제약)
  problem_id        uuid references problems(id) on delete set null,
  board_problem_id  uuid references board_problems(id) on delete set null,

  -- 결과
  result            attempt_result not null,
  tries             int not null default 1,

  -- 체감 그레이드 (크라우드 그레이딩 데이터 소스)
  felt_grade        text,                   -- 'V3', 'V4+'

  -- 리드 전용
  lead_style        lead_style,
  fall_height_pct   int,                    -- 폴 지점 (%, 0~100)

  notes             text,
  created_at        timestamptz not null default now(),

  constraint exactly_one_problem check (
    (climbing_type = 'board' and board_problem_id is not null and problem_id is null)
    or (climbing_type in ('boulder', 'lead') and problem_id is not null and board_problem_id is null)
  ),
  constraint lead_fields_only_for_lead check (
    (climbing_type = 'lead') or (lead_style is null and fall_height_pct is null)
  )
);

create index idx_attempts_session on attempts(session_id);
create index idx_attempts_problem on attempts(problem_id) where problem_id is not null;
create index idx_attempts_board_problem on attempts(board_problem_id) where board_problem_id is not null;

-- ============================================================
-- MEMBERSHIPS (회원권/월권/다회권)
-- ============================================================

create table memberships (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  gym_id          uuid not null references gyms(id) on delete cascade,
  membership_type membership_type not null,
  start_date      date not null,
  end_date        date,
  total_passes    int,
  used_passes     int not null default 0,
  price_krw       int,
  notes           text,
  created_at      timestamptz not null default now(),
  check (used_passes >= 0),
  check (total_passes is null or used_passes <= total_passes)
);

create index idx_memberships_user on memberships(user_id);

-- ============================================================
-- FOLLOWS (UI는 v1.1, 스키마는 미리)
-- ============================================================

create table follows (
  follower_id   uuid not null references profiles(id) on delete cascade,
  followee_id   uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index idx_follows_followee on follows(followee_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- 'V3', 'V4+' → numeric (V4+ = 4.5, V3 = 3.0). 잘못된 값은 NULL.
create or replace function v_grade_to_num(grade text)
returns numeric language sql immutable as $$
  select case
    when grade ~ '^V\d+\+?$' then
      (regexp_replace(grade, '^V(\d+)\+?$', '\1'))::numeric
      + case when grade like '%+' then 0.5 else 0 end
    else null
  end;
$$;

-- 'V3.5' → 'V3+' (역변환, 표시용)
create or replace function num_to_v_grade(n numeric)
returns text language sql immutable as $$
  select 'V' || floor(n)::int || case when (n - floor(n)) >= 0.5 then '+' else '' end;
$$;

-- updated_at 자동 갱신
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger gyms_updated_at before update on gyms
  for each row execute function set_updated_at();

-- ============================================================
-- VIEWS (크라우드 그레이딩 집계)
-- ============================================================

-- 암장×색깔 체감 그레이드 통계 (최근 6개월 세팅만)
create or replace view gym_color_grade_stats as
select
  p.gym_id,
  p.color,
  count(a.id) filter (where a.felt_grade is not null) as vote_count,
  round(avg(v_grade_to_num(a.felt_grade)), 1) as avg_v_grade,
  percentile_cont(0.5) within group (order by v_grade_to_num(a.felt_grade))
    filter (where a.felt_grade is not null) as median_v_grade,
  num_to_v_grade(round(avg(v_grade_to_num(a.felt_grade)), 1)) as avg_v_grade_label
from problems p
left join attempts a on a.problem_id = p.id
where p.setting_date is null
   or p.setting_date >= current_date - interval '6 months'
group by p.gym_id, p.color
having count(a.id) filter (where a.felt_grade is not null) > 0;

-- 개인 통계: 유저별 월간 V그레이드 분포
create or replace view user_monthly_stats as
select
  s.user_id,
  date_trunc('month', s.session_date)::date as month,
  count(*) filter (where a.result in ('onsight','flash','send')) as sends,
  count(*) filter (where a.result = 'project') as projects,
  count(*) filter (where a.result = 'fall') as falls,
  max(v_grade_to_num(a.felt_grade))
    filter (where a.result in ('onsight','flash','send')) as max_send_v
from sessions s
join attempts a on a.session_id = s.id
group by s.user_id, date_trunc('month', s.session_date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles            enable row level security;
alter table gyms                enable row level security;
alter table gym_color_schemes   enable row level security;
alter table gym_prices          enable row level security;
alter table sessions            enable row level security;
alter table problems            enable row level security;
alter table board_problems      enable row level security;
alter table attempts            enable row level security;
alter table memberships         enable row level security;
alter table follows             enable row level security;

-- Profiles: 모두 읽기 가능, 본인만 수정
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_insert_self" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_self" on profiles for update using (auth.uid() = id);

-- Gyms / 색깔체계 / 요금: 모두 읽기, 인증 유저 추가/수정 (커뮤니티 기반)
create policy "gyms_select_all" on gyms for select using (true);
create policy "gyms_insert_auth" on gyms for insert with check (auth.role() = 'authenticated');
create policy "gyms_update_auth" on gyms for update using (auth.role() = 'authenticated');

create policy "color_schemes_select_all" on gym_color_schemes for select using (true);
create policy "color_schemes_write_auth" on gym_color_schemes for all using (auth.role() = 'authenticated');

create policy "prices_select_all" on gym_prices for select using (true);
create policy "prices_write_auth" on gym_prices for all using (auth.role() = 'authenticated');

-- Problems: 모두 읽기 (커뮤니티 데이터), 작성자만 수정
create policy "problems_select_all" on problems for select using (true);
create policy "problems_insert_self" on problems for insert
  with check (auth.role() = 'authenticated' and auth.uid() = created_by);
create policy "problems_update_creator" on problems for update using (auth.uid() = created_by);

create policy "board_problems_select_all" on board_problems for select using (true);
create policy "board_problems_write_auth" on board_problems for all using (auth.role() = 'authenticated');

-- Sessions: 본인 것만 (v1.1 친구 기능 들어오면 정책 추가)
create policy "sessions_select_self" on sessions for select using (auth.uid() = user_id);
create policy "sessions_write_self" on sessions for all using (auth.uid() = user_id);

-- Attempts: 본인 세션의 것만
create policy "attempts_select_self" on attempts for select using (
  exists (select 1 from sessions where sessions.id = attempts.session_id and sessions.user_id = auth.uid())
);
create policy "attempts_write_self" on attempts for all using (
  exists (select 1 from sessions where sessions.id = attempts.session_id and sessions.user_id = auth.uid())
);

-- Memberships: 본인 것만
create policy "memberships_self" on memberships for all using (auth.uid() = user_id);

-- Follows: 모두 읽기 (소셜 그래프 공개), 본인 follower로만 추가/삭제
create policy "follows_select_all" on follows for select using (true);
create policy "follows_insert_self" on follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_self" on follows for delete using (auth.uid() = follower_id);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
