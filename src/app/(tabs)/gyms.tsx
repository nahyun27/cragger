import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GymThumbnail } from '@/components/gym/gym-thumbnail';
import { useFavoriteGymIds, useToggleFavorite } from '@/hooks/use-favorites';
import { useGyms, type GymListItem } from '@/hooks/use-gyms';

export default function GymsScreen() {
  const router = useRouter();
  const { data, isLoading, error } = useGyms();
  const { data: favoriteIds } = useFavoriteGymIds();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

  const regions = ['전체', '서울', '경기', '인천'];

  const facilityOptions: { label: string; value: string; icon: 'zap' | 'activity' | 'maximize-2' }[] = [
    { label: '문보드', value: 'has_moonboard', icon: 'zap' },
    { label: '킬터보드', value: 'has_kilter', icon: 'zap' },
    { label: '리드벽', value: 'has_lead', icon: 'activity' },
    { label: '300평+ 대형', value: 'large_size', icon: 'maximize-2' },
  ];

  const matchRegion = (city: string, region: string) => {
    if (region === '전체') return true;
    if (region === '서울') return city === '서울';
    if (region === '인천') return city === '인천';
    if (region === '경기') return city !== '서울' && city !== '인천';
    return true;
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    
    let filteredList = data;

    // 1. Region filter
    if (selectedRegion !== '전체') {
      filteredList = filteredList.filter((g) => matchRegion(g.city, selectedRegion));
    }

    // 2. Facilities filter
    if (selectedFacilities.length > 0) {
      filteredList = filteredList.filter((g) => {
        return selectedFacilities.every((fac) => {
          if (fac === 'large_size') {
            return g.size_pyeong !== null && g.size_pyeong >= 300;
          }
          return (g as any)[fac] === true;
        });
      });
    }

    // 3. Search query filter
    const q = query.trim().toLowerCase();
    if (q) {
      filteredList = filteredList.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.branch ?? '').toLowerCase().includes(q) ||
          g.city.toLowerCase().includes(q),
      );
    }

    // 4. Sort: favorites first, then by name
    return [...filteredList].sort((a, b) => {
      const aFav = favoriteIds?.has(a.id) ?? false;
      const bFav = favoriteIds?.has(b.id) ?? false;
      if (aFav !== bFav) return aFav ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [data, query, selectedRegion, selectedFacilities, favoriteIds]);

  const toggleFacility = (fac: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(fac) ? prev.filter((f) => f !== fac) : [...prev, fac],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-text-primary text-2xl font-bold">암장</Text>
          <View className="bg-brand-primary/10 px-2.5 py-0.5 rounded-full">
            <Text className="text-brand-primary text-xs font-semibold">
              {filtered.length}
            </Text>
          </View>
        </View>
        <Text className="text-text-tertiary text-xs mt-1">
          원하는 시설과 지역의 암장을 편리하게 필터링해 보세요.
        </Text>
      </View>

      {/* Search Input */}
      <View className="px-5 pb-3">
        <View 
          className={`flex-row items-center bg-background-secondary border rounded-xl px-3 py-1.5 ${
            isFocused ? 'border-brand-primary bg-background-primary' : 'border-border-subtle'
          }`}
        >
          <Feather name="search" size={18} color={isFocused ? '#0d9488' : '#71717a'} />
          <TextInput
            placeholder="이름·지점·지역 검색"
            placeholderTextColor="#a1a1aa"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="flex-1 text-text-primary text-base py-1 ml-2 outline-none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} className="p-1">
              <Feather name="x-circle" size={16} color="#71717a" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Region filter chips */}
      <View className="pb-2">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-5 gap-2"
        >
          {regions.map((region) => {
            const isSelected = selectedRegion === region;
            return (
              <Pressable
                key={region}
                onPress={() => setSelectedRegion(region)}
                className={`px-4 py-1.5 rounded-full border ${
                  isSelected
                    ? 'border-brand-primary bg-brand-primary'
                    : 'border-border-subtle bg-background-primary'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isSelected ? 'text-background-primary' : 'text-text-secondary'
                  }`}
                >
                  {region}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Facility toggles */}
      <View className="pb-4 border-b border-border-subtle">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-5 gap-2"
        >
          {facilityOptions.map((opt) => {
            const isSelected = selectedFacilities.includes(opt.value);
            return (
              <Pressable
                key={opt.value}
                onPress={() => toggleFacility(opt.value)}
                className={`px-3 py-1.5 rounded-lg border flex-row items-center gap-1.5 ${
                  isSelected
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-border-subtle bg-background-primary'
                }`}
              >
                <Feather
                  name={opt.icon}
                  size={12}
                  color={isSelected ? '#0d9488' : '#71717a'}
                />
                <Text
                  className={`text-xs font-semibold ${
                    isSelected ? 'text-brand-primary' : 'text-text-tertiary'
                  }`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading && (
        <View className="p-12 items-center justify-center">
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      )}

      {error && (
        <View className="mx-5 my-3 border border-status-danger rounded-xl p-4 bg-status-danger/10">
          <Text className="text-status-danger font-medium">{error.message}</Text>
        </View>
      )}

      {!isLoading && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GymCard
              gym={item}
              isFavorite={favoriteIds?.has(item.id) ?? false}
            />
          )}
          contentContainerClassName="px-5 pt-4 pb-12 gap-1.5"
          ListEmptyComponent={
            data && !isLoading ? (
              <View className="p-12 items-center justify-center gap-2">
                <Feather name="map-pin" size={40} color="#a1a1aa" />
                <Text className="text-text-secondary font-medium text-base mt-2">검색 결과가 없어요</Text>
                <Text className="text-text-muted text-xs">필터를 변경하거나 다른 검색어를 입력해 보세요.</Text>
                <Pressable
                  onPress={() => router.push('/gyms/request')}
                  className="mt-4 border border-dashed border-border-default rounded-lg px-4 py-2.5 active:opacity-60"
                >
                  <Text className="text-text-secondary text-sm font-medium">
                    + 찾는 암장 추가 요청
                  </Text>
                </Pressable>
              </View>
            ) : null
          }
          ListFooterComponent={
            data && filtered.length > 0 ? (
              <Pressable
                onPress={() => router.push('/gyms/request')}
                className="mt-3 border border-dashed border-border-default rounded-lg py-3 items-center active:opacity-60"
              >
                <Text className="text-text-tertiary text-sm">
                  + 찾는 암장이 없으면 추가 요청
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function GymCard({ gym, isFavorite }: { gym: GymListItem; isFavorite: boolean }) {
  const router = useRouter();
  const toggleFavorite = useToggleFavorite();

  const location = [gym.city, gym.district].filter(Boolean).join(' · ');
  const sizeBit = gym.size_pyeong ? `${gym.size_pyeong}평` : null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/gym/[id]', params: { id: gym.id } })}
      style={({ pressed }) => [
        {
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      className="bg-background-primary border border-border-subtle rounded-2xl p-3.5 mb-3 flex-row items-center gap-3 overflow-hidden elevation-sm"
    >
      {/* Photo placeholder — 사진 도입 전까지 해시 기반 색 + 이니셜 */}
      <GymThumbnail name={`${gym.name}${gym.branch ?? ''}`} size={56} />

      <View className="flex-1 gap-2">
        {/* Name and Branch */}
        <View className="flex-row items-baseline flex-wrap gap-1.5">
          <Text className="text-text-primary text-lg font-bold">{gym.name}</Text>
          {gym.branch && (
            <Text className="text-text-secondary text-sm font-medium">
              {gym.branch}
            </Text>
          )}
        </View>

        {/* Location & Size Info */}
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Feather name="map-pin" size={12} color="#71717a" />
            <Text className="text-text-tertiary text-xs">
              {location}
            </Text>
          </View>
          {sizeBit && (
            <View className="flex-row items-center gap-1">
              <Feather name="grid" size={12} color="#71717a" />
              <Text className="text-text-tertiary text-xs">
                {sizeBit}
              </Text>
            </View>
          )}
        </View>

        {/* Facilities Badges */}
        <View className="flex-row flex-wrap gap-1.5 mt-1">
          {gym.has_boulder && (
            <View className="px-2 py-0.5 rounded-md bg-background-secondary border border-border-subtle">
              <Text className="text-text-secondary text-xs font-medium">볼더링</Text>
            </View>
          )}
          {gym.has_lead && (
            <View className="px-2 py-0.5 rounded-md bg-background-secondary border border-border-subtle">
              <Text className="text-text-secondary text-xs font-medium">리드</Text>
            </View>
          )}
          {gym.has_top_rope && (
            <View className="px-2 py-0.5 rounded-md bg-background-secondary border border-border-subtle">
              <Text className="text-text-secondary text-xs font-medium">탑로프</Text>
            </View>
          )}
          
          {/* Tech Boards with Distinct Glow Styles */}
          {gym.has_moonboard && (
            <View className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 flex-row items-center gap-1">
              <Feather name="zap" size={10} color="#9333ea" />
              <Text className="text-purple-600 dark:text-purple-300 text-xs font-semibold">문보드</Text>
            </View>
          )}
          {gym.has_kilter && (
            <View className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex-row items-center gap-1">
              <Feather name="zap" size={10} color="#2563eb" />
              <Text className="text-blue-600 dark:text-blue-300 text-xs font-semibold">킬터보드</Text>
            </View>
          )}
          {gym.has_tension && (
            <View className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 flex-row items-center gap-1">
              <Feather name="zap" size={10} color="#ea580c" />
              <Text className="text-orange-600 dark:text-orange-300 text-xs font-semibold">텐션보드</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Right: favorite toggle + chevron */}
      <View className="justify-center items-center pl-2 gap-1.5">
        <Pressable
          onPress={() =>
            toggleFavorite.mutate({ gymId: gym.id, currentlyFavorite: isFavorite })
          }
          className="p-1 active:opacity-60"
          hitSlop={10}
        >
          <Feather
            name="star"
            size={20}
            color={isFavorite ? '#f59e0b' : '#a1a1aa'}
            fill={isFavorite ? '#f59e0b' : 'transparent'}
          />
        </Pressable>
        <Feather name="chevron-right" size={18} color="#a1a1aa" />
      </View>
    </Pressable>
  );
}

