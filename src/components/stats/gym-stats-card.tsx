import React, { useState, useMemo} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ColorBar } from '@/components/stats/color-bar';
import type { GymStats } from '@/hooks/use-user-stats';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

type Props = {
  gym: GymStats;
  defaultExpanded?: boolean;
};

export function GymStatsCard({ gym, defaultExpanded = false }: Props) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: c.shadow.color,
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
    backgroundColor: c.bg.primary,
  },
  textContainer: {
    flex: 1,
  },
  gymName: {
    fontSize: 15,
    fontWeight: '800',
    color: c.text.primary,
  },
  visitText: {
    fontSize: 11,
    color: c.text.tertiary,
    fontWeight: '600',
    marginTop: 3,
  },
  toggleIcon: {
    fontSize: 12,
    color: c.text.muted,
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
    color: c.text.muted,
    fontWeight: '600',
  },
  });
}