import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';

// 4×2 그리드, 8색 하드코딩. 암장별 색깔 체계 동적 로딩은 v1.1.
export const GRID_COLORS = [
  'red',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'black',
  'white',
] as const;

export type GridColor = (typeof GRID_COLORS)[number];

type Props = {
  selected: string | null;
  onSelect: (color: GridColor) => void;
  disabled?: boolean;
};

export function ColorGrid({ selected, onSelect, disabled }: Props) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {GRID_COLORS.map((color) => (
        <ColorCell
          key={color}
          color={color}
          selected={selected === color}
          disabled={disabled}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
}

function ColorCell({
  color,
  selected,
  disabled,
  onSelect,
}: {
  color: GridColor;
  selected: boolean;
  disabled?: boolean;
  onSelect: (color: GridColor) => void;
}) {
  const hex = resolveColorHex(color);
  const label = resolveColorLabel(color);
  // 흰/노랑은 밝아서 흰 배경에서 잘 안 보임 → 옅은 border
  const needsContrastBorder = color === 'white' || color === 'yellow';

  return (
    <Pressable
      onPress={() => onSelect(color)}
      disabled={disabled}
      // 4열: 각 셀은 (100% - 3*gap) / 4 정도. flex-wrap 환경에서 % 계산 단순화 위해
      // basis 사용. gap-2 (8px) 기준으로 폭 계산.
      style={{ width: '23%' }}
      className={`items-center gap-1.5 p-2 rounded-md ${
        selected ? 'bg-background-secondary' : ''
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <View
        className={`w-12 h-12 rounded-full ${
          selected ? 'border-4 border-brand-primary' : ''
        }`}
        style={{
          backgroundColor: hex,
          ...(needsContrastBorder && !selected
            ? { borderWidth: 1, borderColor: '#D4D4D8' }
            : null),
        }}
      />
      <Text
        className={`text-xs ${
          selected ? 'text-text-primary font-semibold' : 'text-text-secondary'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
