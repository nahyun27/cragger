import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GRID_COLORS, type GridColor } from '@/components/climb/color-grid';
import {
  ColorCountsTable,
  emptyColorCounts,
  type ColorCountsValue,
} from '@/components/session/color-counts-table';
import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { Chip } from '@/components/ui/chip';
import { Section } from '@/components/ui/section';
import { useGyms } from '@/hooks/use-gyms';
import { useRecentGyms } from '@/hooks/use-recent-gyms';
import { useSessionDetail, useUpdateSession } from '@/hooks/use-session';

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatLongDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const w = KO_WEEKDAYS[d.getDay()];
  return `${y}.${m}.${day} (${w})`;
}

const DURATION_CHIPS: { value: number; label: string }[] = [
  { value: 30, label: '30분' },
  { value: 60, label: '1시간' },
  { value: 90, label: '1.5시간' },
  { value: 120, label: '2시간' },
  { value: 150, label: '2.5시간' },
  { value: 180, label: '3시간+' },
];

const CONDITION_OPTIONS: { value: number; emoji: string }[] = [
  { value: 1, emoji: '😵' },
  { value: 2, emoji: '😟' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' },
  { value: 5, emoji: '😄' },
];

export default function EditSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useSessionDetail(id);
  const updateSession = useUpdateSession();
  const { data: recentGyms } = useRecentGyms();
  const { data: allGyms } = useGyms();

  const [gymId, setGymId] = useState<string | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [condition, setCondition] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [colorCounts, setColorCounts] = useState<ColorCountsValue>(emptyColorCounts);
  const [prefilled, setPrefilled] = useState(false);

  // 첫 fetch 완료 시 한 번만 prefill — 이후 사용자 편집 보존
  useEffect(() => {
    if (prefilled || !data) return;
    setGymId(data.gym_id);
    setDurationMin(data.duration_min);
    setCondition(data.condition);
    setNotes(data.notes ?? '');
    const next = emptyColorCounts();
    for (const s of data.color_summary) {
      if ((GRID_COLORS as readonly string[]).includes(s.color)) {
        next[s.color as GridColor] = {
          color: s.color as GridColor,
          tries: s.tries,
          sends: s.sends,
        };
      }
    }
    setColorCounts(next);
    setPrefilled(true);
  }, [data, prefilled]);

  const selectedGym = useMemo(
    () => allGyms?.find((g) => g.id === gymId) ?? null,
    [allGyms, gymId],
  );

  const canSubmit = useMemo(() => {
    if (!gymId) return false;
    return Object.values(colorCounts).some((c) => c.tries > 0);
  }, [gymId, colorCounts]);

  async function handleSubmit() {
    if (!id || !gymId || updateSession.isPending) return;
    try {
      await updateSession.mutateAsync({
        sessionId: id,
        gymId,
        durationMin,
        condition,
        notes: notes.trim() ? notes.trim().slice(0, 100) : null,
        colors: Object.values(colorCounts),
      });
      router.replace({ pathname: '/session/[id]', params: { id } });
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  if (isLoading || !prefilled) {
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
      <View className="flex-row items-center px-2 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2" hitSlop={8}>
          <Text className="text-text-primary text-2xl">←</Text>
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold">
          세션 수정
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
        {/* 날짜는 readonly — date picker는 v1.1 */}
        <Section title="날짜">
          <View className="px-3 py-2 rounded-md bg-background-secondary">
            <Text className="text-text-primary text-sm">
              {formatLongDate(data.session_date)}
            </Text>
          </View>
          <Text className="text-text-tertiary text-xs">날짜 수정은 v1.1에서 가능</Text>
        </Section>

        <Section title="암장" required>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="🔍 장소 검색"
              selected={false}
              onPress={() => setShowGymModal(true)}
            />
            {(recentGyms ?? []).map((g) => (
              <Chip
                key={g.id}
                label={`${g.name}${g.branch ? ` ${g.branch}` : ''}`}
                selected={gymId === g.id}
                onPress={() => setGymId(g.id)}
              />
            ))}
          </View>
          {selectedGym && (
            <View className="mt-2 px-3 py-2 rounded-md bg-background-secondary">
              <Text className="text-text-primary text-sm">
                선택: {selectedGym.name}
                {selectedGym.branch ? ` ${selectedGym.branch}` : ''}
                {selectedGym.city ? ` · ${selectedGym.city}` : ''}
              </Text>
            </View>
          )}
        </Section>

        <Section title="운동 시간">
          <View className="flex-row flex-wrap gap-2">
            {DURATION_CHIPS.map(({ value, label }) => (
              <Chip
                key={label}
                label={label}
                selected={durationMin === value}
                onPress={() => setDurationMin(durationMin === value ? null : value)}
              />
            ))}
          </View>
        </Section>

        <Section title="컨디션">
          <View className="flex-row gap-2 justify-between">
            {CONDITION_OPTIONS.map(({ value, emoji }) => {
              const active = condition === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setCondition(active ? null : value)}
                  className={`flex-1 items-center py-3 rounded-md border ${
                    active
                      ? 'border-brand-primary bg-background-secondary'
                      : 'border-border-subtle'
                  }`}
                >
                  <Text className="text-2xl">{emoji}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="색깔별 기록">
          <ColorCountsTable value={colorCounts} onChange={setColorCounts} />
        </Section>

        <Section title="메모">
          <TextInput
            placeholder="한 줄 메모 (최대 100자)"
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={(t) => setNotes(t.slice(0, 100))}
            maxLength={100}
            className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
          />
        </Section>
      </ScrollView>

      <View className="px-4 pt-2 pb-2 border-t border-border-subtle">
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit || updateSession.isPending}
          className={`rounded-md p-4 items-center ${
            !canSubmit ? 'bg-background-tertiary' : 'bg-brand-primary'
          }`}
        >
          {updateSession.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text
              className={`font-semibold ${
                !canSubmit ? 'text-text-muted' : 'text-background-primary'
              }`}
            >
              저장
            </Text>
          )}
        </Pressable>
      </View>

      <GymPickerModal
        visible={showGymModal}
        gyms={allGyms ?? []}
        selectedId={gymId}
        onSelect={(pickedId) => {
          setGymId(pickedId);
          setShowGymModal(false);
        }}
        onClose={() => setShowGymModal(false)}
      />
    </SafeAreaView>
  );
}
