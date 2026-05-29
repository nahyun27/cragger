/**
 * 뱃지 아이콘 — 시리즈별 일관된 시각 디자인.
 *
 * 시리즈:
 * - 완등 (medal-N): bronze→silver→gold 그라데이션 메달 (숫자 크게)
 *   icon = 'target' → 1, 'medal-100' / 'medal-500' / 'medal-1000' 등
 * - 세션 (session): 진행도 막대 + 숫자
 *   icon = 'session-N'
 * - 연속 streak: 위로 향하는 화살표 + 강도별 색깔
 *   icon = 'streak-N'
 * - V그레이드: 컬러 텍스트 + 등급별 색조 강화
 *   icon = 'V0' .. 'V9'
 * - 리드 5.1x: 'V'/'5.' 텍스트 굵게
 * - 레인보우: 무지개 그라데이션 원
 *   icon = 'rainbow'
 * - 색깔 마스터: 다색 점들
 *   icon = 'palette'
 * - 소셜 (글/댓글/투표/크루/모임/대결): Feather icon 그대로
 */

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type BadgeIconProps = {
  icon: string;
  color: string;
  size?: number;
};

const RAINBOW = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'] as const;

export function BadgeIcon({ icon, color, size = 20 }: BadgeIconProps) {
  // 완등 메달 — 'target' (첫완등) / 'medal-100' / 'medal-500' / 'medal-1000'
  if (icon === 'target' || icon.startsWith('medal-')) {
    const num = icon === 'target' ? '1' : icon.split('-')[1];
    const tier =
      num === '1' ? 'bronze' :
      num === '100' ? 'silver' :
      num === '500' ? 'gold' :
      num === '1000' ? 'platinum' : 'bronze';
    const grads: Record<string, [string, string]> = {
      bronze:   ['#fbbf24', '#92400e'],
      silver:   ['#e5e7eb', '#6b7280'],
      gold:     ['#fde047', '#ca8a04'],
      platinum: ['#a5f3fc', '#0e7490'],
    };
    return (
      <LinearGradient
        colors={grads[tier]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          medalStyles.outer,
          { width: size * 1.6, height: size * 1.6, borderRadius: size * 0.8 },
        ]}
      >
        <View style={[medalStyles.inner, {
          width: size * 1.35,
          height: size * 1.35,
          borderRadius: size * 0.675,
        }]}>
          <Text style={[medalStyles.text, {
            fontSize: num.length >= 4 ? size * 0.4 : num.length >= 3 ? size * 0.5 : size * 0.65,
          }]}>{num}</Text>
        </View>
      </LinearGradient>
    );
  }

  // 세션 — 'session-N'
  if (icon.startsWith('session-')) {
    const num = icon.split('-')[1];
    return (
      <View style={[sessionStyles.outer, {
        width: size * 1.6,
        height: size * 1.6,
        borderRadius: size * 0.4,
        backgroundColor: color + '22',
        borderColor: color,
      }]}>
        <Feather name="calendar" size={size * 0.55} color={color} />
        <Text style={[sessionStyles.text, { fontSize: size * 0.5, color }]}>{num}</Text>
      </View>
    );
  }

  // 연속 streak — 'streak-N'
  if (icon.startsWith('streak-')) {
    const num = parseInt(icon.split('-')[1] ?? '0', 10);
    // 3 → trending-up / 7 → zap / 30 → activity
    const featherName: keyof typeof Feather.glyphMap =
      num >= 30 ? 'activity' : num >= 7 ? 'zap' : 'trending-up';
    return (
      <View style={[streakStyles.outer, {
        width: size * 1.6,
        height: size * 1.6,
        borderRadius: size * 0.8,
        backgroundColor: color + '22',
      }]}>
        <Feather name={featherName} size={size * 0.85} color={color} />
      </View>
    );
  }

  // V그레이드 / 리드 — 텍스트 인 아이콘
  if (/^V\d/.test(icon) || /^5\.\d/.test(icon)) {
    return (
      <View style={textIconStyles.outer}>
        <Text style={[textIconStyles.text, {
          color,
          fontSize: icon.length >= 4 ? size * 0.6 : size * 0.8,
        }]}>
          {icon}
        </Text>
      </View>
    );
  }

  // 레인보우 — 무지개 그라데이션 링
  if (icon === 'rainbow') {
    return (
      <LinearGradient
        colors={RAINBOW}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[rainbowStyles.outer, {
          width: size * 1.6,
          height: size * 1.6,
          borderRadius: size * 0.8,
        }]}
      >
        <View style={[rainbowStyles.inner, {
          width: size * 1.2,
          height: size * 1.2,
          borderRadius: size * 0.6,
        }]} />
      </LinearGradient>
    );
  }

  // 색깔 마스터 — 다색 점 4개
  if (icon === 'palette') {
    return (
      <View style={[paletteStyles.outer, {
        width: size * 1.6,
        height: size * 1.6,
        borderRadius: size * 0.4,
      }]}>
        {['#ef4444', '#22c55e', '#3b82f6', '#a855f7'].map((c, i) => (
          <View key={i} style={[paletteStyles.dot, {
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.2,
            backgroundColor: c,
          }]} />
        ))}
      </View>
    );
  }

  // 그 외 — Feather icon (소셜 카테고리: 글/댓글/투표/크루/모임/대결)
  const featherName: keyof typeof Feather.glyphMap = [
    'edit-2', 'message-circle', 'pie-chart', 'users', 'flag', 'coffee', 'shield',
    'star', 'award', 'aperture', 'layers', 'calendar', 'clock', 'activity',
    'trending-up', 'zap',
  ].includes(icon) ? (icon as keyof typeof Feather.glyphMap) : 'star';

  return <Feather name={featherName} size={size} color={color} />;
}

const medalStyles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  text: {
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
});

const sessionStyles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    gap: 1,
  },
  text: {
    fontWeight: '900',
    letterSpacing: -0.3,
    marginTop: 1,
  },
});

const streakStyles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const textIconStyles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});

const rainbowStyles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    backgroundColor: '#ffffff',
  },
});

const paletteStyles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#f8fafc',
    padding: 2,
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {},
});
