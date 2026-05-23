import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
    <View style={s.card}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={[s.pressableHeader, expanded && s.pressedHeader]}>
          <View style={s.textContainer}>
            <Text style={s.gymName} numberOfLines={1}>
              {gym.name}
              {gym.branch ? ` ${gym.branch}` : ''}
            </Text>
            <Text style={s.visitText}>
              방문 {gym.visitCount}번
            </Text>
          </View>
          <Text style={s.toggleIcon}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>
      {expanded && (
        <View style={s.expandedContent}>
          {gym.colors.length === 0 ? (
            <Text style={s.emptyText}>완등 기록이 없어요</Text>
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

const s = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  pressableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  pressedHeader: {
    backgroundColor: '#f8fafc',
  },
  textContainer: {
    flex: 1,
  },
  gymName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  visitText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 3,
  },
  toggleIcon: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    gap: 10,
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
});
