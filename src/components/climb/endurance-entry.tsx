/**
 * 지구력 세션 입력 — 스타일 선택.
 * 세트별 기록은 일단 제외 (시간만 운동 시간 섹션에서 받음).
 */
import React from 'react';
import { Text, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { useThemeColors } from '@/lib/theme';

export type EnduranceStyle = 'spraywall' | 'overhang' | 'vertical';

const STYLE_OPTIONS: { value: EnduranceStyle; label: string }[] = [
  { value: 'spraywall', label: '스프레이월' },
  { value: 'overhang',  label: '오버행' },
  { value: 'vertical',  label: '직벽' },
];

type Props = {
  value: EnduranceStyle | null;
  onChange: (v: EnduranceStyle) => void;
};

export function EnduranceEntry({ value, onChange }: Props) {
  const c = useThemeColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: c.text.tertiary, letterSpacing: 0.3 }}>
        스타일
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {STYLE_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={value === opt.value}
            onPress={() => onChange(opt.value)}
          />
        ))}
      </View>
    </View>
  );
}
