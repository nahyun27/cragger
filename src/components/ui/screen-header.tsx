/**
 * 화면 헤더 — 모든 sub-page 에 동일한 시각 언어로 적용.
 *
 * 원칙:
 *   - 항상 status bar 까지 채워짐 (useSafeAreaInsets + paddingTop)
 *   - bg = bg.card, 하단 hairline 보더
 *   - 왼쪽 = 뒤로가기 (or custom leftSlot)
 *   - 중앙 = 타이틀 + 옵션 카운트 배지 + 옵션 subtitle
 *   - 오른쪽 = 아이콘 액션들 (배열) or custom rightSlot
 *
 * 사용:
 *   <ScreenHeader
 *     title="제보 승인 대기"
 *     count={3}
 *     onBack={() => router.back()}
 *     rightActions={[{ icon: 'trash-2', tone: 'danger', onPress: handleDelete }]}
 *   />
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useThemeColors, type ThemeColors } from '@/lib/theme';

type IconName = keyof typeof Feather.glyphMap;
type ActionTone = 'default' | 'primary' | 'danger' | 'muted';

export type ScreenHeaderAction = {
  icon: IconName;
  onPress: () => void;
  tone?: ActionTone;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
};

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  count?: number;                       // > 0 일 때 배지 표시
  onBack?: () => void;
  rightActions?: ScreenHeaderAction[];
  // Custom slot overrides actions
  rightSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
  borderless?: boolean;
};

export function ScreenHeader({
  title,
  subtitle,
  count,
  onBack,
  rightActions,
  rightSlot,
  leftSlot,
  borderless,
}: ScreenHeaderProps) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: Math.max(insets.top, 12) + 6,
          backgroundColor: c.bg.card,
          borderBottomWidth: borderless ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: c.border.subtle,
        },
      ]}
    >
      <View style={styles.row}>
        {/* Center — absolutely positioned so title sits in the exact middle
            regardless of how wide left/right icon groups are */}
        <View pointerEvents="none" style={styles.centerAbsolute}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: c.text.primary }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {typeof count === 'number' && count > 0 && (
              <View style={[styles.countBadge, { backgroundColor: c.brand.primary }]}>
                <Text style={[styles.countText, { color: c.brand.onPrimary }]}>
                  {count}
                </Text>
              </View>
            )}
          </View>
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: c.text.tertiary }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Left */}
        <View style={styles.leftCol}>
          {leftSlot
            ? leftSlot
            : onBack
              ? (
                <Pressable
                  onPress={onBack}
                  hitSlop={8}
                  style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]}
                  accessibilityRole="button"
                  accessibilityLabel="뒤로 가기"
                >
                  <Feather name="arrow-left" size={22} color={c.text.primary} />
                </Pressable>
              )
              : null}
        </View>

        <View style={{ flex: 1 }} />

        {/* Right */}
        <View style={styles.rightCol}>
          {rightSlot ?? (
            <View style={styles.rightActions}>
              {(rightActions ?? []).map((a, i) => (
                <HeaderActionBtn key={`${a.icon}-${i}`} action={a} c={c} />
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function HeaderActionBtn({ action, c }: { action: ScreenHeaderAction; c: ThemeColors }) {
  const color =
    action.tone === 'primary' ? c.brand.primary :
    action.tone === 'danger'  ? c.status.danger :
    action.tone === 'muted'   ? c.text.tertiary :
                                c.text.primary;
  return (
    <Pressable
      onPress={action.onPress}
      hitSlop={8}
      disabled={action.disabled || action.loading}
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel}
      style={({ pressed }) => [
        styles.btn,
        { opacity: pressed ? 0.6 : action.disabled ? 0.4 : 1 },
      ]}
    >
      {action.loading
        ? <ActivityIndicator size="small" color={color} />
        : <Feather name={action.icon} size={20} color={color} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 40, position: 'relative' },
  leftCol: { flexDirection: 'row', alignItems: 'center' },
  rightCol: { flexDirection: 'row', alignItems: 'center' },
  rightActions: { flexDirection: 'row', alignItems: 'center' },
  centerAbsolute: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 80,
  },
  btn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 999,
    minWidth: 22, alignItems: 'center',
  },
  countText: { fontSize: 11, fontWeight: '900' },
  subtitle: { fontSize: 11.5, fontWeight: '700', marginTop: 1 },
});
