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

import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import {
  useDeleteSession,
  useSessionDetail,
  type ColorSummary,
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

const CONDITION_LABEL: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '😵', label: '매우 나쁨' },
  2: { emoji: '😟', label: '나쁨' },
  3: { emoji: '😐', label: '보통' },
  4: { emoji: '🙂', label: '좋음' },
  5: { emoji: '😄', label: '매우 좋음' },
};

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useSessionDetail(id);
  const deleteSession = useDeleteSession();

  function handleDelete() {
    if (!id || deleteSession.isPending) return;
    Alert.alert(
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
              Alert.alert(
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

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-2 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2" hitSlop={8}>
          <Text className="text-text-primary text-2xl">←</Text>
        </Pressable>
        <View className="flex-1" />
        <Pressable
          onPress={() =>
            router.push({ pathname: '/session/[id]/edit', params: { id: id! } })
          }
          className="p-2"
          hitSlop={8}
        >
          <Text className="text-xl">✏️</Text>
        </Pressable>
        <Pressable
          onPress={handleDelete}
          disabled={deleteSession.isPending}
          className="p-2"
          hitSlop={8}
        >
          {deleteSession.isPending ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-xl">🗑️</Text>
          )}
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-5">
        <Text className="text-text-primary text-3xl font-bold">
          {formatLongDate(data.session_date)}
        </Text>

        {data.gym && (
          <View className="p-4 rounded-md bg-background-secondary">
            <Text className="text-text-primary text-base font-semibold">
              {data.gym.name}
              {data.gym.branch ? ` ${data.gym.branch}` : ''}
            </Text>
          </View>
        )}

        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          {data.duration_min != null && (
            <Text className="text-text-secondary">
              ⏱ {formatDuration(data.duration_min)}
            </Text>
          )}
          {cond && (
            <Text className="text-text-secondary">
              {cond.emoji} 컨디션 {cond.label}
            </Text>
          )}
        </View>

        <View className="gap-3 pt-2">
          <Text className="text-text-secondary text-sm font-medium">색깔별 기록</Text>
          {visibleColors.length === 0 ? (
            <Text className="text-text-tertiary">기록된 등반이 없어요</Text>
          ) : (
            <View className="gap-2">
              <View className="flex-row items-center gap-3 px-1">
                <View style={{ width: 64 }} />
                <Text className="flex-1 text-text-tertiary text-xs text-center">
                  완등
                </Text>
                <Text className="flex-1 text-text-tertiary text-xs text-center">
                  시도
                </Text>
              </View>
              {visibleColors.map((c) => (
                <ColorSummaryRow key={c.color} summary={c} />
              ))}
            </View>
          )}
        </View>

        {data.notes && (
          <View className="border-l-4 border-border-default pl-3 py-1">
            <Text className="text-text-primary">{data.notes}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ColorSummaryRow({ summary }: { summary: ColorSummary }) {
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
