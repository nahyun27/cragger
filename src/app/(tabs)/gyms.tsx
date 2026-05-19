import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGyms, type GymListItem } from '@/hooks/use-gyms';

export default function GymsScreen() {
  const { data, isLoading, error } = useGyms();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.branch ?? '').toLowerCase().includes(q) ||
        g.city.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <View className="px-4 pt-2 pb-3 gap-3">
        <Text className="text-text-primary text-2xl font-bold">암장</Text>
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
        <View className="p-6 items-center">
          <ActivityIndicator />
        </View>
      )}

      {error && (
        <View className="mx-4 mb-3 border border-status-danger rounded-md p-3 bg-background-secondary">
          <Text className="text-status-danger">{error.message}</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GymCard gym={item} />}
        contentContainerClassName="px-4 pb-6 gap-2.5"
        ListEmptyComponent={
          data && !isLoading ? (
            <View className="p-6 items-center">
              <Text className="text-text-secondary">검색 결과가 없어요</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function GymCard({ gym }: { gym: GymListItem }) {
  const router = useRouter();
  const badges = [
    gym.has_boulder && '볼더',
    gym.has_lead && '리드',
    gym.has_moonboard && '문보드',
    gym.has_kilter && '킬터',
  ].filter(Boolean) as string[];

  const location = [gym.city, gym.district].filter(Boolean).join(' · ');
  const sizeBit = gym.size_pyeong ? `${gym.size_pyeong}평` : null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/gym/[id]', params: { id: gym.id } })}
      className="border border-border-subtle rounded-lg p-4 gap-1.5 bg-background-primary"
    >
      <View className="flex-row items-baseline gap-2">
        <Text className="text-text-primary text-lg font-bold">{gym.name}</Text>
        {gym.branch && <Text className="text-text-secondary text-base">{gym.branch}</Text>}
      </View>
      <Text className="text-text-tertiary text-sm">
        {[location, sizeBit].filter(Boolean).join(' · ')}
      </Text>
      {badges.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5 mt-1">
          {badges.map((b) => (
            <View key={b} className="px-2 py-0.5 rounded-full bg-background-secondary">
              <Text className="text-text-secondary text-xs">{b}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}
