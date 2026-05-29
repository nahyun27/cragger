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
import Svg, { Path } from 'react-native-svg';

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

  // 세션 — 'session-N' (달력 안 숫자, 테두리 X)
  if (icon.startsWith('session-')) {
    const num = icon.split('-')[1];
    const calSize = size * 1.15;
    return (
      <View style={[sessionStyles.outer, {
        width: size * 1.6,
        height: size * 1.6,
        borderRadius: size * 0.8,
        backgroundColor: color + '22',
      }]}>
        <View style={{ width: calSize, height: calSize }}>
          <Feather name="calendar" size={calSize} color={color} />
          {/* Feather 캘린더 body 는 viewBox 기준 y=10~22 = 42%~92% — 그 중간에 숫자 */}
          <Text style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: calSize * 0.5,
            textAlign: 'center',
            fontSize: num.length >= 3 ? calSize * 0.34 : calSize * 0.42,
            fontWeight: '900',
            color,
            letterSpacing: -0.5,
            lineHeight: calSize * 0.42,
          }}>{num}</Text>
        </View>
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

  // V그레이드 / 리드 — 방패 모양 + 흰 텍스트
  if (/^V\d/.test(icon) || /^5\.\d/.test(icon)) {
    const w = size * 1.6;
    const h = size * 1.85;
    return (
      <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={w} height={h} viewBox="0 0 100 115" style={{ position: 'absolute' }}>
          <Path
            d="M 15,5 L 85,5 Q 92,5 92,12 L 92,58 L 50,108 L 8,58 L 8,12 Q 8,5 15,5 Z"
            fill={color}
          />
        </Svg>
        <Text style={[textIconStyles.text, {
          color: '#ffffff',
          fontSize: icon.length >= 4 ? size * 0.5 : size * 0.78,
          marginTop: -size * 0.18,
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

  // 색깔 마스터 — 실제 화가의 팔레트 (둥근 보드 + 엄지 구멍 + 5색 페인트 블롭)
  if (icon === 'palette') {
    const s = size;
    const outer = s * 1.6;
    const dotSize = s * 0.34;
    const dotR = dotSize / 2;
    // 5색 페인트 — 원 둘레 시계방향으로 배치 (엄지 구멍 위치 빼고)
    // 각도: -150° (상단 좌), -100° (상단), -50° (상단 우), 0° (우), 50° (하단 우)
    const center = outer / 2;
    const r = s * 0.55;
    const dots = [
      { angle: -150, color: '#ef4444' },
      { angle: -100, color: '#f59e0b' },
      { angle: -50,  color: '#eab308' },
      { angle: 0,    color: '#22c55e' },
      { angle: 50,   color: '#3b82f6' },
    ];
    return (
      <View style={{
        width: outer,
        height: outer,
        borderRadius: outer / 2,
        backgroundColor: '#fbbf24',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#d97706',
      }}>
        {/* 엄지 구멍 — 좌하단 안쪽 */}
        <View style={{
          position: 'absolute',
          width: s * 0.55,
          height: s * 0.55,
          borderRadius: s * 0.275,
          backgroundColor: '#fef3c7',
          top: outer * 0.55,
          left: outer * 0.18,
        }} />
        {/* 페인트 블롭들 */}
        {dots.map(({ angle, color: dotColor }, i) => {
          const rad = (angle * Math.PI) / 180;
          const x = center + r * Math.cos(rad) - dotR;
          const y = center + r * Math.sin(rad) - dotR;
          return (
            <View key={i} style={{
              position: 'absolute',
              width: dotSize,
              height: dotSize,
              borderRadius: dotR,
              backgroundColor: dotColor,
              top: y,
              left: x,
            }} />
          );
        })}
      </View>
    );
  }

  // 그 외 — Feather icon (소셜 카테고리: 글/댓글/투표/크루/모임/대결) — 원형 배경 포함
  const featherName: keyof typeof Feather.glyphMap = [
    'edit-2', 'message-circle', 'pie-chart', 'users', 'flag', 'coffee', 'shield',
    'star', 'award', 'aperture', 'layers', 'calendar', 'clock', 'activity',
    'trending-up', 'zap',
  ].includes(icon) ? (icon as keyof typeof Feather.glyphMap) : 'star';

  return (
    <View style={{
      width: size * 1.6,
      height: size * 1.6,
      borderRadius: size * 0.8,
      backgroundColor: color + '22',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Feather name={featherName} size={size * 0.9} color={color} />
    </View>
  );
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
  },
  text: {
    fontWeight: '900',
    letterSpacing: -0.3,
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

