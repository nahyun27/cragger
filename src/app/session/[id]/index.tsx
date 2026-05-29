import { customAlert } from '@/components/ui/custom-alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import { useThemeColors } from '@/lib/theme';
import {
  useDeleteSession,
  useSessionDetail,
  type ColorSummary,
  type LeadSummary,
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
  const { data, isLoading, error } = useSessionDetail(id);
  const deleteSession = useDeleteSession();

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

  return (
    <SafeAreaView className="flex-1 bg-background-card" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 py-[14px] bg-background-card border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-xl items-center justify-center -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color={c.text.primary} />
        </Pressable>
        <Text className="text-text-primary text-[18px] font-extrabold tracking-[-0.4px]">기록 상세</Text>
        <View className="flex-row gap-1">
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/session/[id]/share',
                params: { id: id! },
              })
            }
            className="w-10 h-10 rounded-xl items-center justify-center active:opacity-60"
            hitSlop={8}
          >
            <Feather name="share" size={20} color={c.text.tertiary} />
          </Pressable>
          {canEdit && (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/session/[id]/edit', params: { id: id! } })
              }
              className="w-10 h-10 rounded-xl items-center justify-center active:opacity-60"
              hitSlop={8}
            >
              <Feather name="edit-3" size={20} color={c.text.tertiary} />
            </Pressable>
          )}
          <Pressable
            onPress={handleDelete}
            disabled={deleteSession.isPending}
            className="w-10 h-10 rounded-xl items-center justify-center active:opacity-60"
            hitSlop={8}
          >
            {deleteSession.isPending ? (
              <ActivityIndicator size="small" />
            ) : (
              <Feather name="trash-2" size={20} color={c.status.danger} />
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 bg-background-primary" contentContainerClassName="p-5 gap-6">
        <View className="gap-2">
          <Text className="text-text-primary text-3xl font-extrabold tracking-tight">
            {formatLongDate(data.session_date)}
          </Text>

          {data.gym && (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/gym/[id]', params: { id: data.gym!.id } })
              }
              className="flex-row items-baseline gap-2 flex-wrap mt-1 active:opacity-60"
              hitSlop={4}
            >
              <Text className="text-lg font-bold text-text-primary">
                {data.gym.name}
              </Text>
              {data.gym.branch && (
                <Text className="text-sm font-semibold text-brand-primary">
                  {data.gym.branch}
                </Text>
              )}
              <Feather name="chevron-right" size={14} color={c.text.tertiary} />
            </Pressable>
          )}
        </View>

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
        {data.discipline === 'empty' && (
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
