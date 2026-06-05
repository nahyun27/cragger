import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  useMyGymSubmissions,
  type GymSubmission,
  type SubmissionStatus,
} from '@/hooks/use-gym-submissions';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

type IconName = 'clock' | 'check-circle' | 'x-circle';
type StatusMeta = {
  label: string;
  icon: IconName;
  fg: (c: ThemeColors) => string;
  bg: (c: ThemeColors) => string;
};

const STATUS_META: Record<SubmissionStatus, StatusMeta> = {
  pending: {
    label: '승인 대기',
    icon: 'clock',
    fg: (c) => c.status.warning,
    bg: (c) => c.status.warningBg,
  },
  approved: {
    label: '반영됨',
    icon: 'check-circle',
    fg: (c) => c.status.success,
    bg: (c) => c.status.successBg,
  },
  rejected: {
    label: '거절됨',
    icon: 'x-circle',
    fg: (c) => c.status.danger,
    bg: (c) => c.status.dangerBg,
  },
};

const FIELD_LABEL: Record<string, string> = {
  city: '시/도', district: '구/군', address: '주소',
  size_pyeong: '평수', floors_count: '층수', opened_at: '오픈일',
  description: '소개', parking_info: '주차 안내',
  phone: '전화', website_url: '웹사이트', instagram_handle: '인스타',
  has_boulder: '볼더링', has_lead: '리드', has_top_rope: '탑로프',
  has_speed: '스피드', has_auto_belay: '오토빌레이',
  has_moonboard: '문보드', has_kilter: '킬터', has_tension: '텐션',
  has_shower: '샤워실', has_locker: '락커', has_parking: '주차장',
  logo_url: '로고', add_colors: '색깔 추가', remove_colors: '색깔 제거',
  color_order: '색깔 순서',
};

function relativeDate(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  const d = new Date(iso);
  return `${d.getFullYear().toString().slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function MySubmissionsScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error } = useMyGymSubmissions();

  const counts = useMemo(() => {
    const out: Record<SubmissionStatus, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const r of data ?? []) out[r.status]++;
    return out;
  }, [data]);

  const grouped = useMemo(() => {
    const order: SubmissionStatus[] = ['pending', 'approved', 'rejected'];
    const map = new Map<SubmissionStatus, GymSubmission[]>();
    for (const st of order) map.set(st, []);
    for (const r of data ?? []) map.get(r.status)?.push(r);
    return order.map((st) => ({ status: st, list: map.get(st)! }));
  }, [data]);

  const total = data?.length ?? 0;
  const approveRate = total > 0 ? Math.round((counts.approved / total) * 100) : 0;

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader title="내 제보 내역" onBack={() => router.back()} count={total} />

      <ScrollView
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 12 }]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && <ActivityIndicator color={c.brand.primary} style={{ marginTop: 32 }} />}
        {error && <Text style={s.error}>{error.message}</Text>}

        {total > 0 && (
          <View style={s.heroCard}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={s.heroNumber}>{total}</Text>
              <Text style={s.heroLabel}>건 제보</Text>
              {counts.approved > 0 && (
                <Text style={s.heroSubLabel}>· 반영률 {approveRate}%</Text>
              )}
            </View>
            <View style={s.statRow}>
              <StatPill meta={STATUS_META.pending} count={counts.pending} c={c} />
              <StatPill meta={STATUS_META.approved} count={counts.approved} c={c} />
              <StatPill meta={STATUS_META.rejected} count={counts.rejected} c={c} />
            </View>
          </View>
        )}

        {data && data.length === 0 && !isLoading && (
          <EmptyState
            icon="edit-3"
            title="아직 보낸 제보가 없어요"
            description={'암장 상세에서 정보 제보 버튼을 누르면\n바꾸고 싶은 항목만 골라 보낼 수 있어요'}
          />
        )}

        {grouped.map(({ status, list }) =>
          list.length === 0 ? null : (
            <View key={status} style={s.section}>
              <View style={s.sectionHeader}>
                <View style={[s.sectionDot, { backgroundColor: STATUS_META[status].fg(c) }]} />
                <Text style={[s.sectionTitle, { color: STATUS_META[status].fg(c) }]}>
                  {STATUS_META[status].label}
                </Text>
                <Text style={s.sectionCount}>{list.length}</Text>
              </View>
              <View style={s.rowGroup}>
                {list.map((sub, i) => (
                  <SubmissionRow key={sub.id} sub={sub} isLast={i === list.length - 1} />
                ))}
              </View>
            </View>
          ),
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ meta, count, c }: { meta: StatusMeta; count: number; c: ThemeColors }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: meta.bg(c),
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 10,
      gap: 4,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Feather name={meta.icon} size={11} color={meta.fg(c)} />
        <Text style={{ fontSize: 10.5, fontWeight: '900', color: meta.fg(c), letterSpacing: 0.2 }}>
          {meta.label}
        </Text>
      </View>
      <Text style={{ fontSize: 22, fontWeight: '900', color: meta.fg(c), letterSpacing: -0.5 }}>
        {count}
      </Text>
    </View>
  );
}

function SubmissionRow({ sub, isLast }: { sub: GymSubmission; isLast: boolean }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const gymName = sub.gym
    ? `${sub.gym.name}${sub.gym.branch ? ` ${sub.gym.branch}` : ''}`
    : '신규 암장';
  const changedKeys = Object.keys(sub.changes ?? {});
  const time = relativeDate(sub.created_at);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/profile/submissions/[id]', params: { id: sub.id } } as never)}
    >
      {({ pressed }) => (
        <View
          style={[
            s.row,
            !isLast && s.rowDivider,
            pressed && { backgroundColor: c.bg.subtle },
          ]}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <View style={s.rowTitleRow}>
              <Text style={s.rowTitle} numberOfLines={1}>{gymName}</Text>
              {sub.gym_id == null && (
                <View style={s.newBadge}>
                  <Text style={s.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
            {changedKeys.length > 0 ? (
              <View style={s.chipWrap}>
                {changedKeys.slice(0, 5).map((k) => (
                  <View key={k} style={s.fieldChip}>
                    <Text style={s.fieldChipText}>{FIELD_LABEL[k] ?? k}</Text>
                  </View>
                ))}
                {changedKeys.length > 5 && (
                  <Text style={s.fieldChipMore}>+{changedKeys.length - 5}</Text>
                )}
              </View>
            ) : (
              <Text style={s.rowFields}>메모만</Text>
            )}
            {sub.admin_notes && (
              <View style={s.adminNoteBox}>
                <Feather name="message-square" size={11} color={c.text.tertiary} />
                <Text style={s.adminNoteText} numberOfLines={2}>{sub.admin_notes}</Text>
              </View>
            )}
            <View style={s.metaRow}>
              <Feather name="clock" size={10} color={c.text.muted} />
              <Text style={s.rowDate}>{time}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={c.text.muted} />
        </View>
      )}
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    list: { padding: 18, gap: 18, paddingBottom: 12 },
    error: { color: c.status.danger, textAlign: 'center', marginTop: 16 },

    // hero (요약 카드)
    heroCard: {
      backgroundColor: c.bg.card,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      padding: 16,
      gap: 12,
    },
    heroNumber: {
      fontSize: 28,
      fontWeight: '900',
      color: c.text.primary,
      letterSpacing: -1,
    },
    heroLabel: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text.secondary,
    },
    heroSubLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text.tertiary,
    },
    statRow: { flexDirection: 'row', gap: 8 },

    // sections
    section: { gap: 8 },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      paddingHorizontal: 4,
    },
    sectionDot: {
      width: 8, height: 8, borderRadius: 4,
    },
    sectionTitle: {
      fontSize: 12, fontWeight: '900',
      letterSpacing: 0.3, textTransform: 'uppercase',
    },
    sectionCount: {
      color: c.text.muted, fontWeight: '800', fontSize: 11,
      backgroundColor: c.bg.subtle,
      paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 999,
      minWidth: 22, textAlign: 'center',
    },

    rowGroup: {
      backgroundColor: c.bg.card,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      overflow: 'hidden',
    },

    // empty state
    emptyBox: {
      alignItems: 'center', paddingVertical: 56, gap: 10,
      paddingHorizontal: 24,
    },
    emptyIcon: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: c.brand.primaryLight,
      alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: {
      fontSize: 16, fontWeight: '900', color: c.text.primary,
      letterSpacing: -0.3,
    },
    emptySub: {
      fontSize: 12.5, color: c.text.tertiary, fontWeight: '600',
      textAlign: 'center', lineHeight: 19,
    },

    // row
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.subtle,
    },
    rowTitleRow: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    rowTitle: {
      fontSize: 14.5, fontWeight: '900', color: c.text.primary,
      letterSpacing: -0.2, flexShrink: 1,
    },
    newBadge: {
      paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 5,
      backgroundColor: c.brand.primary,
    },
    newBadgeText: {
      fontSize: 9, fontWeight: '900', color: c.brand.onPrimary, letterSpacing: 0.5,
    },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
    fieldChip: {
      backgroundColor: c.bg.subtle,
      paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6,
    },
    fieldChipText: { fontSize: 10.5, fontWeight: '800', color: c.text.secondary },
    fieldChipMore: { fontSize: 10.5, fontWeight: '700', color: c.text.muted },
    rowFields: { fontSize: 12, fontWeight: '600', color: c.text.tertiary },
    adminNoteBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 5,
      backgroundColor: c.bg.subtle,
      paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8,
    },
    adminNoteText: {
      flex: 1, fontSize: 11.5, color: c.text.secondary, fontWeight: '600', lineHeight: 16,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rowDate: { fontSize: 11, color: c.text.muted, fontWeight: '700' },
  });
}
