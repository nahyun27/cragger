-- 대결 점수 공개 설정 — 호스트가 선택.
--
-- 'live'      : 진행 중 실시간 점수 공개 (기본, 현재 동작)
-- 'after_end' : 종료 전까지 점수 숨김 → 종료 시 공개 (서프라이즈)
--
-- 클라이언트가 ranking 자체를 가져오는 건 막지 않는다.
-- UI 에서 status != 'ended' && score_visibility == 'after_end' 일 때 숨김.

alter table battles
  add column if not exists score_visibility text not null default 'live'
  check (score_visibility in ('live', 'after_end'));
