import { customAlert } from '@/components/ui/custom-alert';
import { useLocalSearchParams, useRouter } from '@/lib/router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ScreenHeader } from '@/components/ui/screen-header';
import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import { useThemeColors } from '@/lib/theme';
import {
  useDeleteSession,
  useSessionDetail,
  type ColorSummary,
  type LeadSummary,
  type SprayWallAttemptSummary,
} from '@/hooks/use-session';

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatLongDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const w = KO_WEEKDAYS[d.getDay()];
  return `${y}.${m}.${day} (${w})`;
}

const MEMBERSHIP_TYPE_LABEL: Record<'monthly' | 'period' | 'passes' | 'single', string> = {
  monthly: '월간',
  period: '기간',
  passes: '다회권',
  single: '1회권',
};

function membershipLabel(m: {
  membership_type: 'monthly' | 'period' | 'passes' | 'single';
  total_passes: number | null;
  used_passes: number;
}): string {
  const base = MEMBERSHIP_TYPE_LABEL[m.membership_type];
  if (m.membership_type === 'passes' && m.total_passes != null) {
    return `${base} · ${m.used_passes}/${m.total_passes} 사용`;
  }
  return base;
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}분`;
  if (min % 60 === 0) return `${min / 60}시간`;
  return `${(min / 60).toFixed(1)}시간`;
}

const CONDITION_LABEL: Record<number, { icon: 'frown' | 'meh' | 'smile'; color: string; label: string }> = {
  1: { icon: 'frown', color: '#ef4444', label: '최악' },
  2: { icon: 'frown', color: '#f97316', label: '안좋음' },
  3: { icon: 'meh', color: '#64748b', label: '보통' },
  4: { icon: 'smile', color: '#84cc16', label: '좋음' },
  5: { icon: 'smile', color: '#06b6d4', label: '최상' },
};

export default function SessionDetailScreen() {

  const c = useThemeColors();  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error } = useSessionDetail(id);
  const deleteSession = useDeleteSession();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleDelete() {
    if (!id || deleteSession.isPending) return;
    customAlert(
      '이 세션을 삭제할까요?',
      '색깔별 기록과 시도도 함께 삭제됩니다. 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession.mutateAsync(id);
              router.replace('/(tabs)/log');
            } catch (e) {
              customAlert(
                '삭제 실패',
                e instanceof Error ? e.message : '알 수 없는 오류',
              );
            }
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center"
        edges={['top', 'bottom']}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center p-6"
        edges={['top', 'bottom']}
      >
        <Text className="text-status-danger text-center mb-4">
          {error?.message ?? '세션을 찾을 수 없어요'}
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)/log')}
          className="border border-border-default rounded-md px-4 py-2"
        >
          <Text className="text-text-primary">기록 탭으로</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const cond = data.condition ? CONDITION_LABEL[data.condition] : null;
  const visibleColors = data.color_summary.filter((c) => c.tries > 0);
  // mixed 는 아직 한 폼에서 못 다뤄서 제외. boulder/lead/empty 만 수정 가능.
  const canEdit = data.discipline !== 'mixed';

  const menuItems: ActionMenuItem[] = [
    ...(canEdit ? [{
      icon: 'edit-3' as const, label: '수정',
      onPress: () => router.push({ pathname: '/session/[id]/edit', params: { id: id! } }),
    }] : []),
    {
      icon: 'trash-2' as const, label: '삭제', tone: 'danger' as const,
      loading: deleteSession.isPending,
      onPress: handleDelete,
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background-card" edges={['left', 'right']}>
      <ScreenHeader
        title="기록 상세"
        onBack={() => router.back()}
        rightActions={[{ icon: 'more-vertical', onPress: () => setMenuOpen(true) }]}
      />
      <ActionMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
      />

      <ScrollView
        className="flex-1 bg-background-primary"
        contentContainerClassName="p-5 gap-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        <Text className="text-text-primary text-3xl font-extrabold tracking-tight">
          {formatLongDate(data.session_date)}
        </Text>

        {data.gym && (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/gym/[id]', params: { id: data.gym!.id } })
            }
          >
            {({ pressed }) => (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: c.bg.card,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: c.border.subtle,
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  opacity: pressed ? 0.7 : 1,
                }}
              >
                <View
                  style={{
                    width: 40, height: 40, borderRadius: 12,
                    backgroundColor: c.brand.primaryLight,
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Feather name="map-pin" size={18} color={c.brand.primaryDeep} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: c.text.tertiary, fontSize: 11, fontWeight: '900', letterSpacing: 0.3 }}
                  >
                    오늘 등반한 곳
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginTop: 2 }}>
                    <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: '900', letterSpacing: -0.3 }}>
                      {data.gym!.name}
                    </Text>
                    {data.gym!.branch ? (
                      <Text style={{ color: c.brand.primary, fontSize: 13, fontWeight: '800', marginLeft: 6 }}>
                        {data.gym!.branch}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color={c.text.muted} />
              </View>
            )}
          </Pressable>
        )}

        {data.membership && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 14,
              borderRadius: 14,
              backgroundColor: c.brand.primaryLight,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.brand.primary + '40',
            }}
          >
            <View
              style={{
                width: 38, height: 38, borderRadius: 12,
                backgroundColor: c.brand.primary,
                alignItems: 'center', justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Feather name="credit-card" size={17} color={c.brand.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: c.brand.primaryDeep, letterSpacing: 0.3 }}>
                사용한 회원권
              </Text>
              <Text style={{ fontSize: 13.5, fontWeight: '900', color: c.text.primary, marginTop: 2, letterSpacing: -0.2 }}>
                {membershipLabel(data.membership)}
              </Text>
            </View>
          </View>
        )}

        {data.duration_min == null && cond == null ? (
          canEdit ? (
            <Pressable
              onPress={() => router.push({ pathname: '/session/[id]/edit', params: { id: id! } })}
              className="flex-row items-center justify-between bg-background-secondary border border-dashed border-border-strong p-4 rounded-2xl active:opacity-70"
            >
              <View className="flex-row items-center gap-2 flex-1">
                <Feather name="clock" size={15} color={c.text.muted} />
                <Text className="text-text-tertiary text-sm font-semibold">
                  시간·컨디션이 비어 있어요
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-brand-primary text-xs font-extrabold">입력하러 가기</Text>
                <Feather name="chevron-right" size={14} color={c.brand.primary} />
              </View>
            </Pressable>
          ) : null
        ) : (
          <View className="flex-row flex-wrap gap-4 bg-background-secondary p-4 rounded-2xl border border-border-subtle">
            {data.duration_min != null && (
              <View className="flex-row items-center gap-1.5">
                <Feather name="clock" size={16} color={c.text.tertiary} />
                <Text className="text-text-secondary text-sm font-medium">
                  {formatDuration(data.duration_min)}
                </Text>
              </View>
            )}
            {cond && (
              <View className="flex-row items-center gap-1.5">
                <Feather name={cond.icon} size={16} color={cond.color} />
                <Text className="text-text-secondary text-sm font-medium">
                  컨디션 {cond.label}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 볼더링 색깔 섹션 */}
        {(data.discipline === 'boulder' || data.discipline === 'mixed') && visibleColors.length > 0 && (
          <View className="gap-4">
            <Text className="text-text-primary text-lg font-bold">색깔별 기록</Text>
            <View className="bg-background-secondary p-4 rounded-2xl border border-border-subtle gap-3">
              <View className="flex-row items-center gap-3 px-1 border-b border-border-subtle pb-2">
                <View style={{ width: 64 }} />
                <Text className="flex-1 text-text-tertiary text-xs text-center font-semibold">
                  완등
                </Text>
                <Text className="flex-1 text-text-tertiary text-xs text-center font-semibold">
                  시도
                </Text>
              </View>
              {visibleColors.map((c) => (
                <ColorSummaryRow key={c.color} summary={c} />
              ))}
            </View>
          </View>
        )}

        {/* 스프레이월 섹션 */}
        {data.spray_wall_summary.length > 0 && (
          <View className="gap-4">
            <Text className="text-text-primary text-lg font-bold">스프레이월 기록</Text>
            <View className="bg-background-secondary rounded-2xl border border-border-subtle overflow-hidden">
              {data.spray_wall_summary.map((item, idx) => (
                <SprayWallSummaryRow
                  key={item.problemId}
                  item={item}
                  isLast={idx === data.spray_wall_summary.length - 1}
                />
              ))}
            </View>
          </View>
        )}

        {/* 리드 등급 섹션 */}
        {(data.discipline === 'lead' || data.discipline === 'mixed') && data.lead_summary.length > 0 && (
          <View className="gap-4">
            <Text className="text-text-primary text-lg font-bold">루트별 기록</Text>
            <View className="bg-background-secondary p-4 rounded-2xl border border-border-subtle gap-3">
              {data.lead_summary.map((r) => (
                <LeadSummaryRow key={r.grade} summary={r} />
              ))}
            </View>
          </View>
        )}

        {/* 둘 다 없을 때 */}
        {data.discipline === 'empty' && data.spray_wall_summary.length === 0 && (
          <View className="p-8 items-center justify-center bg-background-secondary rounded-2xl border border-border-subtle">
            <Feather name="activity" size={24} color={c.text.muted} className="mb-2" />
            <Text className="text-text-secondary text-sm">기록된 등반이 없어요</Text>
          </View>
        )}

        {data.notes && (
          <View className="bg-brand-primary/5 border border-brand-primary/10 rounded-2xl p-4">
            <Text className="text-text-primary text-sm leading-6">{data.notes}</Text>
          </View>
        )}

        {/* 공유 썸네일 CTA */}
        <Pressable
          onPress={() => router.push({ pathname: '/session/[id]/share', params: { id: id! } })}
        >
          {({ pressed }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 18,
                borderRadius: 18,
                backgroundColor: c.brand.primary,
                opacity: pressed ? 0.92 : 1,
                shadowColor: c.brand.primary,
                shadowOpacity: 0.35,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 6,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Feather name="share-2" size={18} color={c.brand.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: c.brand.onPrimary,
                    fontSize: 15,
                    fontWeight: '900',
                    letterSpacing: -0.3,
                  }}
                >
                  공유 썸네일 만들기
                </Text>
                <Text
                  style={{
                    color: c.brand.onPrimary,
                    fontSize: 11.5,
                    fontWeight: '700',
                    marginTop: 2,
                    opacity: 0.85,
                  }}
                >
                  오늘의 기록을 카드 이미지로 저장·공유
                </Text>
              </View>
              <Feather name="arrow-right" size={18} color={c.brand.onPrimary} />
            </View>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ColorSummaryRow({ summary }: { summary: ColorSummary }) {
  const c = useThemeColors();
  const hex = resolveColorHex(summary.color);
  const label = resolveColorLabel(summary.color);
  const needsBorder =
    summary.color === 'white' || summary.color === 'yellow';
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-row items-center gap-2" style={{ width: 64 }}>
        <View
          className="w-6 h-6 rounded-full"
          style={{
            backgroundColor: hex,
            ...(needsBorder ? { borderWidth: 1, borderColor: '#D4D4D8' } : null),
          }}
        />
        <Text className="text-text-primary text-sm">{label}</Text>
      </View>
      <Text className="flex-1 text-center text-text-primary text-base font-medium">
        {summary.sends}
      </Text>
      <Text className="flex-1 text-center text-text-primary text-base font-medium">
        {summary.tries}
      </Text>
    </View>
  );
}

const LEAD_RESULT_LABEL: Record<keyof LeadSummary['breakdown'], { label: string; color: string }> = {
  onsight:  { label: '온사이트',   color: '#0e7490' },
  flash:    { label: '플래시',     color: '#15803d' },
  redpoint: { label: '레드포인트', color: '#c2410c' },
  fall:     { label: '폴',         color: '#b91c1c' },
};

function SprayWallSummaryRow({ item, isLast }: { item: SprayWallAttemptSummary; isLast: boolean }) {
  const c = useThemeColors();
  const hex = item.color ? resolveColorHex(item.color) : '#7c3aed';
  const isSend = item.result === 'send';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: c.border.subtle,
      }}
    >
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: hex, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{item.number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: c.text.primary }} numberOfLines={1}>
          {item.name ?? `문제 #${item.number}`}
        </Text>
        <Text style={{ fontSize: 11, color: c.text.tertiary, fontWeight: '600', marginTop: 1 }}>
          {item.problem_type === 'endurance' ? '지구력' : '찍볼'} · {item.tries}번 시도
        </Text>
      </View>
      <View style={{
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
        backgroundColor: isSend ? '#dcfce7' : '#fee2e2',
      }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: isSend ? '#16a34a' : '#dc2626' }}>
          {isSend ? '완등' : '미완'}
        </Text>
      </View>
    </View>
  );
}

function LeadSummaryRow({ summary }: { summary: LeadSummary }) {
  const c = useThemeColors();
  const chips: { key: keyof LeadSummary['breakdown']; count: number }[] = [
    { key: 'onsight',  count: summary.breakdown.onsight },
    { key: 'flash',    count: summary.breakdown.flash },
    { key: 'redpoint', count: summary.breakdown.redpoint },
    { key: 'fall',     count: summary.breakdown.fall },
  ];
  return (
    <View className="flex-row items-center gap-3 py-1">
      <Text className="text-text-primary text-base font-extrabold" style={{ width: 60 }}>
        {summary.grade}
      </Text>
      <View className="flex-1 flex-row flex-wrap gap-1.5">
        {chips.filter((chip) => chip.count > 0).map((chip) => {
          const meta = LEAD_RESULT_LABEL[chip.key];
          return (
            <View
              key={chip.key}
              className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-border-subtle"
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: meta.color }}>
                {meta.label}
              </Text>
              {chip.count > 1 && (
                <Text style={{ fontSize: 11, fontWeight: '700', color: c.text.muted }}>
                  ×{chip.count}
                </Text>
              )}
            </View>
          );
        })}
      </View>
      <Text className="text-text-tertiary text-xs font-semibold">
        {summary.sends}/{summary.tries}
      </Text>
    </View>
  );
}
