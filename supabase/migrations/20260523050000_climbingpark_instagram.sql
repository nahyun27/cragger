-- 클라이밍파크 3개 지점 instagram_handle 등록.
-- 사용자 제공 캡처 기준 (성수·신논현·강남만 인스타 공개).

update gyms set instagram_handle = 'climbing_park_seongsu'     where name = '클라이밍파크' and branch = '성수점';
update gyms set instagram_handle = 'climbing_park_shinnonhyun' where name = '클라이밍파크' and branch = '신논현점';
update gyms set instagram_handle = 'climbing_park_gangnam'     where name = '클라이밍파크' and branch = '강남점';
