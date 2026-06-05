/**
 * 화면 하단 고정 CTA — 모든 sub-page 의 sticky 버튼을 통일.
 *
 * 원칙:
 *   - 상단 hairline 보더 + bg.card 로 구분
 *   - 안전영역(home indicator) 까지 자동으로 패딩
 *   - primary / outline / danger 톤 + leftIcon 옵션
 *   - 두 개 이상이면 children 으로 직접 배치 가능
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
type Tone = 'primary' | 'outline' | 'danger';

export type BottomCTAProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  tone?: Tone;
  loading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
};

export function BottomCTA({
  label,
  onPress,
  icon,
  tone = 'primary',
  loading,
  disabled,
  children,
}: BottomCTAProps) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const s = makeStyles(c);

  const isDisabled = disabled || loading;

  return (
    <View style={[s.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {children ?? (
        <Pressable
          onPress={onPress}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
        >
          <View
            style={[
              s.btn,
              tone === 'primary' && s.btnPrimary,
              tone === 'outline' && s.btnOutline,
              tone === 'danger' && s.btnDanger,
              isDisabled && s.btnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator
                color={tone === 'outline' ? c.brand.primary : c.brand.onPrimary}
              />
            ) : (
              <>
                {icon ? (
                  <Feather
                    name={icon}
                    size={16}
                    color={
                      isDisabled
                        ? c.text.muted
                        : tone === 'outline'
                          ? c.brand.primary
                          : tone === 'danger'
                            ? '#fff'
                            : c.brand.onPrimary
                    }
                  />
                ) : null}
                <Text
                  style={[
                    s.label,
                    tone === 'outline' && { color: c.brand.primary },
                    tone === 'danger' && { color: '#fff' },
                    isDisabled && { color: c.text.muted },
                  ]}
                >
                  {label}
                </Text>
              </>
            )}
          </View>
        </Pressable>
      )}
    </View>
  );
}

/** 두 개 버튼을 가로로 배치할 때 사용 — children 슬롯에 직접 넣어주세요. */
export function BottomCTAGroup({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 18,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border.subtle,
      backgroundColor: c.bg.card,
    },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 15,
      borderRadius: 14,
    },
    btnPrimary: {
      backgroundColor: c.brand.primary,
      shadowColor: c.brand.primary,
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    btnOutline: {
      backgroundColor: c.bg.card,
      borderWidth: 1.5,
      borderColor: c.brand.primary,
    },
    btnDanger: {
      backgroundColor: c.status.danger,
      shadowColor: c.status.danger,
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    btnDisabled: {
      backgroundColor: c.bg.subtle,
      shadowOpacity: 0,
      elevation: 0,
      borderWidth: 0,
    },
    label: {
      fontSize: 15,
      fontWeight: '900',
      color: c.brand.onPrimary,
      letterSpacing: -0.3,
    },
  });
}
