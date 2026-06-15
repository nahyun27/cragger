import { useLocalSearchParams, useRouter } from '@/lib/router';
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
import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import { useGymDetail } from '@/hooks/use-gym-detail';
import { useGymSubmission, type GymSubmission, type SubmissionStatus } from '@/hooks/use-gym-submissions';
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

const STATUS_META: Record<SubmissionStatus, {
  label: string; icon: 'clock' | 'check-circle' | 'x-circle';
  fg: (c: ThemeColors) => string; bg: (c: ThemeColors) => string;
}> = {
  pending: { label: '승인 대기', icon: 'clock', fg: (c) => c.status.warning, bg: (c) => c.status.warningBg },
  approved: { label: '반영됨', icon: 'check-circle', fg: (c) => c.status.success, bg: (c) => c.status.successBg },
  rejected: { label: '거절됨', icon: 'x-circle', fg: (c) => c.status.danger, bg: (c) => c.status.dangerBg },
};

function formatValue(field: string, value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? '있음' : '없음';
  if (field === 'logo_url' && typeof value === 'string') return '이미지 첨부됨';
  return String(value);
}

export default function MySubmissionDetailScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: sub, isLoading, error } = useGymSubmission(id);
  const { data: gym } = useGymDetail(sub?.gym_id ?? undefined);

  if (isLoading || !sub) {
    return (
      <SafeAreaView style={s.container} edges={['left', 'right']}>
        <ScreenHeader title="제보 상세" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {error
            ? <Text style={{ color: c.status.danger }}>{error.message}</Text>
            : <ActivityIndicator color={c.brand.primary} />}
        </View>
      </SafeAreaView>
    );
  }

  const gymName = sub.gym ? `${sub.gym.name}${sub.gym.branch ? ` ${sub.gym.branch}` : ''}` : '신규 암장';
  const meta = STATUS_META[sub.status];
  const changes = (sub.changes ?? {}) as Record<string, unknown>;
  const fields = Object.keys(changes);
  const created = new Date(sub.created_at).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader title="제보 상세" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 12 }]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.heroCard}>
          <View style={[s.statusPill, { backgroundColor: meta.bg(c) }]}>
            <Feather name={meta.icon} size={11} color={meta.fg(c)} />
            <Text style={[s.statusPillText, { color: meta.fg(c) }]}>{meta.label}</Text>
          </View>
          <Text style={s.heroTitle}>{gymName}</Text>
          <Text style={s.heroMeta}>{created} 보냄</Text>
          {sub.gym_id && (
            <Pressable
              onPress={() => router.push({ pathname: '/gym/[id]', params: { id: sub.gym_id! } } as never)}
            >
              {({ pressed }) => (
                <View style={[s.gymLink, pressed && { opacity: 0.7 }]}>
                  <Feather name="external-link" size={12} color={c.brand.primary} />
                  <Text style={s.gymLinkText}>암장 페이지 보기</Text>
                </View>
              )}
            </Pressable>
          )}
        </View>

        {sub.admin_notes && (
          <View style={[s.adminNoteCard, { borderColor: meta.fg(c) + '55' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="message-square" size={13} color={meta.fg(c)} />
              <Text style={[s.adminNoteTitle, { color: meta.fg(c) }]}>관리자 메모</Text>
            </View>
            <Text style={s.adminNoteText}>{sub.admin_notes}</Text>
          </View>
        )}

        {sub.note && (
          <View style={s.noteCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="edit-2" size={12} color={c.text.tertiary} />
              <Text style={s.noteLabel}>내가 남긴 메모</Text>
            </View>
            <Text style={s.noteText}>{sub.note}</Text>
          </View>
        )}

        <View style={s.changesBlock}>
          <Text style={s.changesHeader}>제보한 변경사항</Text>
          {fields.length === 0 ? (
            <Text style={s.diffEmpty}>변경 항목 없음 (메모만 제출)</Text>
          ) : (
            <View style={s.diffList}>
              {/* 일반 필드 */}
              {fields
                .filter((f) => f !== 'add_colors' && f !== 'remove_colors' && f !== 'color_order')
                .map((f) => (
                  <DiffRow
                    key={f}
                    field={f}
                    newValue={changes[f]}
                    oldValue={(gym as unknown as Record<string, unknown>)?.[f]}
                    status={sub.status}
                  />
                ))}
              {/* 색깔: 추가/순서/제거를 묶어서 하나의 "수정된 난이도" 블록으로 */}
              {Boolean(changes.add_colors || changes.color_order || changes.remove_colors) && (
                <ColorChangeBlock
                  addColors={(changes.add_colors as string[] | undefined) ?? []}
                  removeColors={(changes.remove_colors as string[] | undefined) ?? []}
                  newOrder={(changes.color_order as string[] | undefined) ?? null}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ColorChangeBlock({
  addColors, removeColors, newOrder,
}: {
  addColors: string[];
  removeColors: string[];
  newOrder: string[] | null;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const addSet = new Set(addColors.map((x) => x.toLowerCase()));
  // primary 리스트: 순서 변경이 있으면 newOrder, 없으면 add_colors 만 노출
  const primary = (newOrder && newOrder.length > 0) ? newOrder : addColors;
  const hasPrimary = primary.length > 0;
  const hasRemoved = removeColors.length > 0;
  return (
    <View style={s.diffRow}>
      <Text style={s.diffLabel}>수정된 난이도</Text>
      {hasPrimary && (
        <View style={{ gap: 5, marginTop: 4 }}>
          {primary.map((col, i) => {
            const isAdded = addSet.has(col.toLowerCase());
            return (
              <View key={`${col}-${i}`} style={s.colorOrderRow}>
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
        </View>
      )}
      {hasRemoved && (
        <View style={{ marginTop: hasPrimary ? 12 : 4, gap: 5 }}>
          <Text style={s.removedHeader}>제거된 색</Text>
          {removeColors.map((col, i) => (
            <View key={`${col}-${i}`} style={[s.colorOrderRow, { opacity: 0.7 }]}>
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

function DiffRow({ field, newValue, oldValue, status }: {
  field: string; newValue: unknown; oldValue: unknown; status: SubmissionStatus;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const label = FIELD_LABEL[field] ?? field;

  if (field === 'logo_url' && typeof newValue === 'string') {
    return (
      <View style={s.diffRow}>
        <Text style={s.diffLabel}>{label}</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {typeof oldValue === 'string' && (
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Image source={{ uri: oldValue }} style={s.logoSm} />
              <Text style={s.diffOldLabel}>이전</Text>
            </View>
          )}
          <Feather name="arrow-right" size={12} color={c.text.tertiary} />
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Image source={{ uri: newValue }} style={s.logoSm} />
            <Text style={s.diffNewLabel}>제보</Text>
          </View>
        </View>
      </View>
    );
  }

  // 동등성 비교: 원래 비어있었는지(=추가) / 동일한 값으로 채워졌는지(=반영 완료)
  const newFormatted = formatValue(field, newValue);
  const oldFormatted = formatValue(field, oldValue);
  const wasEmpty = oldValue == null || oldValue === '';
  const sameAsNew = oldFormatted === newFormatted;

  // 1) 원래 비어 있던 항목: "추가" 로만 표시 (이전 값 = '—' 노출 안 함)
  if (wasEmpty) {
    return (
      <View style={s.diffRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={s.diffLabel}>{label}</Text>
          <View style={s.addedTag}>
            <Feather name="plus" size={9} color={c.status.success} />
            <Text style={s.addedTagText}>추가</Text>
          </View>
        </View>
        <Text style={s.diffNew} numberOfLines={4}>{newFormatted}</Text>
      </View>
    );
  }

  // 2) 승인 후 현재값과 제보값이 동일: 화살표 없이 한 줄로
  if (status !== 'pending' && sameAsNew) {
    return (
      <View style={s.diffRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={s.diffLabel}>{label}</Text>
          <View style={s.modifiedTag}>
            <Feather name="check" size={9} color={c.brand.primaryDeep} />
            <Text style={s.modifiedTagText}>수정됨</Text>
          </View>
        </View>
        <Text style={s.diffNew} numberOfLines={4}>{newFormatted}</Text>
      </View>
    );
  }

  // 3) 일반 diff
  return (
    <View style={s.diffRow}>
      <Text style={s.diffLabel}>{label}</Text>
      <View style={s.diffValues}>
        <Text style={s.diffOld} numberOfLines={3}>{oldFormatted}</Text>
        <Feather name="arrow-right" size={11} color={c.text.tertiary} />
        <Text style={s.diffNew} numberOfLines={3}>{newFormatted}</Text>
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    list: { padding: 18, gap: 14, paddingBottom: 12 },
    heroCard: {
      backgroundColor: c.bg.card,
      borderRadius: 16,
      padding: 16,
      gap: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
    },
    statusPill: {
      alignSelf: 'flex-start',
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    },
    statusPillText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.2 },
    heroTitle: { fontSize: 18, fontWeight: '900', color: c.text.primary, letterSpacing: -0.3 },
    heroMeta: { fontSize: 11.5, color: c.text.tertiary, fontWeight: '700' },
    gymLink: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      marginTop: 4, alignSelf: 'flex-start',
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
      backgroundColor: c.brand.primaryLight,
    },
    gymLinkText: { fontSize: 12, fontWeight: '800', color: c.brand.primary },
    adminNoteCard: {
      backgroundColor: c.bg.card,
      borderRadius: 14,
      padding: 14,
      gap: 6,
      borderWidth: 1,
    },
    adminNoteTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 0.2 },
    adminNoteText: { fontSize: 13.5, color: c.text.primary, fontWeight: '600', lineHeight: 19 },
    noteCard: {
      backgroundColor: c.bg.subtle,
      borderRadius: 12,
      padding: 12,
      gap: 5,
    },
    noteLabel: { fontSize: 11, fontWeight: '800', color: c.text.tertiary, letterSpacing: 0.2 },
    noteText: { fontSize: 13, color: c.text.secondary, fontWeight: '600', lineHeight: 19 },
    changesBlock: { gap: 10 },
    changesHeader: {
      fontSize: 12, fontWeight: '900', color: c.text.tertiary,
      letterSpacing: 0.3, textTransform: 'uppercase', paddingHorizontal: 2,
    },
    diffEmpty: {
      fontSize: 12, color: c.text.muted, fontStyle: 'italic',
      backgroundColor: c.bg.card, padding: 14, borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth, borderColor: c.border.subtle,
    },
    diffList: {
      backgroundColor: c.bg.card,
      borderRadius: 14,
      padding: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
    },
    diffRow: {
      gap: 6, paddingHorizontal: 12, paddingVertical: 10,
      borderRadius: 10,
    },
    diffLabel: {
      fontSize: 11, fontWeight: '900', color: c.text.tertiary,
      letterSpacing: 0.3, textTransform: 'uppercase',
    },
    diffValues: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    diffOld: {
      fontSize: 13, color: c.text.muted, textDecorationLine: 'line-through',
      flexShrink: 1, fontWeight: '600',
    },
    diffOldLabel: { fontSize: 10, color: c.text.muted, fontWeight: '700' },
    diffNew: { fontSize: 13.5, color: c.text.primary, fontWeight: '800', flexShrink: 1 },
    diffNewLabel: { fontSize: 10, color: c.brand.primary, fontWeight: '800' },
    addedTag: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
      backgroundColor: c.status.successBg,
    },
    addedTagText: { fontSize: 10, fontWeight: '900', color: c.status.success, letterSpacing: 0.2 },
    modifiedTag: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
      backgroundColor: c.brand.primaryLight,
    },
    modifiedTagText: { fontSize: 10, fontWeight: '900', color: c.brand.primaryDeep, letterSpacing: 0.2 },
    logoSm: { width: 56, height: 56, borderRadius: 10, backgroundColor: c.bg.subtle },
    colorChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    colorChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: c.bg.subtle,
      paddingLeft: 8, paddingRight: 9, paddingVertical: 4, borderRadius: 999,
    },
    colorChipIdx: {
      fontSize: 9.5, fontWeight: '900', color: c.text.muted,
      minWidth: 12, textAlign: 'center',
    },
    colorDot: {
      width: 10, height: 10, borderRadius: 5,
      borderWidth: 0.5, borderColor: '#cbd5e1',
    },
    colorChipText: { fontSize: 11.5, fontWeight: '800', color: c.text.primary },
    colorOrderRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 7, paddingHorizontal: 10,
      backgroundColor: c.bg.subtle, borderRadius: 10,
    },
    colorOrderIdx: {
      fontSize: 11, fontWeight: '900', color: c.text.tertiary,
      minWidth: 16, textAlign: 'center',
    },
    colorDotMd: {
      width: 16, height: 16, borderRadius: 8,
      borderWidth: 1, borderColor: c.border.subtle,
    },
    colorOrderLabel: { flex: 1, fontSize: 13, fontWeight: '800', color: c.text.primary },
    addedBadge: {
      backgroundColor: c.status.successBg,
      paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999,
    },
    addedBadgeText: { fontSize: 10, fontWeight: '900', color: c.status.success, letterSpacing: 0.2 },
    removedHeader: {
      fontSize: 11, fontWeight: '900', color: c.status.danger,
      letterSpacing: 0.3, textTransform: 'uppercase',
    },
  });
}
