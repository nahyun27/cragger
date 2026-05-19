-- ============================================================
-- Seed: 수도권 암장 21곳
-- 출처: 스피릿 블로그 "원정클 지도 - 수도권 편" (2년 전 작성)
-- 위경도는 추후 카카오 places API 등으로 보강 필요
-- ============================================================

insert into gyms (name, branch, city, district, size_pyeong, opened_at, floors_count,
                  has_boulder, has_lead, has_top_rope, has_speed, has_auto_belay,
                  has_moonboard, has_kilter, has_tension,
                  facilities, description) values

-- ─── 서울 ───────────────────────────────────────────────
('클라이밍 파크', '성수점', '서울', '성동구', 500, '2023-06-29', 4,
 true, false, false, false, false, false, false, false,
 '{}',
 '한 건물 4개 층 통째로 사용. 층마다 다른 구조.'),

('더클라임', '문래점', '서울', '영등포구', 430, '2024-06-28', 2,
 true, false, false, false, false, false, false, false,
 '{}',
 '창이 많아 채광 좋음. 회색 볼륨 홀드는 모든 문제에 사용 가능.'),

('더클라임', '양재점', '서울', '서초구', 407, '2020-09-28', 1,
 true, false, false, false, false, false, false, false,
 '{}',
 '지하 단층. 서울 최대 단층 암장 중 하나.'),

('더클라임', '연남점', '서울', '마포구', 400, '2022-05-04', 1,
 true, false, false, false, false, false, false, false,
 '{}',
 '지상 통창. 채광 좋고 접근성 우수.'),

('더클라임', '신림점', '서울', '관악구', 380, '2022-02-19', 1,
 true, false, false, false, false, false, false, false,
 '{}',
 '도림천 뷰. 통창으로 보는 석양이 좋음.'),

('서울숲 클라이밍', '구로점', '서울', '구로구', 360, '2023-08-24', 1,
 true, false, false, false, false, false, false, false,
 '{}',
 '지하지만 통유리. 서울숲 클라이밍 최대 규모.'),

('알레클라이밍', '강동점', '서울', '강동구', 350, '2023-06-24', 1,
 true, false, false, false, false, false, false, false,
 '{}',
 '뛰뛰(다이나믹) 문제 많음. 알레 최대 지점.'),

-- ─── 경기 남부 ──────────────────────────────────────────
('킨디 클라이밍', 'KIN:D', '수원', '영통구', 630, '2024-10-22', 1,
 true, false, false, false, false, true, true, false,
 '{}',
 '전국 최대 볼더링 암장. 문보드+킬터보드 보유.'),

('캐치스톤클라이밍짐', null, '부천', '원미구', 300, '2022-03-11', 1,
 true, false, false, false, false, false, false, false,
 '{"cave", "endurance_wall"}',
 '18층 위치, 뷰가 좋음. 컴피벽과 케이브 보유.'),

('클라임바운스', '수원점', '수원', '영통구', 200, '2020-07-27', 2,
 true, false, false, false, false, false, true, false,
 '{}',
 '판타지움 쇼핑몰 내. 층고 15m. 킬터보드 보유.'),

('마운틴그라운드 클라이밍', null, '화성', '동탄', 200, '2023-08-05', 1,
 true, true, false, false, false, false, false, false,
 '{}',
 '동탄 호수공원 근처. 짧은 리드벽 보유. 수건 제공 샤워실.'),

('에픽클라임', null, '용인', null, 200, '2021-06-01', 1,
 true, false, false, false, false, false, false, false,
 '{}',
 '4층 위치, 채광 좋음. 초보용 루키존 있음.'),

('볼더메이트 클라이밍', '기흥점', '용인', '기흥구', 170, '2022-04-29', 1,
 true, false, false, false, false, false, false, false,
 '{}',
 '아일랜드 형태 벽 보유. 흰색벽+초록 잔디 인테리어.'),

('그래비티 클라이밍', '영통구청점', '수원', '영통구', null, '2022-06-15', 1,
 true, false, false, false, false, false, false, false,
 '{"endurance_wall"}',
 '벽 구조 효율적, 지구력벽 넓음. 두 면 통창.'),

-- ─── 경기 북부 ──────────────────────────────────────────
('더클라임', '일산점', '고양', '일산서구', 484, '2019-07-01', 1,
 true, false, false, false, false, false, false, false,
 '{}',
 '오랜기간 수도권 최대 암장이었음. TCBC 대회 진행. 거대 컴피벽.'),

('클라이밍 하이프렉스', null, '고양', null, 350, '2023-02-15', 2,
 true, true, false, false, false, false, false, false,
 '{"ice_wall"}',
 '중앙 2개 아일랜드 위로 연결된 길 구조. 리드+아이스클라이밍 가능.'),

('코알라클라이밍', '킨텍스점', '고양', '일산서구', 350, '2024-07-05', 1,
 true, false, false, false, false, false, false, false,
 '{}',
 '코알라클라이밍 2호점. 쉬워보이지만 쉽지 않음.'),

('페퍼클라이밍', null, '고양', null, 190, '2024-02-03', 1,
 true, false, false, false, false, false, false, false,
 '{}',
 '고양스타필드 근처. 인테리어 깔끔하고 문제수 많음.'),

-- ─── 인천 ───────────────────────────────────────────────
('디스커버리클라이밍', '클라임스퀘어 ICN', '인천', null, 500, '2015-08-01', 2,
 true, true, true, true, false, false, false, false,
 '{}',
 '국내 최대 규모 종합 클라이밍 센터. 리드/탑로프/볼더링/스피드 전 종목. 층고 높음.'),

('비블럭 클라이밍', '송도점', '인천', '연수구', 250, '2023-05-13', 1,
 true, false, false, false, false, false, false, false,
 '{}',
 '챌린지한 문제 많음. 천종원/천예준 선수 등장.'),

('클라이밍줌', null, '인천', '연수구', 250, '2020-10-09', 1,
 true, false, false, false, true, true, true, false,
 '{"spray_wall"}',
 '문보드+킬터보드 보유. 스프레이월에 오토빌레이 있음.');
