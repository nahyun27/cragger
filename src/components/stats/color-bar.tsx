import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';

type Props = {
  color: string;
  sendCount: number;
  maxSendCount: number;
};

// Color bar — refined per design system:
//  - leading hold-color dot replaces the variable-width label-only column
//  - bar fills with the hold's own hex (so color is the chart, not chrome)
//  - count is bold + tabular-nums, right-aligned in a fixed slot
export function ColorBar({ color, sendCount, maxSendCount }: Props) {
  const ratio = maxSendCount === 0 ? 0 : Math.min(1, sendCount / maxSendCount);
  const hex = resolveColorHex(color);
  const label = resolveColorLabel(color);
  const needsDotBorder = color === 'white' || color === 'yellow';

  return (
    <View style={s.row}>
      <View style={s.labelCol}>
        <View
          style={[
            s.dot,
            { backgroundColor: hex },
            needsDotBorder && { borderWidth: 1, borderColor: '#D4D4D8' },
          ]}
        />
        <Text style={s.labelText}>{label}</Text>
      </View>
      <View style={s.track}>
        <View
          style={[
            s.fill,
            { width: `${ratio * 100}%`, backgroundColor: hex },
          ]}
        />
      </View>
      <Text style={s.count}>{sendCount}완등</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  labelCol: {
    width: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 0,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  labelText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  track: {
    flex: 1,
    height: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },
  count: {
    width: 48,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
});
