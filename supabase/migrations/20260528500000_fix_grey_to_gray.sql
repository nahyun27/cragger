-- gym_color_schemes 의 'grey' (영국식) → 'gray' (미국식) 통일.
-- 앱 코드는 'gray' 를 표준으로 사용 (GRID_COLORS, climb-colors).
-- 시드 일부가 'grey' 로 들어가서 회색 라벨/매핑이 분리되는 버그 수정.

-- 유일성 충돌 회피: 만약 한 gym 에 'gray' 와 'grey' 가 모두 있다면 'grey' 행 삭제
delete from gym_color_schemes a
using gym_color_schemes b
where a.gym_id = b.gym_id
  and a.color = 'grey'
  and b.color = 'gray';

-- 나머지 'grey' → 'gray'
update gym_color_schemes set color = 'gray' where color = 'grey';

-- 후속 시드들도 항상 'gray' 쓰도록 migrations 코드 정리는 별도 커밋에서.
