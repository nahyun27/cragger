import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGyms, type GymListItem } from '@/hooks/use-gyms';
import { useCreateSession } from '@/hooks/use-session';

type Sport = 'boulder' | 'lead';
const SPORTS: { value: Sport; label: string }[] = [
  { value: 'boulder', label: '볼더링' },
  { value: 'lead', label: '리드' },
];

export default function NewSessionScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  // sport는 client-side state — 영속화는 다음 마이그레이션
  const [sport, setSport] = useState<Sport>('boulder');

  const { data: gyms, isLoading } = useGyms();
  const createSession = useCreateSession();

  const filtered = useMemo(() => {
    if (!gyms) return [];
    const q = query.trim().toLowerCase();
    if (!q) return gyms;
    return gyms.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.branch ?? '').toLowerCase().includes(q) ||
        g.city.toLowerCase().includes(q),
    );
  }, [gyms, query]);

  async function handleStart() {
    if (!selectedGymId || createSession.isPending) return;
    try {
      const { id } = await createSession.mutateAsync({ gymId: selectedGymId });
      router.replace({ pathname: '/session/[id]', params: { id } });
    } catch (e) {
      Alert.alert('세션 생성 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-2 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2" hitSlop={8}>
          <Text className="text-text-primary text-2xl">←</Text>
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold">
          새 세션
        </Text>
        <View className="w-10" />
      </View>

      {/* Gym search */}
      <View className="px-4 pt-3 pb-2 gap-2">
        <Text className="text-text-tertiary text-sm">암장 선택</Text>
        <TextInput
          placeholder="이름·지점·지역 검색"
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
        />
      </View>

      {isLoading && (
        <View className="p-4 items-center">
          <ActivityIndicator />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GymPickRow
            gym={item}
            selected={item.id === selectedGymId}
            onSelect={() => setSelectedGymId(item.id)}
          />
        )}
        contentContainerClassName="px-4 pb-3 gap-2"
        ListEmptyComponent={
          gyms && !isLoading ? (
            <View className="p-6 items-center">
              <Text className="text-text-secondary">검색 결과가 없어요</Text>
            </View>
          ) : null
        }
      />

      {/* Sport toggle */}
      <View className="px-4 pt-2 pb-2 gap-2 border-t border-border-subtle">
        <Text className="text-text-tertiary text-sm">종목</Text>
        <View className="flex-row gap-2">
          {SPORTS.map(({ value, label }) => {
            const active = sport === value;
            return (
              <Pressable
                key={value}
                onPress={() => setSport(value)}
                className={`flex-1 p-3 rounded-md border ${
                  active
                    ? 'border-brand-primary bg-background-secondary'
                    : 'border-border-subtle'
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    active ? 'text-brand-primary' : 'text-text-secondary'
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Start button */}
      <View className="px-4 pt-2 pb-2">
        <Pressable
          onPress={handleStart}
          disabled={!selectedGymId || createSession.isPending}
          className={`rounded-md p-4 items-center ${
            !selectedGymId ? 'bg-background-tertiary' : 'bg-brand-primary'
          }`}
        >
          {createSession.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text
              className={`font-semibold ${
                !selectedGymId ? 'text-text-muted' : 'text-background-primary'
              }`}
            >
              세션 시작
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function GymPickRow({
  gym,
  selected,
  onSelect,
}: {
  gym: GymListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      className={`flex-row items-center justify-between rounded-md border px-3 py-2.5 ${
        selected
          ? 'border-brand-primary bg-background-secondary'
          : 'border-border-subtle bg-background-primary'
      }`}
    >
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-baseline gap-2">
          <Text className="text-text-primary text-base font-medium">{gym.name}</Text>
          {gym.branch && <Text className="text-text-secondary text-sm">{gym.branch}</Text>}
        </View>
        <Text className="text-text-tertiary text-xs">
          {[gym.city, gym.district].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {selected && <Text className="text-brand-primary text-lg">●</Text>}
    </Pressable>
  );
}
