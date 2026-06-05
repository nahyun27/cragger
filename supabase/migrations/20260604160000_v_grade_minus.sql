-- V그레이드 표기에 `-` 접미사 추가 지원.
-- 예: 'V3-' → 2.5, 'V3' → 3, 'V3+' → 3.5
--
-- 기존 정규식은 ^V\d+\+?$ 로 + 만 허용 → ^V\d+[+-]?$ 로 확장.

create or replace function v_grade_to_num(grade text)
returns numeric language sql immutable as $$
  select case
    when grade ~ '^V\d+[+-]?$' then
      (regexp_replace(grade, '^V(\d+)[+-]?$', '\1'))::numeric
      + case
          when grade like '%+' then 0.5
          when grade like '%-' then -0.5
          else 0
        end
    else null
  end;
$$;

-- num_to_v_grade 는 그대로 (반올림 결과를 base/+ 두 형태로만 표시).
-- 통계에서는 + 가 평균을 끌어올리고 - 가 끌어내리는 식으로 자연스럽게 반영.
