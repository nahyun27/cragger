import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { GRID_COLORS, type GridColor } from '@/components/climb/color-grid';
import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import type { ColorCount } from '@/hooks/use-record-session';

export type ColorCountsValue = Record<GridColor, ColorCount>;

export function emptyColorCounts(): ColorCountsValue {
  return Object.fromEntries(
    GRID_COLORS.map((c) => [c, { color: c, tries: 0, sends: 0 }]),
  ) as ColorCountsValue;
}

type Props = {
  value: ColorCountsValue;
  onChange: (next: ColorCountsValue) => void;
  // 표시 순서. 없으면 GRID_COLORS 기본순. 추천 hook이 주입할 때 사용.
  colors?: readonly GridColor[];
};

// 8색 × [완등 -/N/+] [시도 -/N/+].
// 완등 ≤ 시도 강제: 완등 + 누르면 시도 자동 따라옴, 시도 − 누르면 완등 같이 깎임.
export function ColorCountsTable({ value, onChange, colors }: Props) {
  const order = colors ?? GRID_COLORS;
  function bumpTries(color: GridColor, delta: number) {
    const cur = value[color];
    const nextTries = Math.max(0, cur.tries + delta);
    const nextSends = Math.min(cur.sends, nextTries);
    onChange({ ...value, [color]: { ...cur, tries: nextTries, sends: nextSends } });
  }

  function bumpSends(color: GridColor, delta: number) {
    const cur = value[color];
    const nextSends = Math.max(0, cur.sends + delta);
    const nextTries = Math.max(cur.tries, nextSends);
    onChange({ ...value, [color]: { ...cur, sends: nextSends, tries: nextTries } });
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-3 px-1">
        <View style={{ width: 64 }} />
        <Text className="flex-1 text-text-tertiary text-xs text-center">완등</Text>
        <Text className="flex-1 text-text-tertiary text-xs text-center">시도</Text>
      </View>
      {order.map((color) => (
        <ColorRow
          key={color}
          color={color}
          value={value[color]}
          onBumpSends={(delta) => bumpSends(color, delta)}
          onBumpTries={(delta) => bumpTries(color, delta)}
        />
      ))}
    </View>
  );
}

function ColorRow({
  color,
  value,
  onBumpSends,
  onBumpTries,
}: {
  color: GridColor;
  value: ColorCount;
  onBumpSends: (delta: number) => void;
  onBumpTries: (delta: number) => void;
}) {
  const hex = resolveColorHex(color);
  const label = resolveColorLabel(color);
  const needsBorder = color === 'white' || color === 'yellow';
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-row items-center gap-2" style={{ width: 64 }}>
        <View
          className="w-6 h-6 rounded-full"
          style={{
            backgroundColor: hex,
            ...(needsBorder ? { borderWidth: 1, borderColor: '#D4D4D8' } : null),
          }}
        />
        <Text className="text-text-primary text-sm">{label}</Text>
      </View>
      <Counter value={value.sends} onChange={onBumpSends} />
      <Counter value={value.tries} onChange={onBumpTries} />
    </View>
  );
}

function Counter({
  value,
  onChange,
}: {
  value: number;
  onChange: (delta: number) => void;
}) {
  return (
    <View className="flex-1 flex-row items-center justify-center gap-1.5">
      <Pressable
        onPress={() => onChange(-1)}
        disabled={value === 0}
        className={`w-8 h-8 rounded-full items-center justify-center ${
          value === 0 ? 'bg-background-tertiary' : 'bg-background-secondary'
        }`}
        hitSlop={4}
      >
        <Text
          className={`text-base ${
            value === 0 ? 'text-text-muted' : 'text-text-primary'
          }`}
        >
          −
        </Text>
      </Pressable>
      <Text className="text-text-primary text-base font-medium min-w-[20px] text-center">
        {value}
      </Text>
      <Pressable
        onPress={() => onChange(1)}
        className="w-8 h-8 rounded-full bg-brand-primary items-center justify-center"
        hitSlop={4}
      >
        <Text className="text-background-primary text-base">+</Text>
      </Pressable>
    </View>
  );
}
