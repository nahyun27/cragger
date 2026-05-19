import React from 'react';
import { Text, View } from 'react-native';

import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';

type Props = {
  color: string;
  sendCount: number;
  maxSendCount: number;
};

export function ColorBar({ color, sendCount, maxSendCount }: Props) {
  const ratio = maxSendCount === 0 ? 0 : Math.min(1, sendCount / maxSendCount);
  const hex = resolveColorHex(color);
  const label = resolveColorLabel(color);
  const needsBorder = color === 'white' || color === 'yellow';

  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-text-secondary text-sm" style={{ width: 40 }}>
        {label}
      </Text>
      <View className="flex-1 h-3 bg-background-tertiary rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{
            width: `${ratio * 100}%`,
            backgroundColor: hex,
            ...(needsBorder ? { borderWidth: 1, borderColor: '#D4D4D8' } : null),
          }}
        />
      </View>
      <Text
        className="text-text-primary text-sm font-medium"
        style={{ width: 56, textAlign: 'right' }}
      >
        {sendCount}완등
      </Text>
    </View>
  );
}
