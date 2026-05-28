import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useThemeColors, type ThemeColors } from '@/lib/theme';

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
  discipline?: 'boulder' | 'lead' | 'mixed' | 'empty';
  max_lead_grade?: string | null;
};

export function SessionRow({ session }: { session: SessionSummary }) {
  const router = useRouter();
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const gymName = session.gym?.name || '암장 미선택';
  const branchName = session.gym?.branch ? ` ${session.gym.branch}` : '';
  const hasSends = session.send_count > 0;

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
            <Feather name="clock" size={10} color={c.text.muted} />
            <Text style={s.sessionMetaText}>
              {session.duration_min != null ? formatDuration(session.duration_min) : '기록 없음'}
            </Text>
          </View>
        </View>
        {session.discipline === 'lead' && session.max_lead_grade ? (
          <View style={[s.sessionBadge, s.sessionBadgeLead]}>
            <Text style={[s.sessionBadgeText, s.sessionBadgeTextLead]}>
              {session.max_lead_grade} · {session.send_count}
            </Text>
          </View>
        ) : (
          <View style={[s.sessionBadge, hasSends ? s.sessionBadgeActive : s.sessionBadgeMuted]}>
            <Text style={[s.sessionBadgeText, hasSends ? s.sessionBadgeTextActive : s.sessionBadgeTextMuted]}>
              완등 {session.send_count}
            </Text>
          </View>
        )}
        <Feather name="chevron-right" size={16} color={c.border.strong} style={s.chevronRight} />
      </View>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    sessionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.bg.card,
      borderWidth: 1,
      borderColor: c.border.subtle,
      borderRadius: 20,
      padding: 14,
      shadowColor: c.shadow.color,
      shadowOpacity: c.shadow.opacity,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    sessionDateBadge: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.bg.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    sessionDateMonth: {
      fontSize: 10,
      fontWeight: '700',
      color: c.text.tertiary,
    },
    sessionDateDay: {
      fontSize: 16,
      fontWeight: '900',
      color: c.text.primary,
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
      color: c.text.primary,
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
      color: c.text.tertiary,
    },
    sessionBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      marginRight: 4,
    },
    sessionBadgeActive: {
      backgroundColor: c.bg.accent,
      borderColor: c.brand.primaryLight,
    },
    sessionBadgeMuted: {
      backgroundColor: c.bg.subtle,
      borderColor: c.border.subtle,
    },
    sessionBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    sessionBadgeTextActive: {
      color: c.brand.primaryDeep,
    },
    sessionBadgeTextMuted: {
      color: c.text.muted,
    },
    sessionBadgeLead: {
      backgroundColor: c.status.warningBg,
      borderColor: c.status.warning,
    },
    sessionBadgeTextLead: {
      color: c.status.warning,
    },
    chevronRight: {
      marginLeft: 2,
    },
  });
}
