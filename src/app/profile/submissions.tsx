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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import {
  useMyGymSubmissions,
  type GymSubmission,
  type SubmissionStatus,
} from '@/hooks/use-gym-submissions';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

const STATUS_META: Record<SubmissionStatus, {
  label: string; icon: 'clock' | 'check-circle' | 'x-circle';
  fg: (c: ThemeColors) => string; bg: (c: ThemeColors) => string;
}> = {
  pending: {
    label: '승인 대기',
    icon: 'clock',
    fg: (c) => c.text.tertiary,
    bg: (c) => c.bg.subtle,
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
  logo_url: '로고',
};

export default function MySubmissionsScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { data, isLoading, error } = useMyGymSubmissions();

  // 상태별 그룹
  const grouped = useMemo(() => {
    const order: SubmissionStatus[] = ['pending', 'approved', 'rejected'];
    const map = new Map<SubmissionStatus, GymSubmission[]>();
    for (const st of order) map.set(st, []);
    for (const r of data ?? []) map.get(r.status)?.push(r);
    return order.map((st) => ({ status: st, list: map.get(st)! }));
  }, [data]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          {({ pressed }) => (
            <View style={[s.headerBtn, pressed && { opacity: 0.6 }]}>
              <Feather name="arrow-left" size={22} color={c.text.primary} />
            </View>
          )}
        </Pressable>
        <Text style={s.headerTitle}>내 제보 내역</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {isLoading && <ActivityIndicator color={c.brand.primary} style={{ marginTop: 32 }} />}
        {error && <Text style={s.error}>{error.message}</Text>}
        {data && data.length === 0 && (
          <View style={s.emptyBox}>
            <Feather name="edit-3" size={28} color={c.text.muted} />
            <Text style={s.emptyTitle}>아직 보낸 제보가 없어요</Text>
            <Text style={s.emptySub}>암장 상세에서 ✏️ 아이콘으로 정보를 제보할 수 있어요</Text>
          </View>
        )}

        {grouped.map(({ status, list }) =>
          list.length === 0 ? null : (
            <View key={status} style={s.section}>
              <View style={s.sectionHeader}>
                <Feather
                  name={STATUS_META[status].icon}
                  size={13}
                  color={STATUS_META[status].fg(c)}
                />
                <Text style={[s.sectionTitle, { color: STATUS_META[status].fg(c) }]}>
                  {STATUS_META[status].label} <Text style={s.sectionCount}>{list.length}</Text>
                </Text>
              </View>
              {list.map((sub) => (
                <SubmissionRow key={sub.id} sub={sub} />
              ))}
            </View>
          ),
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SubmissionRow({ sub }: { sub: GymSubmission }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const gymName = sub.gym
    ? `${sub.gym.name}${sub.gym.branch ? ` ${sub.gym.branch}` : ''}`
    : '신규 암장';
  const changedKeys = Object.keys(sub.changes ?? {});
  const summary =
    changedKeys.length > 0
      ? changedKeys.map((k) => FIELD_LABEL[k] ?? k).join(', ')
      : '메모만';
  const date = new Date(sub.created_at).toLocaleDateString('ko-KR');
  const meta = STATUS_META[sub.status];

  return (
    <Pressable
      onPress={() => {
        if (sub.gym_id) {
          router.push({ pathname: '/gym/[id]', params: { id: sub.gym_id } } as never);
        }
      }}
      style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
    >
      <View style={[s.statusDot, { backgroundColor: meta.fg(c) }]} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{gymName}</Text>
        <Text style={s.rowFields} numberOfLines={1}>{summary}</Text>
        {sub.admin_notes && (
          <Text style={s.rowAdminNote} numberOfLines={2}>
            관리자: {sub.admin_notes}
          </Text>
        )}
        <Text style={s.rowDate}>{date}</Text>
      </View>
      {sub.gym_id && <Feather name="chevron-right" size={16} color={c.text.muted} />}
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.subtle,
      backgroundColor: c.bg.card,
    },
    headerBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: c.text.primary, fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
    list: { padding: 20, gap: 22 },
    section: { gap: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2, textTransform: 'uppercase' },
    sectionCount: { color: c.text.muted, fontWeight: '700' },
    error: { color: c.status.danger, textAlign: 'center', marginTop: 16 },
    emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 8 },
    emptyTitle: { fontSize: 14, fontWeight: '800', color: c.text.secondary },
    emptySub: { fontSize: 12, color: c.text.muted, fontWeight: '600', textAlign: 'center' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.bg.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      borderRadius: 14,
      padding: 14,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    rowTitle: { fontSize: 14, fontWeight: '800', color: c.text.primary },
    rowFields: { fontSize: 12, fontWeight: '600', color: c.text.tertiary },
    rowAdminNote: {
      fontSize: 12,
      fontWeight: '600',
      color: c.text.secondary,
      backgroundColor: c.bg.subtle,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
      marginTop: 2,
    },
    rowDate: { fontSize: 11, color: c.text.muted, fontWeight: '600' },
  });
}
