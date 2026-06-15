/**
 * 사용자 프로필 사진 + 폴백.
 *
 * 폴백 색깔은 user_id 해시 기반이라 같은 사용자는 어디서든 같은 색.
 * 한 번 정해진 색은 절대 바뀌지 않음.
 */
import React, { useMemo } from 'react';
import { Image, Text, View } from 'react-native';

import { useEffectiveScheme, useThemeColors } from '@/lib/theme';

const LIGHT_PALETTE: { bg: string; fg: string }[] = [
  { bg: '#fee2e2', fg: '#b91c1c' },  // red
  { bg: '#ffedd5', fg: '#c2410c' },  // orange
  { bg: '#fef3c7', fg: '#a16207' },  // amber
  { bg: '#fef9c3', fg: '#854d0e' },  // yellow
  { bg: '#ecfccb', fg: '#4d7c0f' },  // lime
  { bg: '#dcfce7', fg: '#15803d' },  // green
  { bg: '#cffafe', fg: '#0e7490' },  // cyan
  { bg: '#dbeafe', fg: '#1d4ed8' },  // blue
  { bg: '#e0e7ff', fg: '#4338ca' },  // indigo
  { bg: '#ede9fe', fg: '#6d28d9' },  // violet
  { bg: '#fae8ff', fg: '#a21caf' },  // fuchsia
  { bg: '#fce7f3', fg: '#be185d' },  // pink
];

const DARK_PALETTE: { bg: string; fg: string }[] = [
  { bg: '#450a0a', fg: '#fca5a5' },  // red
  { bg: '#431407', fg: '#fdba74' },  // orange
  { bg: '#451a03', fg: '#fcd34d' },  // amber
  { bg: '#422006', fg: '#fde047' },  // yellow
  { bg: '#1a2e05', fg: '#bef264' },  // lime
  { bg: '#052e16', fg: '#86efac' },  // green
  { bg: '#083344', fg: '#67e8f9' },  // cyan
  { bg: '#1e3a8a', fg: '#93c5fd' },  // blue
  { bg: '#312e81', fg: '#a5b4fc' },  // indigo
  { bg: '#2e1065', fg: '#d8b4fe' },  // violet
  { bg: '#4a044e', fg: '#f0abfc' },  // fuchsia
  { bg: '#500724', fg: '#f9a8d4' },  // pink
];

function hashIndex(key: string): number {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  return Math.abs(h) % LIGHT_PALETTE.length;
}

type Props = {
  /** 사용자 식별자 — 폴백 색깔을 결정짓는 기준. 보통 user_id 또는 username. */
  userKey?: string | null;
  /** 표시할 이름 (이니셜 추출에 사용). */
  username?: string | null;
  avatarUrl?: string | null;
  size?: number;
  /** 보더 (그룹 안에 띄울 때) */
  bordered?: boolean;
};

export function UserAvatar({
  userKey,
  username,
  avatarUrl,
  size = 36,
  bordered,
}: Props) {
  const c = useThemeColors();

  const scheme = useEffectiveScheme();

  const initial = useMemo(() => {
    const n = (username ?? '').trim();
    if (!n) return '?';
    return n.charAt(0).toUpperCase();
  }, [username]);

  const palette = useMemo(() => {
    const key = userKey ?? username ?? initial;
    const isDark = scheme === 'dark';
    const index = hashIndex(key);
    return isDark ? DARK_PALETTE[index] : LIGHT_PALETTE[index];
  }, [userKey, username, initial, scheme]);

  const fontSize = size * 0.42;
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
    ...(bordered ? { borderWidth: 1.5, borderColor: c.bg.card } : null),
  };

  if (avatarUrl) {
    return (
      <View style={containerStyle}>
        <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={[containerStyle, { backgroundColor: palette.bg }]}>
      <Text
        style={{
          fontSize,
          fontWeight: '900',
          color: palette.fg,
          letterSpacing: -0.3,
        }}
      >
        {initial}
      </Text>
    </View>
  );
}
