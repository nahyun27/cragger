import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

function formatDuration(min: number): string {
  if (min < 60) return `${min}분`;
  if (min % 60 === 0) return `${min / 60}시간`;
  return `${(min / 60).toFixed(1)}시간`;
}

// Minimal structural type — any session-shaped row works here.
export type SessionSummary = {
  id: string;
  session_date: string;
  duration_min: number | null;
  gym: { id: string; name: string; branch: string | null } | null;
  send_count: number;
};

export function SessionRow({ session }: { session: SessionSummary }) {
  const router = useRouter();
  const gymName = session.gym?.name || '암장 미선택';
  const branchName = session.gym?.branch ? ` ${session.gym.branch}` : '';
  const hasSends = session.send_count > 0;

  // Date parsing
  const dateObj = new Date(`${session.session_date}T00:00:00`);
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={s.sessionCard}>
        <View style={s.sessionDateBadge}>
          <Text style={s.sessionDateMonth}>{month}월</Text>
          <Text style={s.sessionDateDay}>{day}</Text>
        </View>
        <View style={s.sessionInfo}>
          <Text style={s.sessionGymName} numberOfLines={1}>
            {gymName}
            {branchName}
          </Text>
          <View style={s.sessionMetaRow}>
            <Feather name="clock" size={10} color="#94a3b8" />
            <Text style={s.sessionMetaText}>
              {session.duration_min != null ? formatDuration(session.duration_min) : '기록 없음'}
            </Text>
          </View>
        </View>
        <View style={[s.sessionBadge, hasSends ? s.sessionBadgeActive : s.sessionBadgeMuted]}>
          <Text style={[s.sessionBadgeText, hasSends ? s.sessionBadgeTextActive : s.sessionBadgeTextMuted]}>
            완등 {session.send_count}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color="#cbd5e1" style={s.chevronRight} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  sessionDateBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionDateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  sessionDateDay: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 1,
  },
  sessionInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  sessionGymName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  sessionMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  sessionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 4,
  },
  sessionBadgeActive: {
    backgroundColor: '#ecfeff',
    borderColor: '#a5f3fc',
  },
  sessionBadgeMuted: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sessionBadgeTextActive: {
    color: '#0e7490',
  },
  sessionBadgeTextMuted: {
    color: '#94a3b8',
  },
  chevronRight: {
    marginLeft: 2,
  },
});
