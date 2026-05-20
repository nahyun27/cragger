# Cragger

한국 시장 특화 개인 클라이밍 로그 + 색깔↔V그레이드 크라우드 그레이딩 앱. 1인 출시 목표. (한글 표기: 크래거)

## 핵심 가치 제안

암장마다 색깔 시스템이 다른 게 한국 클라이머의 진짜 페인포인트다. 이 앱은 사용자가 자주 가는 암장의 색깔 체계로 기록하고, 내부적으로는 사용자 투표 데이터로 V그레이드 정규화해서 통계 보여준다. "더클라임 빨강 ≈ 평균 V3.8" 같은 데이터가 핵심 결과물.

## 기술 스택

- **프레임워크**: Expo (latest SDK) + TypeScript
- **라우팅**: Expo Router (file-based)
- **상태/데이터**: TanStack Query (server state) + Zustand (client state, 진행 중인 세션 임시 저장)
- **백엔드**: Supabase (Postgres + Auth + Storage + Realtime + RLS)
- **UI**: NativeWind (Tailwind for RN)
- **폼**: React Hook Form + Zod
- **차트**: react-native-gifted-charts (가벼움, 가로 막대 차트)
- **카드 합성**: react-native-svg + react-native-view-shot (PNG 캡처)
- **공유**: Expo Sharing + Expo Linking
- **지도**: react-native-maps + 카카오맵 deep link (길찾기 위임)
- **인증**: Supabase Auth (이메일 우선, 카카오는 prebuild 후 추가)

## 디렉토리 구조

코드는 모두 `src/` 아래. tsconfig의 `@/*` 별칭은 `src/*`로 매핑됨.

```
src/
  app/                     # Expo Router (file-based)
    _layout.tsx            # root layout (QueryClientProvider, ThemeProvider)
    (tabs)/
      _layout.tsx          # 하단 탭 4개
      index.tsx            # 홈
      log.tsx              # 기록 + (중앙 액션)
      gyms.tsx             # 암장
      profile.tsx          # 프로필
    session/
      [id].tsx             # 세션 상세
      new.tsx              # 새 세션
    gym/
      [id].tsx             # 암장 상세
      [id]/vote.tsx        # 색깔 V그레이드 투표
    share/
      [sessionId].tsx      # 공유 카드 편집
    membership/
  components/
    ui/                    # 기본 컴포넌트
    climb/                 # 등반 관련
    gym/                   # 암장 관련
    share/                 # 공유 카드 관련
  lib/
    supabase.ts            # Supabase 클라이언트
    database.types.ts      # supabase gen types 자동생성
    queries/               # 도메인별 쿼리/뮤테이션 함수
  hooks/                   # use-* 훅 (TanStack Query 래퍼 포함)
  stores/                  # zustand stores
  constants/
supabase/
  migrations/
    01_schema.sql
    02_seed_gyms.sql
```

환경변수는 루트의 `.env`에 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`로 정의. `.env*.local`은 `.gitignore`에 포함됨.

## 데이터 모델 핵심

테이블 9개: `profiles`, `gyms`, `gym_color_schemes`, `gym_prices`, `sessions`, `problems`, `board_problems`, `attempts`, `memberships`, `follows`.

- `attempts.climbing_type` enum: `boulder` | `lead` | `board`. polymorphic FK로 `problem_id` 또는 `board_problem_id` 중 하나만 채움.
- `attempts.felt_grade` text ('V3', 'V4+' 형태) — 크라우드 그레이딩의 데이터 소스. 옵셔널.
- `attempts.result` enum: `onsight` | `flash` | `send` | `project` | `fall`. UI에서는 "완등/미완/폴" 3개만 노출하고 onsight/flash는 시도 수로 자동 추론.
- `gym_color_schemes`: 암장별 색깔 체계. (gym_id, color) 유일.
- `follows` 테이블은 스키마에만 존재. UI는 v1.1.
- Views: `gym_color_grade_stats`, `user_monthly_stats`.
- Helper functions: `v_grade_to_num('V3+') = 3.5`, `num_to_v_grade(3.5) = 'V3+'`.

## 핵심 화면 (MVP)

하단 탭 4개: 홈 / 기록(+) / 암장 / 프로필.

가장 중요한 3개 화면:

1. **세션 중 등반 기록** (`src/app/session/new.tsx`)
   - 하단 인라인 입력 카드. 모달 X.
   - 색깔 그리드 (4×2) → 결과 버튼 (완등/미완/폴) → 즉시 추가.
   - "▾ 체감 그레이드 · 무브 노트" 펼치기 (옵셔널).
   - 같은 색깔에서 미완→미완→완등 흐름은 한 row의 `tries=3, result='send'`로 저장.

2. **암장 상세 + 색깔 통계** (`src/app/gym/[id].tsx`)
   - 색깔별 row: 색깔 원 + 평균 V그레이드 위치(5단계 점 시각화) + 투표 수.
   - 투표 수 10 미만이면 평균 숨김 ("데이터 모으는 중").

3. **색깔 V그레이드 투표** (`src/app/gym/[id]/vote.tsx`)
   - 색깔 가로 선택 → 큰 색깔 표시 + 현재 평균 → V그레이드 3×3 그리드 (V0~V8+) → 투표 제출.
   - "잘 모르겠어요" 스킵 옵션.
   - 한 사용자 = 한 색깔에 한 번만 투표 (재투표는 덮어쓰기).

## 디자인 결정 (확정)

- 등반 결과는 UI에서 "완등/미완/폴" 3개만. onsight/flash는 시도 수로 자동 추론.
- 카테고리(입문/중급 등) 도입 안 함. V그레이드만 받음. 초보자는 "잘 모르겠어요" 스킵.
- 인스타 연동: 프로필에 핸들 표시 + 공유 카드를 시스템 share sheet로 전달. Instagram API 없음.
- 친구/팔로우/피드는 v1.1 (스키마는 미리 준비됨).
- 친구 대결·공개 모임·랭킹·커뮤니티 글은 v2.0.
- 색깔 체계는 시드 안 함. 첫 사용자가 등록하는 UX.
- 세션 단위로 climbing_type 디폴트 (매 등반마다 안 물음).

## 코딩 컨벤션

- TypeScript strict mode.
- 컴포넌트는 함수 컴포넌트 + named export.
- 상수는 SCREAMING_SNAKE_CASE, 컴포넌트는 PascalCase, 함수/변수는 camelCase, 파일명은 라우트 파일 외에는 kebab-case.
- Supabase 타입은 `supabase gen types typescript --project-id ... > src/lib/database.types.ts`로 자동생성.
- 쿼리 키는 `['gyms', gymId, 'color-stats']` 형태로 배열, 최상단부터 좁히는 순서.
- 디자인 토큰은 Tailwind config에 정의 (브랜드 색깔, 폰트 크기).
- 폼은 모두 Zod 스키마 우선 정의 → React Hook Form `resolver: zodResolver(schema)`.
- API 호출은 `lib/queries/*` 또는 `hooks/use-*.ts`에 분리. 컴포넌트 안에 직접 supabase 호출 금지.
- 매 PR은 단일 책임. 한 PR에 마이그레이션 + UI + 비즈니스 로직 섞지 않음.
- import 경로는 항상 `@/` 사용 (예: `import { supabase } from '@/lib/supabase'`). 상대 경로(`../../`) 금지.

## 진행 상황

- [x] 스키마 SQL 작성 (`supabase/migrations/`)
- [x] 시드 데이터 (수도권 21개 암장)
- [x] IA 트리 + 사용자 플로우 + 핵심 와이어프레임 3개
- [x] 프로젝트 셋업 + Supabase 연결
- [x] Supabase CLI 도입 + 마이그레이션 워크플로우
- [x] Expo Router 탭 구조 셋업 (홈/기록/암장/프로필)
- [x] NativeWind 설정 + 디자인 토큰 (CSS-variable 기반)
- [x] 인증 (이메일) + profiles 자동 생성 트리거 + 보호된 라우트
- [x] 암장 리스트 + 상세 (검색·지역·시설 필터, photo placeholder)
- [x] 세션 기록 화면 (사후 기록 모드, 한 화면 폼)
- [x] 세션 상세 + 수정 + 삭제
- [x] 색깔 투표 화면 (grade_votes 분리 테이블, 14색, V0~V8+ 모달)
- [x] 통계 화면 (프로필 탭, 암장별 색깔 막대 + 요약 카드)
- [x] grade_votes 시드 (Becky 시트 → 15 gym / 100+ votes)
- [x] 암장 추가 요청 폼 (`gym_requests` 테이블 + 진입 CTA 2곳)
- [x] 회원권 관리 (4종 enum, CRUD, 다회권 차감)
- [ ] 공유 카드 편집 (PNG 캡처 + 시스템 share sheet)
- [ ] (prebuild) 카카오 로그인
- [ ] V그레이드 깊이 (월별 추이, 개인 max V, heatmap) — v1.1
- [ ] 친구/팔로우/피드 — v1.1 (스키마 준비됨)

## 작업 원칙

- 한 번에 하나의 마일스톤만. 기능 늘리지 않음.
- 위험한 부분(인증, 공유 카드, 카카오맵)은 초반에 PoC로 검증.
- v2.0 기능(친구·대결·모임·랭킹·커뮤니티)은 출시 후. 지금은 생각하지 않음.
- 커밋은 작업 단위가 끝나면 자동으로 진행. git status·커밋 메시지 제안 단계 생략. 단, 다음 경우엔 멈추고 확인: (1) 마이그레이션 파일 추가/수정, (2) 환경변수/시크릿 관련 파일 변경, (3) package.json dependency 추가, (4) 대규모 리팩토링 (파일 10개 이상 또는 디렉토리 구조 변경).
- DB 마이그레이션은 `supabase/migrations/`에 표준 형식(YYYYMMDDHHMMSS_name.sql)으로 추가 후 `supabase db push`로 적용. SQL Editor 수동 적용 금지.

## Known issues

- NativeWind v4 + Metro 워처 호환성 이슈로 코드 변경 시 hot reload 종종 실패. 임시 우회: 시뮬레이터에서 Cmd+R 또는 dev server 터미널에서 'r' 키. 근본 해결은 v1.1로.
