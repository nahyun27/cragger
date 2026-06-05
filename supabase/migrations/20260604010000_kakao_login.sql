-- 카카오 로그인 — profiles 에 카카오 고유 ID 매핑
--
-- 카카오 access_token 으로 Edge Function 에서 사용자 정보를 조회한 뒤
-- (1) kakao_id 로 기존 사용자 찾기 → 있으면 그 user_id 로 세션 발급
-- (2) 없으면 supabase.auth.admin.createUser() 로 새로 만들고
--     profiles 에 kakao_id, username, avatar 등 prefill
--
-- 이메일 충돌(같은 이메일로 이미 가입된 경우) 은 클라이언트에 알려서
-- "이미 이메일로 가입한 계정이에요. 이메일로 로그인 후 연동해주세요" 안내.

alter table profiles
  add column if not exists kakao_id text;

create unique index if not exists profiles_kakao_id_unique_idx
  on profiles (kakao_id)
  where kakao_id is not null;

comment on column profiles.kakao_id is
  '카카오 회원 ID (https://developers.kakao.com — /v2/user/me 의 id 필드). 카카오로 가입한 사용자만 값 있음.';
