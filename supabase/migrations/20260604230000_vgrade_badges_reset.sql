-- V그레이드 뱃지 기준 변경: "VN 첫 완등" → "V≥N 완등 10개"
-- 기존 first_v* 행을 일괄 삭제. 사용자가 마이페이지 진입 시 새 기준으로 재판정됨.

delete from user_badges
 where badge_key in (
   'first_v0','first_v1','first_v2','first_v3','first_v4',
   'first_v5','first_v6','first_v7','first_v8','first_v9'
 );
