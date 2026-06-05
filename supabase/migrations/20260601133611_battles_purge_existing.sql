-- 기존 대결 데이터 초기화 — 새 스키마 (color_grades, score_visibility) 도입 전에 만든
-- 레코드는 호환 데이터가 없어서 깔끔히 비우고 새로 시작.
-- battle_participants 는 FK CASCADE 로 함께 제거된다.

delete from battles;
