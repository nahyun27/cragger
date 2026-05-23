import React, { useMemo } from 'react';
import { Image, Text, View } from 'react-native';

import { matchGymStyle } from '@/lib/gym-logos';

// 브랜드 로고가 있으면 그걸 보여주고, 없으면 이름 해시 기반 색 + 첫 글자 fallback.
// 일부 brand (예: 서울숲) 는 흰색 단색 로고 + 지점별 배경색으로 통일감.
// 사진(개별 지점 사진) 도입은 v1.1.

type Props = {
  name: string;
  branch?: string | null;
  size?: number;
};

function hashSeed(s: string): number {
  // djb2 변형. 한글 codepoint도 안정적으로 처리.
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return ((h % 360) + 360) % 360;
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) =>
    ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function GymThumbnail({ name, branch, size = 56 }: Props) {
  const { logo, bg } = useMemo(() => matchGymStyle(name, branch), [name, branch]);
  const fallback = useMemo(() => {
    const trimmed = name.trim();
    const hue = hashSeed(trimmed || '?');
    return {
      bg: hslToHex(hue, 48, 42),
      initial: (trimmed.charAt(0) || '?').toUpperCase(),
    };
  }, [name]);

  if (logo) {
    // 지점별 배경색이 있으면 컬러 카드 + 흰 로고, 없으면 흰 카드 + 컬러 로고.
    const hasBg = bg != null;
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: bg ?? '#ffffff',
          borderWidth: hasBg ? 0 : 1,
          borderColor: '#e2e8f0',
          alignItems: 'center',
          justifyContent: 'center',
          padding: size * 0.18,
        }}
      >
        <Image
          source={logo}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: fallback.bg,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.42, color: '#ffffff', fontWeight: 'bold' }}>
        {fallback.initial}
      </Text>
    </View>
  );
}
