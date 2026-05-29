-- 크루에 주요 활동지역 (시/도 단일 선택) 추가.

alter table crews
  add column region text;  -- '서울' | '경기' | '부산' | ... 17 광역시·도. null 허용.

alter table crews
  add constraint crews_region_check check (
    region is null or region in (
      '서울','경기','인천','강원','충북','충남','대전','세종',
      '전북','전남','광주','경북','경남','대구','울산','부산','제주'
    )
  );
