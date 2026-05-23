import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GymThumbnail } from '@/components/gym/gym-thumbnail';
import { useFavoriteGymIds, useToggleFavorite } from '@/hooks/use-favorites';
import { useGyms, type GymListItem } from '@/hooks/use-gyms';

// City → coarse region mapping for the filter chips.
// The gyms.city column was populated inconsistently — sometimes "서울",
// sometimes a 구 name ("강남구"), sometimes a 시 name ("수원시"). This
// helper normalizes any of those into one of the 17 광역시/도 buckets.
const SEOUL_DISTRICTS = new Set([
  '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구',
  '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구',
  '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구',
  '은평구', '종로구', '중랑구',
]);
const GYEONGGI_CITIES = new Set([
  '고양시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시',
  '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시',
  '안양시', '양주시', '여주시', '오산시', '용인시', '의왕시', '의정부시',
  '이천시', '파주시', '평택시', '포천시', '하남시', '화성시', '과천시',
  '양평군', '가평군', '연천군',
]);
const GANGWON_CITIES = new Set([
  '춘천시', '원주시', '강릉시', '동해시', '속초시', '태백시', '삼척시',
]);
const CHUNGBUK_CITIES = new Set(['청주시', '충주시', '제천시']);
const CHUNGNAM_CITIES = new Set([
  '천안시', '공주시', '아산시', '서산시', '보령시', '논산시', '계룡시',
  '당진시', '태안군', '예산군', '청양군', '홍성군',
]);
const JEONBUK_CITIES = new Set([
  '전주시', '군산시', '익산시', '정읍시', '남원시', '김제시',
]);
const JEONNAM_CITIES = new Set([
  '목포시', '여수시', '순천시', '광양시', '나주시', '무안군', '담양군',
  '곡성군', '구례군', '고흥군', '보성군', '화순군', '장흥군',
]);
const GYEONGBUK_CITIES = new Set([
  '포항시', '경주시', '구미시', '안동시', '영주시', '영천시', '김천시',
  '문경시', '경산시', '상주시',
]);
const GYEONGNAM_CITIES = new Set([
  '창원시', '진주시', '김해시', '양산시', '거제시', '통영시', '사천시',
  '밀양시', '함안군', '거창군',
]);

function regionOf(rawCity: string): string {
  const c = (rawCity ?? '').trim();
  if (c === '서울' || SEOUL_DISTRICTS.has(c)) return '서울';
  if (c === '경기' || GYEONGGI_CITIES.has(c)) return '경기';
  if (c === '인천' || c.startsWith('인천 ')) return '인천';
  if (c === '부산' || c.startsWith('부산 ')) return '부산';
  if (c === '대구' || c.startsWith('대구 ')) return '대구';
  if (c === '대전' || c.startsWith('대전 ') || c === '유성구') return '대전';
  if (c === '광주') return '광주';
  if (c === '울산' || c.startsWith('울산 ')) return '울산';
  if (c === '세종' || c.startsWith('세종')) return '세종';
  if (c === '강원' || c === '강원도' || GANGWON_CITIES.has(c)) return '강원';
  if (c === '충북' || c === '충청북도' || CHUNGBUK_CITIES.has(c)) return '충북';
  if (c === '충남' || c === '충청남도' || CHUNGNAM_CITIES.has(c)) return '충남';
  if (c === '전북' || c === '전라북도' || JEONBUK_CITIES.has(c)) return '전북';
  if (c === '전남' || c === '전라남도' || JEONNAM_CITIES.has(c)) return '전남';
  if (c === '경북' || c === '경상북도' || GYEONGBUK_CITIES.has(c)) return '경북';
  if (c === '경남' || c === '경상남도' || GYEONGNAM_CITIES.has(c)) return '경남';
  if (c === '제주' || c.startsWith('제주')) return '제주';
  return '';
}

export default function GymsScreen() {
  const router = useRouter();
  const { data, isLoading, error } = useGyms();
  const { data: favoriteIds } = useFavoriteGymIds();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

  const regions = [
    '전체',
    '서울', '경기', '인천',
    '부산', '대구', '대전', '광주', '울산', '세종',
    '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
  ];

  const facilityOptions: { label: string; value: string; icon: 'zap' | 'activity' | 'maximize-2' }[] = [
    { label: '문보드', value: 'has_moonboard', icon: 'zap' },
    { label: '킬터보드', value: 'has_kilter', icon: 'zap' },
    { label: '리드벽', value: 'has_lead', icon: 'activity' },
    { label: '300평+ 대형', value: 'large_size', icon: 'maximize-2' },
  ];

  const matchRegion = (city: string, region: string) => {
    if (region === '전체') return true;
    return regionOf(city) === region;
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
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTitleRow}>
          <Text style={s.headerTitle}>암장</Text>
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>
              {filtered.length}
            </Text>
          </View>
        </View>
        <Text style={s.headerSubtitle}>
          원하는 시설과 지역의 암장을 편리하게 필터링해 보세요.
        </Text>
      </View>

      {/* Search Input */}
      <View style={s.searchContainer}>
        <View 
          style={[
            s.searchBar,
            isFocused && s.searchBarFocused
          ]}
        >
          <Feather name="search" size={18} color={isFocused ? '#0d9488' : '#64748b'} />
          <TextInput
            placeholder="이름·지점·지역 검색"
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={s.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={6}>
              <Feather name="x-circle" size={16} color="#64748b" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter wrapper block */}
      <View style={s.filterBlock}>
        {/* Region filter chips */}
        <View style={s.scrollFilterWrap}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.scrollFilterContent}
          >
            {regions.map((region) => {
              const isSelected = selectedRegion === region;
              return (
                <Pressable
                  key={region}
                  onPress={() => setSelectedRegion(region)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                >
                  <View
                    style={[
                      s.regionChip,
                      isSelected ? s.regionChipActive : s.regionChipInactive
                    ]}
                  >
                    <Text
                      style={[
                        s.regionChipText,
                        isSelected ? s.regionChipTextActive : s.regionChipTextInactive
                      ]}
                    >
                      {region}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Facility toggles */}
        <View style={s.scrollFilterWrap}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.scrollFilterContent}
          >
            {facilityOptions.map((opt) => {
              const isSelected = selectedFacilities.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => toggleFacility(opt.value)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                >
                  <View
                    style={[
                      s.facilityChip,
                      isSelected ? s.facilityChipActive : s.facilityChipInactive
                    ]}
                  >
                    <Feather
                      name={opt.icon}
                      size={12}
                      color={isSelected ? '#0d9488' : '#64748b'}
                    />
                    <Text
                      style={[
                        s.facilityChipText,
                        isSelected ? s.facilityChipTextActive : s.facilityChipTextInactive
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {isLoading && (
        <View style={s.loaderWrap}>
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      )}

      {error && (
        <View style={s.errorCard}>
          <Text style={s.errorCardText}>{error.message}</Text>
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
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            data && !isLoading ? (
              <View style={s.emptyWrap}>
                <View style={s.emptyIconWrap}>
                  <Feather name="map-pin" size={32} color="#94a3b8" />
                </View>
                <Text style={s.emptyTitle}>검색 결과가 없어요</Text>
                <Text style={s.emptySubtitle}>필터를 변경하거나 다른 검색어를 입력해 보세요.</Text>
                <Pressable
                  onPress={() => router.push('/gyms/request')}
                  style={({ pressed }) => [s.requestBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={s.requestBtnText}>
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
                style={({ pressed }) => [s.footerBtn, pressed && { opacity: 0.8 }]}
              >
                <Text style={s.footerBtnText}>
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
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <View style={s.gymCard}>
        {/* Photo placeholder — 사진 도입 전까지 해시 기반 색 + 이니셜 */}
        <GymThumbnail name={`${gym.name}${gym.branch ?? ''}`} size={56} />

        <View style={s.gymCardInfo}>
          {/* Name and Branch */}
          <View style={s.gymTitleRow}>
            <Text style={s.gymName} numberOfLines={1}>{gym.name}</Text>
            {gym.branch && (
              <Text style={s.gymBranch} numberOfLines={1}>
                {gym.branch}
              </Text>
            )}
          </View>

          {/* Location & Size Info */}
          <View style={s.gymMetaRow}>
            <View style={s.gymMetaItem}>
              <Feather name="map-pin" size={11} color="#64748b" />
              <Text style={s.gymMetaText} numberOfLines={1}>
                {location}
              </Text>
            </View>
            {sizeBit && (
              <View style={s.gymMetaItem}>
                <Feather name="grid" size={11} color="#64748b" />
                <Text style={s.gymMetaText}>
                  {sizeBit}
                </Text>
              </View>
            )}
          </View>

          {/* Facilities Badges */}
          <View style={s.badgeWrap}>
            {gym.has_boulder && (
              <View style={s.badgeRegular}>
                <Text style={s.badgeRegularText}>볼더링</Text>
              </View>
            )}
            {gym.has_lead && (
              <View style={s.badgeRegular}>
                <Text style={s.badgeRegularText}>리드</Text>
              </View>
            )}
            {gym.has_top_rope && (
              <View style={s.badgeRegular}>
                <Text style={s.badgeRegularText}>탑로프</Text>
              </View>
            )}
            
            {/* Tech Boards with Distinct Glow Styles */}
            {gym.has_moonboard && (
              <View style={s.badgeMoonboard}>
                <Feather name="zap" size={10} color="#7e22ce" />
                <Text style={s.badgeMoonboardText}>문보드</Text>
              </View>
            )}
            {gym.has_kilter && (
              <View style={s.badgeKilter}>
                <Feather name="zap" size={10} color="#1d4ed8" />
                <Text style={s.badgeKilterText}>킬터보드</Text>
              </View>
            )}
            {gym.has_tension && (
              <View style={s.badgeTension}>
                <Feather name="zap" size={10} color="#c2410c" />
                <Text style={s.badgeTensionText}>텐션보드</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Right: favorite toggle + chevron */}
        <View style={s.gymCardRight}>
          <Pressable
            onPress={() =>
              toggleFavorite.mutate({ gymId: gym.id, currentlyFavorite: isFavorite })
            }
            hitSlop={10}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }, s.favoriteBtn]}
          >
            <Feather
              name="star"
              size={20}
              color={isFavorite ? '#f59e0b' : '#cbd5e1'}
              fill={isFavorite ? '#f59e0b' : 'transparent'}
            />
          </Pressable>
          <Feather name="chevron-right" size={18} color="#cbd5e1" />
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  countBadge: {
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  countBadgeText: {
    color: '#0d9488',
    fontSize: 13,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },

  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchBarFocused: {
    borderColor: '#0d9488',
    backgroundColor: '#ffffff',
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    paddingVertical: 4,
    marginLeft: 8,
  },

  filterBlock: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingBottom: 8,
  },
  scrollFilterWrap: {
    paddingBottom: 4,
  },
  scrollFilterContent: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },

  regionChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  regionChipActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  regionChipInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  regionChipText: {
    fontSize: 13,
  },
  regionChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  regionChipTextInactive: {
    color: '#475569',
    fontWeight: '600',
  },

  facilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  facilityChipActive: {
    backgroundColor: '#f0fdfa',
    borderColor: '#0d9488',
  },
  facilityChipInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  facilityChipText: {
    fontSize: 12,
  },
  facilityChipTextActive: {
    color: '#0d9488',
    fontWeight: '700',
  },
  facilityChipTextInactive: {
    color: '#64748b',
    fontWeight: '600',
  },

  loaderWrap: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff5f5',
  },
  errorCardText: {
    color: '#ef4444',
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
  },

  emptyWrap: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  requestBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  requestBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },

  footerBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  footerBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },

  // Gym Card styles
  gymCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  gymCardInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  gymTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  gymName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  gymBranch: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 6,
  },
  gymMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  gymMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gymMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  badgeRegular: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeRegularText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  badgeMoonboard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeMoonboardText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7e22ce',
  },
  badgeKilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeKilterText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  badgeTension: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeTensionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c2410c',
  },
  gymCardRight: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
    gap: 8,
  },
  favoriteBtn: {
    padding: 4,
  },
});
