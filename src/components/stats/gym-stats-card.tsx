import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ColorBar } from '@/components/stats/color-bar';
import type { GymStats } from '@/hooks/use-user-stats';

type Props = {
  gym: GymStats;
  defaultExpanded?: boolean;
};

export function GymStatsCard({ gym, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const maxSends = gym.colors.reduce(
    (max, c) => (c.sendCount > max ? c.sendCount : max),
    0,
  );

  return (
    <View className="bg-background-primary border border-border-subtle rounded-2xl overflow-hidden">
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        className="flex-row items-center px-4 py-3 gap-3 active:bg-background-secondary"
      >
        <View className="flex-1">
          <Text className="text-text-primary text-base font-semibold" numberOfLines={1}>
            {gym.name}
            {gym.branch ? ` ${gym.branch}` : ''}
          </Text>
          <Text className="text-text-tertiary text-xs mt-0.5">
            방문 {gym.visitCount}번
          </Text>
        </View>
        <Text className="text-text-tertiary text-base">{expanded ? '▲' : '▼'}</Text>
      </Pressable>
      {expanded && (
        <View className="px-4 pb-4 pt-1 gap-2">
          {gym.colors.length === 0 ? (
            <Text className="text-text-tertiary text-sm">완등 기록이 없어요</Text>
          ) : (
            gym.colors.map((c) => (
              <ColorBar
                key={c.color}
                color={c.color}
                sendCount={c.sendCount}
                maxSendCount={maxSends}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}
