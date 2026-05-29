import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { GRID_COLORS, type GridColor } from '@/components/climb/color-grid';
import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import type { ColorCount } from '@/hooks/use-record-session';
import { useEffectiveScheme } from '@/lib/theme';

export type ColorCountsValue = Record<GridColor, ColorCount>;

export function emptyColorCounts(): ColorCountsValue {
  return Object.fromEntries(
    GRID_COLORS.map((c) => [c, { color: c, tries: 0, sends: 0 }]),
  ) as ColorCountsValue;
}

type Props = {
  value: ColorCountsValue;
  onChange: (next: ColorCountsValue) => void;
  // 전체 표시 순서. 없으면 GRID_COLORS 기본순.
  colors?: readonly GridColor[];
  // colors 앞에서부터 N개가 "primary" (항상 표시). 나머지는 0-count이면 숨김,
  // "난이도 추가" 토글로 펼침. 미지정/colors.length 이상이면 모두 primary.
  primaryCount?: number;
};

// 색깔 × [완등 -/N/+] [시도 -/N/+].
// 완등 ≤ 시도 강제: 완등 + 누르면 시도 자동 따라옴, 시도 − 누르면 완등 같이 깎임.
// primary/secondary 분리: 암장에 등록된 색깔만 디폴트 노출, 나머지는 토글.
export function ColorCountsTable({
  value,
  onChange,
  colors,
  primaryCount,
}: Props) {
  const order = colors ?? GRID_COLORS;
  const primaryN = Math.min(primaryCount ?? order.length, order.length);
  const [expanded, setExpanded] = useState(false);

  const primary = order.slice(0, primaryN);
  const secondary = order.slice(primaryN);
  // 0-count secondary는 collapse 상태에서 숨김. 0보다 큰 건 우선 표시 (사용자가
  // 이미 카운트 올린 색깔은 사라지면 안 됨).
  const usedSecondary = secondary.filter((c) => value[c].tries > 0);
  const unusedSecondary = secondary.filter((c) => value[c].tries === 0);
  const visibleSecondary = expanded ? secondary : usedSecondary;
  const hiddenCount = expanded ? 0 : unusedSecondary.length;

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

  const allRows = [...primary, ...visibleSecondary];

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-3 px-1">
        <View style={{ width: 64 }} />
        <Text className="flex-1 text-text-tertiary text-xs text-center">완등</Text>
        <Text className="flex-1 text-text-tertiary text-xs text-center">시도</Text>
      </View>
      {allRows.map((color) => (
        <ColorRow
          key={color}
          color={color}
          value={value[color]}
          onBumpSends={(delta) => bumpSends(color, delta)}
          onBumpTries={(delta) => bumpTries(color, delta)}
        />
      ))}
      {(hiddenCount > 0 || expanded) && secondary.length > 0 && (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          className="border border-dashed border-border-default rounded-lg py-2.5 items-center mt-1 active:opacity-60"
          hitSlop={4}
        >
          <Text className="text-text-secondary text-sm font-medium">
            {expanded ? '− 접기' : `+ 난이도 추가 (${hiddenCount}색)`}
          </Text>
        </Pressable>
      )}
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
  const scheme = useEffectiveScheme();
  const hex = resolveColorHex(color);
  const label = resolveColorLabel(color);
  const needsBorder = color === 'white' || color === 'yellow' || (scheme === 'dark' && color === 'black');
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-row items-center gap-2" style={{ width: 64 }}>
        <View
          className="w-6 h-6 rounded-full"
          style={{
            backgroundColor: hex,
            ...(needsBorder ? { borderWidth: 1, borderColor: scheme === 'dark' && color === 'black' ? '#525252' : '#D4D4D8' } : null),
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
