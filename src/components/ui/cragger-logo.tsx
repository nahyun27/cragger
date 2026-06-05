/**
 * 크래거 로고 — 클라이밍 홀드 모양 (볼트 구멍 포함).
 *
 * 디자인 의도:
 *   - 둥근 비대칭 삼각 → 실제 클라이밍 월에 박힌 홀드의 모양
 *   - 중앙 구멍 → 홀드를 벽에 고정하는 볼트홀 → 클라이밍 정체성
 *   - 산봉우리 같은 진부한 메타포 없이 즉시 "클라이밍" 식별
 *   - 메인 시안 그라데이션으로 깊이감
 *
 * fill-rule="evenodd" 로 path 두 개를 합쳐서 구멍을 "뚫음" → 어떤 배경 위에서도 진짜 구멍처럼 보임.
 */
import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { useThemeColors } from '@/lib/theme';

type Props = {
  size?: number;
  /** 단색 모드 (헤더 등 작게 쓸 때). 기본은 그라데이션 */
  monochrome?: boolean;
  /** 그라데이션 없이 단순 fill 만 (인쇄용 등) */
  flat?: boolean;
};

// 클라이밍 홀드 외형 — 기존의 자연스러운 바위 느낌을 살리되, 좌측 상단이 살짝만 부드럽게 들어가도록(Indent) 매만진 형태
const HOLD_OUTER =
  'M 40 20 C 60 5 85 20 90 40 C 95 65 85 82 65 82 C 45 82 25 82 15 75 C 5 68 5 40 15 30 C 20 25 32 26 40 20 Z';

// 중앙 볼트 구멍 2개 — 원래 사랑받았던 귀여운 눈동자 위치로 원복
const HOLD_BOLT_HOLE =
  'M 38 40 C 41 40 43 42 43 45 C 43 48 41 50 38 50 C 35 50 33 48 33 45 C 33 42 35 40 38 40 Z ' +
  'M 62 40 C 65 40 67 42 67 45 C 67 48 65 50 62 50 C 59 50 57 48 57 45 C 57 42 59 40 62 40 Z';

export function CraggerLogo({ size = 96, monochrome = false, flat = false }: Props) {
  const c = useThemeColors();

  // 외곽 + 구멍을 합친 단일 path → evenodd 로 구멍 표현
  const combinedPath = `${HOLD_OUTER} ${HOLD_BOLT_HOLE}`;

  if (monochrome) {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d={combinedPath} fill={c.brand.primary} fillRule="evenodd" />
      </Svg>
    );
  }

  if (flat) {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d={combinedPath} fill={c.brand.primary} fillRule="evenodd" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="craggerHold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={c.brand.primary} stopOpacity="1" />
          <Stop offset="1" stopColor={c.brand.primaryDeep} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Path d={combinedPath} fill="url(#craggerHold)" fillRule="evenodd" />
    </Svg>
  );
}
