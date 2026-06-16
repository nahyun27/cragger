import { useRouter } from '@/lib/router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { CategoryChip } from '@/components/ui/category-chip';
import { CLIMB_COLOR_HEX } from '@/constants/climb-colors';
import type { SessionCategory } from '@/constants/session-category';
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
  has_spray_wall?: boolean;
  max_lead_grade?: string | null;
  color_sends?: { color: string; count: number }[];
  lead_sends?: { grade: string; count: number }[];
  category?: SessionCategory | null;
};

const DISCIPLINE_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  boulder: { label: '볼더', bg: '#0e748522', fg: '#0e7485' },
  lead:    { label: '리드',   bg: '#7c3aed22', fg: '#7c3aed' },
  mixed:   { label: '혼합',   bg: '#0369a122', fg: '#0369a1' },
};

export function SessionRow({ session }: { session: SessionSummary }) {
  const router = useRouter();
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const gymName = session.gym?.name || '암장 미선택';
  const branchName = session.gym?.branch ? ` ${session.gym.branch}` : '';
  const hasSends = session.send_count > 0;
  const hasColorViz = !!session.color_sends && session.color_sends.length > 0;
  const hasLeadViz = !!session.lead_sends && session.lead_sends.length > 0;
  const isLead = session.discipline === 'lead' && !!session.max_lead_grade;

  const dateObj = new Date(`${session.session_date}T00:00:00`);
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={s.sessionCard}>
        <View style={s.sessionDateBadge}>
          <Text style={s.sessionDateTop}>{month}월 {day}일</Text>
          <Text style={s.sessionDateWeekday}>{weekday}</Text>
        </View>
        <View style={s.sessionInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[s.sessionGymName, { flexShrink: 1 }]} numberOfLines={1}>
              {gymName}{branchName}
            </Text>
            {session.category ? (
              <CategoryChip category={session.category} size="xs" />
            ) : (
              <>
                {session.discipline && DISCIPLINE_BADGE[session.discipline] && (
                  <View style={[s.discBadge, { backgroundColor: DISCIPLINE_BADGE[session.discipline].bg }]}>
                    <Text style={[s.discBadgeText, { color: DISCIPLINE_BADGE[session.discipline].fg }]}>
                      {DISCIPLINE_BADGE[session.discipline].label}
                    </Text>
                  </View>
                )}
                {session.has_spray_wall && (
                  <View style={[s.discBadge, { backgroundColor: '#06b6d422' }]}>
                    <Text style={[s.discBadgeText, { color: '#0891b2' }]}>스프레이월</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* 1순위: 색깔 시각화 (boulder + 색 기록 있을 때) */}
          {hasColorViz && (
            <View style={s.colorSendRow}>
              {session.color_sends!.slice(0, 6).map((cs) => {
                const hex = CLIMB_COLOR_HEX[cs.color as keyof typeof CLIMB_COLOR_HEX] ?? c.text.muted;
                const isLightHue = cs.color === 'white' || cs.color === 'yellow' || cs.color === 'lime';
                return (
                  <View
                    key={cs.color}
                    style={[
                      s.colorPill,
                      { backgroundColor: hex },
                      isLightHue && { borderWidth: 1, borderColor: c.border.subtle },
                    ]}
                  >
                    <Text
                      style={[s.colorPillCount, isLightHue ? s.colorPillCountDark : null]}
                    >
                      {cs.count}
                    </Text>
                  </View>
                );
              })}
              {session.color_sends!.length > 6 && (
                <Text style={s.colorMore}>+{session.color_sends!.length - 6}</Text>
              )}
            </View>
          )}

          {/* 리드 그레이드별 알약 — 어려운 그레이드 먼저 */}
          {hasLeadViz && (
            <View style={s.colorSendRow}>
              {session.lead_sends!.slice(0, 5).map((ls) => (
                <View key={ls.grade} style={s.leadPill}>
                  <Text style={s.leadPillGrade}>{ls.grade}</Text>
                  <Text style={s.leadPillCount}>×{ls.count}</Text>
                </View>
              ))}
              {session.lead_sends!.length > 5 && (
                <Text style={s.colorMore}>+{session.lead_sends!.length - 5}</Text>
              )}
            </View>
          )}

          {/* 메타: 시간 · (시각화 없을 때만 완등 N) */}
          <View style={s.sessionMetaRow}>
            <Feather name="clock" size={10} color={c.text.muted} />
            <Text style={s.sessionMetaText}>
              {session.duration_min != null ? formatDuration(session.duration_min) : '기록 없음'}
            </Text>
            {!hasColorViz && !hasLeadViz && hasSends && (
              <>
                <Text style={s.sessionMetaDot}>·</Text>
                <Text style={s.sessionMetaText}>완등 {session.send_count}</Text>
              </>
            )}
          </View>
        </View>

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
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: c.bg.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      gap: 1,
    },
    sessionDateTop: {
      fontSize: 10.5,
      fontWeight: '800',
      color: c.text.tertiary,
      letterSpacing: -0.2,
    },
    sessionDateWeekday: {
      fontSize: 20,
      fontWeight: '900',
      color: c.text.primary,
      letterSpacing: -0.5,
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
    discBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    discBadgeText: {
      fontSize: 10,
      fontWeight: '800',
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
    sessionMetaDot: {
      fontSize: 11,
      fontWeight: '800',
      color: c.text.muted,
      marginHorizontal: 2,
    },
    chevronRight: {
      marginLeft: 2,
    },

    // 색깔 시각화 — 작은 알약 (배경=색, 텍스트=개수)
    colorSendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 6,
      marginBottom: 2,
    },
    colorPill: {
      minWidth: 22,
      paddingHorizontal: 6,
      paddingVertical: 2.5,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorPillCount: {
      fontSize: 11,
      fontWeight: '900',
      color: '#ffffff',
      letterSpacing: -0.2,
    },
    colorPillCountDark: {
      color: '#0f172a',
    },
    colorMore: {
      fontSize: 11,
      fontWeight: '800',
      color: c.text.tertiary,
      alignSelf: 'center',
      marginLeft: 2,
    },

    // 리드 그레이드 알약 — 가로 나열
    leadPill: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 2,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: 999,
      backgroundColor: c.status.warningBg,
      borderWidth: 1,
      borderColor: c.status.warning,
    },
    leadPillGrade: {
      fontSize: 11,
      fontWeight: '900',
      color: c.status.warning,
      letterSpacing: -0.3,
    },
    leadPillCount: {
      fontSize: 9.5,
      fontWeight: '800',
      color: c.status.warning,
    },
  });
}
