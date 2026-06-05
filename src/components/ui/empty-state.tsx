/**
 * 빈 상태 화면 — "결과가 없어요", "아직 ~가 없어요" 같은 상황에 통일된 시각.
 *
 * 사용:
 *   <EmptyState
 *     icon="bell-off"
 *     title="알림이 없어요"
 *     description="크루 공지가 올라오면 여기 표시돼요"
 *   />
 *
 *   // 커스텀 톤 (성공/경고/위험) 및 액션 버튼
 *   <EmptyState
 *     icon="check-circle"
 *     tone="success"
 *     title="밀린 제보가 없어요"
 *     description="새 제보가 들어오면 여기 표시돼요"
 *   />
 *
 * 규격:
 *   - 아이콘 박스: 64×64 원, 톤별 배경, 아이콘 28px
 *   - 제목: 16 / 900
 *   - 설명: 12.5 / 600, lineHeight 19, 중앙 정렬
 *   - 상하 여백 56, 좌우 24, gap 10
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useThemeColors, type ThemeColors } from '@/lib/theme';

type IconName = keyof typeof Feather.glyphMap;
type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'muted';

export type EmptyStateProps = {
  icon: IconName;
  title: string;
  description?: string;
  tone?: Tone;
  action?: {
    label: string;
    onPress: () => void;
    icon?: IconName;
  };
  /** 가로 좁은 카드 안에서 쓸 때 패딩을 줄이고 싶을 때 */
  compact?: boolean;
};

export function EmptyState({
  icon,
  title,
  description,
  tone = 'brand',
  action,
  compact,
}: EmptyStateProps) {
  const c = useThemeColors();
  const s = makeStyles(c);
  const palette = tonePalette(c, tone);

  return (
    <View style={[s.box, compact && s.boxCompact]}>
      <View style={[s.iconBox, { backgroundColor: palette.bg }]}>
        <Feather name={icon} size={28} color={palette.fg} />
      </View>
      <Text style={s.title}>{title}</Text>
      {description ? <Text style={s.desc}>{description}</Text> : null}
      {action ? (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: 4 }]}
        >
          <View style={[s.actionBtn, { backgroundColor: c.brand.primary }]}>
            {action.icon ? (
              <Feather name={action.icon} size={14} color={c.brand.onPrimary} />
            ) : null}
            <Text style={[s.actionLabel, { color: c.brand.onPrimary }]}>{action.label}</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

function tonePalette(c: ThemeColors, tone: Tone): { bg: string; fg: string } {
  switch (tone) {
    case 'success': return { bg: c.status.successBg, fg: c.status.success };
    case 'warning': return { bg: c.status.warningBg, fg: c.status.warning };
    case 'danger':  return { bg: c.status.dangerBg,  fg: c.status.danger };
    case 'muted':   return { bg: c.bg.subtle,        fg: c.text.tertiary };
    case 'brand':
    default:        return { bg: c.brand.primaryLight, fg: c.brand.primary };
  }
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    box: {
      alignItems: 'center', justifyContent: 'center',
      paddingVertical: 56, paddingHorizontal: 24, gap: 10,
    },
    boxCompact: {
      paddingVertical: 28, paddingHorizontal: 16, gap: 8,
    },
    iconBox: {
      width: 64, height: 64, borderRadius: 32,
      alignItems: 'center', justifyContent: 'center',
    },
    title: {
      fontSize: 16, fontWeight: '900', color: c.text.primary,
      letterSpacing: -0.3, textAlign: 'center',
    },
    desc: {
      fontSize: 12.5, color: c.text.tertiary, fontWeight: '600',
      textAlign: 'center', lineHeight: 19,
    },
    actionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 16, paddingVertical: 10,
      borderRadius: 12,
    },
    actionLabel: { fontSize: 13, fontWeight: '900', letterSpacing: -0.2 },
  });
}
