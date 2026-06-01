-- 대표 뱃지 — 사용자가 선택한 뱃지를 다른 화면에서도 이름 옆에 노출.
-- profiles.featured_badge_key text (badges 정의는 코드 상수이므로 FK 없음).
-- profiles_update_self 정책이 이미 있어서 본인이 갱신 가능.

alter table profiles
  add column if not exists featured_badge_key text;
