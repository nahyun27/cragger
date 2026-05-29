import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import { useEffectiveScheme } from '@/lib/theme';

// 14색. 암장별 동적 color scheme은 v1.1.
// 순서는 일반 난이도 desc (시드 시트 기준):
//   검정 ≫ 갈 ≫ 회 ≫ 보라 ≫ 남 ≫ 빨 ≫ 핑 ≫ 주 ≫ 파 ≫ 하늘 ≫ 초록 ≫ 연두 ≫ 노 ≫ 흰
// 모든 색깔 그리드(기록 카운터, 투표 row, 통계)가 이 순서를 공유.
export const GRID_COLORS = [
  'black',
  'brown',
  'gray',
  'purple',
  'navy',
  'red',
  'pink',
  'orange',
  'blue',
  'sky',
  'green',
  'lime',
  'yellow',
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
  const scheme = useEffectiveScheme();
  const hex = resolveColorHex(color);
  const label = resolveColorLabel(color);
  // 흰/노랑은 밝아서 흰 배경에서 잘 안 보임 → 옅은 border
  const needsContrastBorder = color === 'white' || color === 'yellow' || (scheme === 'dark' && color === 'black');

  return (
    <Pressable
      onPress={() => onSelect(color)}
      disabled={disabled}
      // 4열: 각 셀은 (100% - 3*gap) / 4 정도. flex-wrap 환경에서 % 계산 단순화 위해
      // basis 사용. gap-2 (8px) 기준으로 폭 계산.
      style={[
        { width: '23%' },
        selected ? { transform: [{ translateY: -2 }] } : null,
      ]}
      className={`items-center gap-1.5 p-2 rounded-md ${disabled ? 'opacity-50' : ''}`}
    >
      {/* Selected state = black ring + lift. Never brand cyan, because the
          sky hold (#0EA5E9) collides with our brand cyan. */}
      <View
        className="w-12 h-12 rounded-full"
        style={[
          { backgroundColor: hex },
          selected && {
            borderWidth: 3,
            borderColor: '#0f172a',
            shadowColor: '#0f172a',
            shadowOpacity: 0.18,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 3,
          },
          !selected && needsContrastBorder
            ? { borderWidth: 1, borderColor: scheme === 'dark' && color === 'black' ? '#525252' : '#D4D4D8' }
            : null,
        ]}
      />
      <Text
        className={`text-xs ${
          selected ? 'text-text-primary font-bold' : 'text-text-secondary'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
