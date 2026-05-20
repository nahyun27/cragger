import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

// 사진 대체용 placeholder — 암장 이름 해시 기반 색 + 첫 글자.
// 사진 도입은 v1.1 (gyms.photo_url + Supabase Storage 또는 IG OG image).

type Props = {
  name: string;
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

export function GymThumbnail({ name, size = 56 }: Props) {
  const { bg, initial } = useMemo(() => {
    const trimmed = name.trim();
    const hue = hashSeed(trimmed || '?');
    return {
      bg: hslToHex(hue, 48, 42),
      initial: (trimmed.charAt(0) || '?').toUpperCase(),
    };
  }, [name]);

  return (
    <View
      style={{ width: size, height: size, backgroundColor: bg }}
      className="rounded-xl items-center justify-center"
    >
      <Text style={{ fontSize: size * 0.42 }} className="text-white font-bold">
        {initial}
      </Text>
    </View>
  );
}
