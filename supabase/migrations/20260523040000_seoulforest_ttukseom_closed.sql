-- 서울숲클라이밍 뚝섬점 폐업.
-- gym_color_schemes, sessions, problems 등은 FK on delete cascade 로 함께 삭제.
delete from gyms where name = '서울숲클라이밍' and branch = '뚝섬점';
