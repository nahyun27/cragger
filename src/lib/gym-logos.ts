import type { ImageSourcePropType } from 'react-native';

// 브랜드 로고 매핑.
// 키 = gym.name 에 substring 으로 들어있을 brand 식별자 (지점명 제외).
// 값 = require()로 정적 import된 PNG. metro가 빌드 타임에 번들에 포함.
//
// 추가 방법:
//   1) assets/gym-logos/<brand>.png 로 파일 넣기
//   2) 아래 GYM_LOGOS 에 한 줄 추가
//   3) 같은 브랜드의 모든 지점이 같은 로고 사용 (예: 더클라임 강남점·홍대점)
//
// 매칭 우선순위: 키 길이 긴 것부터 — '더클라임 B' 가 '더클라임' 보다 먼저
// 평가되어야 의도대로 분기 가능.
//
// 서울숲은 단색(흰색) 로고 + 지점별 배경색으로 통일감 부여 (네이버 검색
// 결과의 brand 운영 방식 재현). 다른 brand 는 단일 로고만.
export const GYM_LOGOS: Record<string, ImageSourcePropType> = {
  '그루트':       require('../../assets/gym-logos/그루트.png'),
  '더플라스틱':   require('../../assets/gym-logos/더플라스틱.png'),
  // 더클라임은 지점별 배경색 — 흰 로고 사용
  '더클라임':     require('../../assets/gym-logos/더클라임-white.png'),
  '닷클라이밍':   require('../../assets/gym-logos/닷클라이밍짐.png'),
  '드림캐처':     require('../../assets/gym-logos/드림캐쳐.png'),
  '락랜드':       require('../../assets/gym-logos/락랜드.png'),
  '레드원':       require('../../assets/gym-logos/레드원.png'),
  '볼더가든':     require('../../assets/gym-logos/볼더가든.png'),
  '볼더프렌즈':   require('../../assets/gym-logos/볼더프렌즈.png'),
  '브릭스':       require('../../assets/gym-logos/브릭스.png'),
  '캐치스톤':     require('../../assets/gym-logos/캐치스톤.png'),
  '서울볼더스':   require('../../assets/gym-logos/서울볼더스.png'),
  '서울숲':       require('../../assets/gym-logos/서울숲-white.png'),
  '손상원':       require('../../assets/gym-logos/손상원-white.png'),
  '슈퍼비':       require('../../assets/gym-logos/슈퍼비.png'),
  '스파이시':     require('../../assets/gym-logos/스파이시.png'),
  '어거스트':     require('../../assets/gym-logos/어거스트.png'),
  '오프더월':     require('../../assets/gym-logos/오프더월.png'),
  '온플릭':       require('../../assets/gym-logos/온플릭.png'),
  '클라이밍줌':   require('../../assets/gym-logos/클라이밍줌.png'),
  '클라이밍파크': require('../../assets/gym-logos/클라이밍파크-white.png'),
  '클라임어스':   require('../../assets/gym-logos/클라임어스.png'),
  '클라임잇':     require('../../assets/gym-logos/클라임잇.png'),
  '클라임투게더': require('../../assets/gym-logos/클라임투게더.png'),
  '클라임투더문': require('../../assets/gym-logos/클라임투더문.png'),
  '클럽클라이밍': require('../../assets/gym-logos/클럽클라이밍.png'),
  '킨디':         require('../../assets/gym-logos/킨디클라이밍.png'),
  '원더월':       require('../../assets/gym-logos/원더월.png'),
  '웨이브락':     require('../../assets/gym-logos/웨이브락-white.png'),
  '피크닉':       require('../../assets/gym-logos/피크닉.png'),
  '플래시볼더스': require('../../assets/gym-logos/플래시볼더스.png'),
  '피커스':       require('../../assets/gym-logos/피커스.png'),
  '허브':         require('../../assets/gym-logos/허브.png'),
  '훅클라이밍':   require('../../assets/gym-logos/훅클라이밍.png'),
};

// (brand key) → (branch → background hex). 매핑 없으면 흰 카드 그대로.
// brand 자체에 단일 배경색 — 지점 무관. (지점별 매핑은 GYM_BG_BY_BRANCH 가
// 우선이고, 거기 매칭 없으면 fallback 으로 여기를 봄.)
export const GYM_BG_DEFAULT: Record<string, string> = {
  '킨디':       '#251818',
  '스파이시':   '#1a1a1a',
  '더플라스틱': '#000000',  // brand 의 검정 + 주황 톤
  '피커스':     '#F1F2EE',  // 로고 원본 베이지 — 누끼 X
  '클라임잇':   '#323384',  // 로고 원본 남보라
  '원더월':     '#1a1a1a',  // 검정 brand 배경 (흰 로고)
  '클럽클라이밍': '#F2EEE5', // 로고 원본 베이지 — 누끼 X
};

export const GYM_BG_BY_BRANCH: Record<string, Record<string, string>> = {
  '서울숲': {
    '구로점':   '#9333EA',  // 보라
    '영등포점': '#F97316',  // 주황
    '종로점':   '#0EA5E9',  // 하늘
    '잠실점':   '#EC4899',  // 분홍
  },
  // 클라임투게더 2개 지점 — 진한 톤
  '클라임투게더': {
    '수원점': '#1E3A8A',  // 진한 남색
    '원주점': '#14532D',  // 진한 초록
  },
  // 웨이브락 3개 지점 — 네이버 검색 결과 카드 배경색 기반
  '웨이브락': {
    '남천점':   '#1a1a1a',  // 검정
    '부산대점': '#3D7DE5',  // 파랑
    '서면점':   '#4F9E3F',  // 초록
  },
  // 손상원 3개 지점 — 인스타 프로필 배경색 기반
  '손상원': {
    '강남역점': '#3D3FAA',  // 파랑/indigo
    '을지로점': '#6B7F40',  // 올리브 그린
    '판교점':   '#E63D2E',  // 빨강
  },
  // 클라이밍파크 5개 지점 — linktree thumbnail 색 기반
  '클라이밍파크': {
    '강남점':   '#C44A3F',  // 빨강
    '성수점':   '#3F8FCB',  // 파랑
    '신논현점': '#2D5F3D',  // 짙은 녹색
    '종로점':   '#F08AB4',  // 분홍
    '한티점':   '#F2B23B',  // 머스타드
  },
  // 더클라임 12개 지점 — 인스타 프로필 테두리 색 기반
  '더클라임': {
    '강남점':   '#DC2626',  // 빨강
    '논현점':   '#84A52A',  // 올리브
    '마곡점':   '#6D28D9',  // 보라
    '문래점':   '#78350F',  // 갈색
    '사당점':   '#14B8A6',  // teal
    '성수점':   '#14532D',  // 짙은 녹색
    '신림점':   '#2563EB',  // 파랑
    '신사점':   '#9F1239',  // 와인
    '양재점':   '#B45309',  // 금색
    '연남점':   '#93C5FD',  // 옅은 파랑
    '이수점':   '#B45309',  // 금색
    '일산점':   '#111827',  // 검정
  },
};

export type GymVisualStyle = {
  logo: ImageSourcePropType | null;
  bg: string | null;
};

export function matchGymStyle(name: string, branch?: string | null): GymVisualStyle {
  const trimmed = name.trim();
  if (!trimmed) return { logo: null, bg: null };
  // 더 긴 키부터 — substring 모호성 방지
  const keys = Object.keys(GYM_LOGOS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (!trimmed.includes(key)) continue;
    const branchMap = GYM_BG_BY_BRANCH[key];
    const branchBg = branchMap && branch && branchMap[branch] ? branchMap[branch] : null;
    const bg = branchBg ?? GYM_BG_DEFAULT[key] ?? null;
    return { logo: GYM_LOGOS[key], bg };
  }
  return { logo: null, bg: null };
}

// 하위호환 — 이름만으로 로고 찾기 (배경 무시).
export function matchGymLogo(gymName: string): ImageSourcePropType | null {
  return matchGymStyle(gymName).logo;
}
