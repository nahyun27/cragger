import { customAlert } from '@/components/ui/custom-alert';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useGymDetail } from '@/hooks/use-gym-detail';
import {
  useApproveGymSubmission,
  useIsAdmin,
  usePendingGymSubmissions,
  useRejectGymSubmission,
  type GymSubmission,
} from '@/hooks/use-gym-submissions';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

const FIELD_LABEL: Record<string, string> = {
  city: '시/도',
  district: '구/군',
  address: '주소',
  size_pyeong: '평수',
  floors_count: '층수',
  opened_at: '오픈일',
  description: '소개',
  parking_info: '주차 안내',
  phone: '전화',
  website_url: '웹사이트',
  instagram_handle: '인스타',
  has_boulder: '볼더링',
  has_lead: '리드',
  has_top_rope: '탑로프',
  has_speed: '스피드',
  has_auto_belay: '오토빌레이',
  has_moonboard: '문보드',
  has_kilter: '킬터',
  has_tension: '텐션',
  has_shower: '샤워실',
  has_locker: '락커',
  has_parking: '주차장',
  logo_url: '로고',
};

function formatValue(field: string, value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? '있음' : '없음';
  if (field === 'logo_url' && typeof value === 'string') return '이미지 첨부됨';
  return String(value);
}

export default function AdminSubmissionsScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { data, isLoading, error } = usePendingGymSubmissions(isAdmin === true);

  if (isAdminLoading) {
    return (
      <SafeAreaView style={s.loading} edges={['top']}>
        <ActivityIndicator color={c.brand.primary} />
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
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
          <Text style={s.headerTitle}>관리자</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.deny}>
          <Feather name="lock" size={32} color={c.text.muted} />
          <Text style={s.denyTitle}>접근 권한이 없어요</Text>
          <Text style={s.denySub}>관리자 계정만 이용할 수 있어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={s.headerTitle}>제보 승인 대기 {data ? data.length : ''}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {isLoading && <ActivityIndicator color={c.brand.primary} style={{ marginTop: 32 }} />}
        {error && <Text style={s.error}>{error.message}</Text>}
        {data && data.length === 0 && (
          <View style={s.emptyBox}>
            <Feather name="check-circle" size={28} color={c.text.muted} />
            <Text style={s.emptyTitle}>승인 대기 중인 제보가 없어요</Text>
          </View>
        )}
        {data?.map((sub) => (
          <SubmissionCard key={sub.id} sub={sub} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function SubmissionCard({ sub }: { sub: GymSubmission }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: gym } = useGymDetail(sub.gym_id ?? undefined);
  const approve = useApproveGymSubmission();
  const reject = useRejectGymSubmission();
  const gymName = sub.gym ? `${sub.gym.name}${sub.gym.branch ? ` ${sub.gym.branch}` : ''}` : '신규 암장';
  const submitter = sub.submitter?.display_name || sub.submitter?.username || '익명';

  // diff rows
  const changedFields = Object.keys(sub.changes ?? {});

  function handleApprove() {
    customAlert(`${gymName} — 제보를 승인할까요?`, '변경사항이 즉시 반영됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '승인',
        onPress: () =>
          approve
            .mutateAsync(sub.id)
            .catch((e) => customAlert('실패', e instanceof Error ? e.message : '오류')),
      },
    ]);
  }
  function handleReject() {
    customAlert(`${gymName} — 제보를 거절할까요?`, '사유는 입력 안 해도 OK (간단 거절)', [
      { text: '취소', style: 'cancel' },
      {
        text: '거절',
        style: 'destructive',
        onPress: () =>
          reject
            .mutateAsync({ submissionId: sub.id })
            .catch((e) => customAlert('실패', e instanceof Error ? e.message : '오류')),
      },
    ]);
  }

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{gymName}</Text>
          <Text style={s.cardMeta}>
            제보: {submitter} · {new Date(sub.created_at).toLocaleDateString('ko-KR')}
          </Text>
        </View>
      </View>
      {sub.note && (
        <View style={s.noteBox}>
          <Text style={s.noteText}>{sub.note}</Text>
        </View>
      )}
      <View style={s.diffList}>
        {changedFields.length === 0 ? (
          <Text style={s.diffEmpty}>변경 항목 없음 (메모만 제출)</Text>
        ) : (
          changedFields.map((f) => {
            const label = FIELD_LABEL[f] ?? f;
            const oldV = (gym as unknown as Record<string, unknown>)?.[f];
            const newV = (sub.changes as unknown as Record<string, unknown>)[f];
            return (
              <View key={f} style={s.diffRow}>
                <Text style={s.diffLabel}>{label}</Text>
                <View style={s.diffValues}>
                  <Text style={s.diffOld} numberOfLines={2}>{formatValue(f, oldV)}</Text>
                  <Feather name="arrow-right" size={11} color={c.text.tertiary} />
                  <Text style={s.diffNew} numberOfLines={2}>{formatValue(f, newV)}</Text>
                </View>
                {f === 'logo_url' && typeof newV === 'string' && (
                  <Image source={{ uri: newV }} style={s.logoPreview} />
                )}
              </View>
            );
          })
        )}
      </View>
      <View style={s.actionRow}>
        <Pressable onPress={handleReject} style={({ pressed }) => [s.rejectBtn, pressed && { opacity: 0.7 }]}>
          <Feather name="x" size={16} color={c.status.danger} />
          <Text style={s.rejectText}>거절</Text>
        </Pressable>
        <Pressable onPress={handleApprove} style={({ pressed }) => [s.approveBtn, pressed && { opacity: 0.85 }]}>
          <Feather name="check" size={16} color={c.brand.onPrimary} />
          <Text style={s.approveText}>승인</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    deny: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
    denyTitle: { fontSize: 15, fontWeight: '800', color: c.text.primary },
    denySub: { fontSize: 13, color: c.text.tertiary, textAlign: 'center' },
    list: { padding: 20, gap: 14 },
    emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 8 },
    emptyTitle: { fontSize: 14, fontWeight: '700', color: c.text.tertiary },
    error: { color: c.status.danger, textAlign: 'center', marginTop: 16 },
    card: {
      backgroundColor: c.bg.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      padding: 16,
      gap: 12,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    cardTitle: { fontSize: 15, fontWeight: '900', color: c.text.primary, letterSpacing: -0.3 },
    cardMeta: { fontSize: 11, color: c.text.tertiary, fontWeight: '600', marginTop: 2 },
    noteBox: {
      backgroundColor: c.bg.subtle,
      borderRadius: 10,
      padding: 10,
    },
    noteText: { fontSize: 12, color: c.text.secondary, fontWeight: '600', lineHeight: 17 },
    diffList: { gap: 10 },
    diffEmpty: { fontSize: 12, color: c.text.muted, fontStyle: 'italic' },
    diffRow: { gap: 4 },
    diffLabel: { fontSize: 11, fontWeight: '700', color: c.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.2 },
    diffValues: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    diffOld: { fontSize: 13, color: c.text.muted, textDecorationLine: 'line-through', flexShrink: 1 },
    diffNew: { fontSize: 13, color: c.text.primary, fontWeight: '700', flexShrink: 1 },
    logoPreview: {
      width: 80,
      height: 80,
      borderRadius: 12,
      marginTop: 6,
    },
    actionRow: { flexDirection: 'row', gap: 8 },
    rejectBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: c.status.dangerBg,
      borderRadius: 12,
      paddingVertical: 12,
    },
    rejectText: { color: c.status.danger, fontSize: 14, fontWeight: '800' },
    approveBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: c.brand.primary,
      borderRadius: 12,
      paddingVertical: 12,
    },
    approveText: { color: c.brand.onPrimary, fontSize: 14, fontWeight: '800' },
  });
}
