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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
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
  name: '암장 이름', branch: '지점',
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

function formatValue(field: string, value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? '있음' : '없음';
  if (field === 'logo_url' && typeof value === 'string') return '이미지 첨부됨';
  return String(value);
}

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

export default function AdminSubmissionsScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <SafeAreaView style={s.container} edges={['left', 'right']}>
        <ScreenHeader title="관리자" onBack={() => router.back()} />
        <View style={s.deny}>
          <View style={s.denyIcon}>
            <Feather name="lock" size={28} color={c.text.muted} />
          </View>
          <Text style={s.denyTitle}>접근 권한이 없어요</Text>
          <Text style={s.denySub}>관리자 계정만 이용할 수 있어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const count = data?.length ?? 0;

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader title="제보 승인 대기" onBack={() => router.back()} count={count} />

      <ScrollView
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 12 }]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && <ActivityIndicator color={c.brand.primary} style={{ marginTop: 32 }} />}
        {error && <Text style={s.error}>{error.message}</Text>}
        {data && data.length === 0 && (
          <EmptyState
            icon="check-circle"
            tone="success"
            title="밀린 제보가 없어요"
            description="새 제보가 들어오면 여기 표시돼요"
          />
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
  const submitterInitial = submitter[0] ?? '?';
  const time = relativeDate(sub.created_at);
  const changedFields = Object.keys(sub.changes ?? {});
  const isNew = sub.gym_id == null;

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
    customAlert(`${gymName} — 제보를 거절할까요?`, '사유는 입력 안 해도 OK', [
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
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={s.cardTitle}>{gymName}</Text>
            {isNew && (
              <View style={s.newBadge}>
                <Text style={s.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {sub.submitter?.avatar_url ? (
              <Image source={{ uri: sub.submitter.avatar_url }} style={s.submitterAvatar} />
            ) : (
              <View style={s.submitterAvatarFallback}>
                <Text style={s.submitterAvatarText}>{submitterInitial.toUpperCase()}</Text>
              </View>
            )}
            <Text style={s.cardMeta} numberOfLines={1}>
              {submitter} · {time}
            </Text>
          </View>
        </View>
      </View>

      {sub.note && (
        <View style={s.noteBox}>
          <Feather name="message-circle" size={11} color={c.text.tertiary} />
          <Text style={s.noteText}>{sub.note}</Text>
        </View>
      )}

      <View style={s.diffList}>
        {changedFields.length === 0 ? (
          <Text style={s.diffEmpty}>변경 항목 없음 (메모만 제출)</Text>
        ) : (
          (() => {
            const otherFields = changedFields.filter(
              (f) => f !== 'add_colors' && f !== 'remove_colors' && f !== 'color_order',
            );
            const hasColorBlock =
              !!sub.changes?.add_colors || !!sub.changes?.color_order || !!sub.changes?.remove_colors;
            const rows: React.ReactNode[] = [];

            otherFields.forEach((f, i) => {
              const isLast = i === otherFields.length - 1 && !hasColorBlock;
              const label = FIELD_LABEL[f] ?? f;
              const newV = (sub.changes as unknown as Record<string, unknown>)[f];
              const oldV = (gym as unknown as Record<string, unknown>)?.[f];
              if (f === 'logo_url' && typeof newV === 'string') {
                rows.push(
                  <View key={f} style={[s.diffRow, !isLast && s.diffRowBorder]}>
                    <Text style={s.diffLabel}>{label}</Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      {typeof oldV === 'string' && <Image source={{ uri: oldV }} style={s.logoSm} />}
                      <Feather name="arrow-right" size={11} color={c.text.tertiary} />
                      <Image source={{ uri: newV }} style={s.logoSm} />
                    </View>
                  </View>,
                );
                return;
              }
              rows.push(
                <View key={f} style={[s.diffRow, !isLast && s.diffRowBorder]}>
                  <Text style={s.diffLabel}>{label}</Text>
                  <View style={s.diffValues}>
                    <Text style={s.diffOld} numberOfLines={2}>{formatValue(f, oldV)}</Text>
                    <Feather name="arrow-right" size={11} color={c.text.tertiary} />
                    <Text style={s.diffNew} numberOfLines={2}>{formatValue(f, newV)}</Text>
                  </View>
                </View>,
              );
            });

            if (hasColorBlock) {
              rows.push(
                <View key="__colors__" style={s.diffRow}>
                  <Text style={s.diffLabel}>수정된 난이도</Text>
                  <ColorChangeInline
                    addColors={(sub.changes?.add_colors as string[] | undefined) ?? []}
                    removeColors={(sub.changes?.remove_colors as string[] | undefined) ?? []}
                    newOrder={(sub.changes?.color_order as string[] | undefined) ?? null}
                  />
                </View>,
              );
            }
            return rows;
          })()
        )}
      </View>

      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        <Pressable
          onPress={handleReject}
          disabled={reject.isPending}
          style={{ flex: 1, marginRight: 5 }}
        >
          {({ pressed }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.status.dangerBg,
                borderRadius: 12,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: c.status.danger + '40',
                opacity: reject.isPending ? 0.5 : pressed ? 0.7 : 1,
              }}
            >
              {reject.isPending ? (
                <ActivityIndicator size="small" color={c.status.danger} />
              ) : (
                <>
                  <Feather name="x" size={16} color={c.status.danger} style={{ marginRight: 6 }} />
                  <Text style={{ color: c.status.danger, fontSize: 14, fontWeight: '900' }}>거절</Text>
                </>
              )}
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={handleApprove}
          disabled={approve.isPending}
          style={{ flex: 1, marginLeft: 5 }}
        >
          {({ pressed }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.brand.primary,
                borderRadius: 12,
                paddingVertical: 14,
                opacity: approve.isPending ? 0.6 : pressed ? 0.85 : 1,
              }}
            >
              {approve.isPending ? (
                <ActivityIndicator size="small" color={c.brand.onPrimary} />
              ) : (
                <>
                  <Feather name="check" size={16} color={c.brand.onPrimary} style={{ marginRight: 6 }} />
                  <Text style={{ color: c.brand.onPrimary, fontSize: 14, fontWeight: '900' }}>승인</Text>
                </>
              )}
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function ColorChangeInline({ addColors, removeColors, newOrder }: {
  addColors: string[];
  removeColors: string[];
  newOrder: string[] | null;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const addSet = new Set(addColors.map((x) => x.toLowerCase()));
  const primary = (newOrder && newOrder.length > 0) ? newOrder : addColors;
  const hasPrimary = primary.length > 0;
  const hasRemoved = removeColors.length > 0;
  return (
    <View style={{ gap: 4, marginTop: 2 }}>
      {hasPrimary && primary.map((col, i) => {
        const isAdded = addSet.has(col.toLowerCase());
        return (
          <View key={`p-${col}-${i}`} style={s.colorOrderRow}>
            <Text style={s.colorOrderIdx}>{i + 1}</Text>
            <View style={[s.colorDotMd, { backgroundColor: resolveColorHex(col) }]} />
            <Text style={s.colorOrderLabel}>{resolveColorLabel(col)}</Text>
            {isAdded && (
              <View style={s.addedBadge}>
                <Text style={s.addedBadgeText}>추가</Text>
              </View>
            )}
          </View>
        );
      })}
      {hasRemoved && (
        <View style={{ marginTop: hasPrimary ? 8 : 2, gap: 4 }}>
          <Text style={s.removedHeader}>제거된 색</Text>
          {removeColors.map((col, i) => (
            <View key={`r-${col}-${i}`} style={[s.colorOrderRow, { opacity: 0.65 }]}>
              <Feather name="minus" size={11} color={c.status.danger} />
              <View style={[s.colorDotMd, { backgroundColor: resolveColorHex(col) }]} />
              <Text style={[s.colorOrderLabel, { textDecorationLine: 'line-through', color: c.text.tertiary }]}>
                {resolveColorLabel(col)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg.primary },
    deny: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
    denyIcon: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.bg.subtle, alignItems: 'center', justifyContent: 'center',
    },
    denyTitle: { fontSize: 15, fontWeight: '900', color: c.text.primary },
    denySub: { fontSize: 13, color: c.text.tertiary, textAlign: 'center', fontWeight: '600' },
    list: { padding: 18, gap: 14, paddingBottom: 12 },
    emptyBox: { alignItems: 'center', paddingVertical: 56, gap: 10 },
    emptyIcon: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.status.successBg, alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: { fontSize: 15, fontWeight: '900', color: c.text.primary },
    emptySub: { fontSize: 12, color: c.text.tertiary, fontWeight: '600' },
    error: { color: c.status.danger, textAlign: 'center', marginTop: 16 },
    card: {
      backgroundColor: c.bg.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      padding: 14,
      gap: 12,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '900', color: c.text.primary, letterSpacing: -0.3 },
    cardMeta: { fontSize: 11.5, color: c.text.tertiary, fontWeight: '700', flex: 1 },
    newBadge: {
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
      backgroundColor: c.brand.primary,
    },
    newBadgeText: { fontSize: 9, fontWeight: '900', color: c.brand.onPrimary, letterSpacing: 0.5 },
    submitterAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: c.bg.subtle },
    submitterAvatarFallback: {
      width: 20, height: 20, borderRadius: 10, backgroundColor: c.bg.subtle,
      alignItems: 'center', justifyContent: 'center',
    },
    submitterAvatarText: { fontSize: 10, fontWeight: '900', color: c.text.tertiary },
    noteBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 6,
      backgroundColor: c.bg.subtle, borderRadius: 10, padding: 10,
    },
    noteText: { flex: 1, fontSize: 12.5, color: c.text.secondary, fontWeight: '600', lineHeight: 18 },
    diffList: {
      backgroundColor: c.bg.subtle,
      borderRadius: 10,
      paddingHorizontal: 2, paddingVertical: 2,
    },
    diffEmpty: { fontSize: 12, color: c.text.muted, fontStyle: 'italic', padding: 10 },
    diffRow: { gap: 4, paddingHorizontal: 10, paddingVertical: 9 },
    diffRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.subtle,
    },
    diffLabel: {
      fontSize: 10.5, fontWeight: '900', color: c.text.tertiary,
      letterSpacing: 0.3, textTransform: 'uppercase',
    },
    diffValues: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    diffOld: {
      fontSize: 13, color: c.text.muted, textDecorationLine: 'line-through',
      flexShrink: 1, fontWeight: '600',
    },
    diffNew: { fontSize: 13, color: c.text.primary, fontWeight: '800', flexShrink: 1 },
    logoSm: { width: 56, height: 56, borderRadius: 10 },
    colorChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    colorChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.bg.card,
      paddingLeft: 7, paddingRight: 8, paddingVertical: 3, borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth, borderColor: c.border.subtle,
    },
    colorChipIdx: {
      fontSize: 9, fontWeight: '900', color: c.text.muted, minWidth: 10, textAlign: 'center',
    },
    colorDot: {
      width: 9, height: 9, borderRadius: 4.5,
      borderWidth: 0.5, borderColor: '#cbd5e1',
    },
    colorChipText: { fontSize: 11, fontWeight: '800', color: c.text.primary },
    colorOrderRow: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      paddingVertical: 6, paddingHorizontal: 9,
      backgroundColor: c.bg.card, borderRadius: 9,
      borderWidth: StyleSheet.hairlineWidth, borderColor: c.border.subtle,
    },
    colorOrderIdx: {
      fontSize: 10.5, fontWeight: '900', color: c.text.tertiary,
      minWidth: 14, textAlign: 'center',
    },
    colorDotMd: {
      width: 14, height: 14, borderRadius: 7,
      borderWidth: 1, borderColor: c.border.subtle,
    },
    colorOrderLabel: { flex: 1, fontSize: 12.5, fontWeight: '800', color: c.text.primary },
    addedBadge: {
      backgroundColor: c.status.successBg,
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
    },
    addedBadgeText: { fontSize: 9.5, fontWeight: '900', color: c.status.success, letterSpacing: 0.2 },
    removedHeader: {
      fontSize: 10.5, fontWeight: '900', color: c.status.danger,
      letterSpacing: 0.3, textTransform: 'uppercase',
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
    rejectText: { color: c.status.danger, fontSize: 14, fontWeight: '900' },
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
    approveText: { color: c.brand.onPrimary, fontSize: 14, fontWeight: '900' },
  });
}
