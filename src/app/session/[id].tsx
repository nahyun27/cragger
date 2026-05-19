import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ColorGrid, type GridColor } from '@/components/climb/color-grid';
import { ResultButtons, type ResultChoice } from '@/components/climb/result-buttons';
import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import {
  useAddAttempt,
  useAttempts,
  type Attempt,
} from '@/hooks/use-attempts';
import { useCompleteSession, useSession, type SessionRow } from '@/hooks/use-session';
import { useActiveAttemptStore } from '@/stores/active-attempt';

function formatElapsed(startMs: number): string {
  const totalSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: session, isLoading, error } = useSession(id);
  const { data: attempts } = useAttempts(id);
  const complete = useCompleteSession();
  const addAttempt = useAddAttempt();

  const [elapsed, setElapsed] = useState('00:00:00');
  const setStoreSession = useActiveAttemptStore((s) => s.setSession);

  // Elapsed timer
  useEffect(() => {
    if (!session?.created_at) return;
    const startMs = new Date(session.created_at).getTime();
    setElapsed(formatElapsed(startMs));
    const interval = setInterval(() => setElapsed(formatElapsed(startMs)), 1000);
    return () => clearInterval(interval);
  }, [session?.created_at]);

  // Bind store to this session (resets if switching sessions)
  useEffect(() => {
    if (session?.id) setStoreSession(session.id);
  }, [session?.id, setStoreSession]);

  // Save any pending attempt as 'project', then run an action.
  const flushPendingAs = useCallback(
    async (label: string) => {
      if (!session) return;
      const { color, tries } = useActiveAttemptStore.getState();
      if (color && tries > 0) {
        try {
          await addAttempt.mutateAsync({
            session,
            color,
            result: 'project',
            tries,
          });
        } catch (e) {
          Alert.alert(
            `${label} 중 기록 저장 실패`,
            e instanceof Error ? e.message : '알 수 없는 오류',
          );
          throw e;
        }
      }
      useActiveAttemptStore.getState().reset();
    },
    [session, addAttempt],
  );

  async function handleComplete() {
    if (!id || complete.isPending) return;
    try {
      await flushPendingAs('세션 완료');
      await complete.mutateAsync(id);
      router.replace('/(tabs)/log');
    } catch (e) {
      if (!(e instanceof Error)) return;
      Alert.alert('세션 완료 실패', e.message);
    }
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

  if (error || !session) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center p-6"
        edges={['top', 'bottom']}
      >
        <Text className="text-status-danger text-center mb-4">
          {error?.message ?? '세션을 찾을 수 없어요'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="border border-border-default rounded-md px-4 py-2"
        >
          <Text className="text-text-primary">돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-2 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2" hitSlop={8}>
          <Text className="text-text-primary text-2xl">←</Text>
        </Pressable>
        <View className="flex-1 items-center px-2">
          <Text className="text-text-primary text-base font-semibold">오늘 세션</Text>
          {session.gym && (
            <Text className="text-text-tertiary text-xs" numberOfLines={1}>
              {session.gym.name}
              {session.gym.branch ? ` · ${session.gym.branch}` : ''}
            </Text>
          )}
        </View>
        <View className="px-2 py-1 rounded-md bg-background-secondary">
          <Text className="text-text-primary text-xs">{elapsed}</Text>
        </View>
      </View>

      {/* Sport toggle (disabled — sport 영속화는 별도 마이그레이션 예정) */}
      <View className="flex-row gap-2 px-4 pt-3">
        {(['boulder', 'lead', 'board'] as const).map((value) => {
          const active = value === 'boulder';
          const label = value === 'boulder' ? '볼더링' : value === 'lead' ? '리드' : '보드';
          return (
            <View
              key={value}
              className={`flex-1 p-2.5 rounded-md border ${
                active
                  ? 'border-brand-primary bg-background-secondary'
                  : 'border-border-subtle'
              }`}
            >
              <Text
                className={`text-center text-xs ${
                  active ? 'text-brand-primary font-medium' : 'text-text-tertiary'
                }`}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Attempts list */}
      <AttemptsList attempts={attempts ?? []} />

      {/* Input area: color grid + counter label + result buttons */}
      <LogInput session={session} flushPendingAs={flushPendingAs} />

      {/* Complete button */}
      <View className="px-4 pt-2 pb-2 border-t border-border-subtle">
        <Pressable
          onPress={handleComplete}
          disabled={complete.isPending}
          className="rounded-md p-4 items-center border border-border-default bg-background-primary"
        >
          {complete.isPending ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-text-primary font-semibold">세션 완료</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function AttemptsList({ attempts }: { attempts: Attempt[] }) {
  if (attempts.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-6 gap-1">
        <Text className="text-text-secondary">첫 등반: 색깔 → 결과 순으로 탭</Text>
        <Text className="text-text-tertiary text-xs">
          미완을 반복하면 시도 수가 누적돼요
        </Text>
      </View>
    );
  }
  return (
    <FlatList
      data={attempts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <AttemptRow attempt={item} />}
      contentContainerClassName="px-4 py-3 gap-1"
      style={{ flex: 1 }}
    />
  );
}

function AttemptRow({ attempt }: { attempt: Attempt }) {
  const color = attempt.problem?.color ?? 'gray';
  const label = resolveColorLabel(color);
  const hex = resolveColorHex(color);
  const resultLabel =
    attempt.result === 'send'
      ? '완등'
      : attempt.result === 'fall'
        ? '폴'
        : attempt.result === 'project'
          ? '미완'
          : attempt.result;
  const needsBorder = color.toLowerCase() === 'white' || color.toLowerCase() === 'yellow';
  return (
    <View className="flex-row items-center gap-3 py-1.5">
      <View
        className="w-6 h-6 rounded-full"
        style={{
          backgroundColor: hex,
          ...(needsBorder ? { borderWidth: 1, borderColor: '#D4D4D8' } : null),
        }}
      />
      <Text className="text-text-primary flex-1">
        {label} · {resultLabel}
      </Text>
      <Text className="text-text-tertiary text-sm">{attempt.tries}시도</Text>
    </View>
  );
}

function LogInput({
  session,
  flushPendingAs,
}: {
  session: SessionRow;
  flushPendingAs: (label: string) => Promise<void>;
}) {
  const color = useActiveAttemptStore((s) => s.color);
  const tries = useActiveAttemptStore((s) => s.tries);
  const setColor = useActiveAttemptStore((s) => s.setColor);
  const incrementTries = useActiveAttemptStore((s) => s.incrementTries);
  const reset = useActiveAttemptStore((s) => s.reset);
  const addAttempt = useAddAttempt();

  const colorLabel = color ? resolveColorLabel(color) : null;
  const hasPending = !!color && tries > 0;

  async function handleColorSelect(nextColor: GridColor) {
    if (color && color !== nextColor && tries > 0) {
      try {
        await flushPendingAs('색깔 전환');
      } catch {
        return; // flush failed, alert already shown
      }
    }
    setColor(nextColor);
  }

  async function handleResult(choice: ResultChoice) {
    if (!color) return;
    if (choice === 'miwan') {
      incrementTries();
      return;
    }
    const result = choice === 'send' ? 'send' : 'fall';
    try {
      await addAttempt.mutateAsync({
        session,
        color,
        result,
        tries: Math.max(tries, 1),
      });
      reset();
    } catch (e) {
      Alert.alert('기록 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <View className="border-t border-border-subtle p-4 gap-3 bg-background-secondary">
      <ColorGrid selected={color} onSelect={handleColorSelect} disabled={addAttempt.isPending} />
      <View className="min-h-[20px]">
        {hasPending ? (
          <Text className="text-text-secondary text-sm">
            {colorLabel} · {tries}시도 중...
          </Text>
        ) : color ? (
          <Text className="text-text-tertiary text-sm">
            {colorLabel} 선택됨 — 결과를 탭하세요
          </Text>
        ) : (
          <Text className="text-text-tertiary text-sm">색깔을 먼저 선택하세요</Text>
        )}
      </View>
      <ResultButtons
        disabled={!color}
        pending={addAttempt.isPending}
        onPress={handleResult}
      />
    </View>
  );
}
