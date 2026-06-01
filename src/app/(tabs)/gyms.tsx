import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { GymThumbnail } from '@/components/gym/gym-thumbnail';
import { useFavoriteGymIds, useToggleFavorite } from '@/hooks/use-favorites';
import { useGyms, type GymListItem } from '@/hooks/use-gyms';
import { useThemeColors, useEffectiveScheme, type ThemeColors } from '@/lib/theme';

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
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data, isLoading, error } = useGyms();
  const { data: favoriteIds } = useFavoriteGymIds();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [regionModalOpen, setRegionModalOpen] = useState(false);

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

    // 1b. Favorites-only filter
    if (favoritesOnly) {
      filteredList = filteredList.filter((g) => favoriteIds?.has(g.id) ?? false);
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
  }, [data, query, selectedRegion, selectedFacilities, favoritesOnly, favoriteIds]);

  const toggleFacility = (fac: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(fac) ? prev.filter((f) => f !== fac) : [...prev, fac],
    );
  };

  const insets = useSafeAreaInsets();
  const scheme = useEffectiveScheme();

  return (
    <View style={s.container}>
      {/* Header with Glassmorphism */}
      <View className="z-20 border-b border-border-subtle absolute top-0 left-0 right-0" style={{ paddingTop: Math.max(insets.top, 20) }}>
        <BlurView
          tint={scheme === 'dark' ? 'dark' : 'light'}
          intensity={80}
          style={StyleSheet.absoluteFill}
        />
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
      </View>

      {/* Search Input */}
      <View style={[s.searchContainer, { paddingTop: Math.max(insets.top, 20) + 70 }]}>
        <View 
          style={[
            s.searchBar,
            isFocused && s.searchBarFocused
          ]}
        >
          <Feather name="search" size={18} color={isFocused ? c.brand.primary : c.text.tertiary} />
          <TextInput
            placeholder="이름·지점·지역 검색"
            placeholderTextColor={c.text.muted}
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
              <Feather name="x-circle" size={16} color={c.text.tertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter wrapper block */}
      <View style={s.filterBlock}>
        {/* Region select + favorites toggle (single row) */}
        <View style={s.topFilterRow}>
          <Pressable
            onPress={() => setRegionModalOpen(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <View
              style={[
                s.regionSelect,
                selectedRegion !== '전체' ? s.regionSelectActive : s.regionSelectInactive,
              ]}
            >
              <Feather
                name="map"
                size={14}
                color={selectedRegion !== '전체' ? c.brand.primary : c.text.secondary}
              />
              <Text
                style={[
                  s.regionSelectText,
                  selectedRegion !== '전체' ? s.regionSelectTextActive : s.regionSelectTextInactive,
                ]}
              >
                {selectedRegion === '전체' ? '전체 지역' : selectedRegion}
              </Text>
              <Feather
                name="chevron-down"
                size={14}
                color={selectedRegion !== '전체' ? c.brand.primary : c.text.tertiary}
              />
            </View>
          </Pressable>

          <Pressable
            onPress={() => setFavoritesOnly((v) => !v)}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <View
              style={[
                s.favOnlyChip,
                favoritesOnly ? s.favOnlyChipActive : s.favOnlyChipInactive,
              ]}
            >
              <Ionicons
                name={favoritesOnly ? "star" : "star-outline"}
                size={12}
                color={favoritesOnly ? c.brand.primary : c.text.tertiary}
              />
              <Text
                style={[
                  s.favOnlyText,
                  favoritesOnly ? s.favOnlyTextActive : s.favOnlyTextInactive,
                ]}
              >
                즐겨찾기만
              </Text>
            </View>
          </Pressable>
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
                      color={isSelected ? c.brand.primary : c.text.tertiary}
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
      <View style={{ flex: 1, backgroundColor: c.bg.primary }}>
        {isLoading && (
          <View style={s.loaderWrap}>
            <ActivityIndicator size="large" color={c.brand.primary} />
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
                    <Feather name="map-pin" size={32} color={c.text.muted} />
                  </View>
                  <Text style={s.emptyTitle}>검색 결과가 없어요</Text>
                  <Text style={s.emptySubtitle}>필터를 변경하거나 다른 검색어를 입력해 보세요.</Text>
                  <Pressable
                    onPress={() => router.push('/gyms/suggest-new' as never)}
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
                  onPress={() => router.push('/gyms/suggest-new' as never)}
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
      </View>
      {/* Region select modal */}
      <Modal
        visible={regionModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRegionModalOpen(false)}
      >
        <Pressable
          style={s.modalBackdrop}
          onPress={() => setRegionModalOpen(false)}
        >
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>지역 선택</Text>
              <Text style={s.modalSubtitle}>탐색할 지역을 선택해 주세요</Text>
            </View>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {regions.map((region) => {
                const active = region === selectedRegion;
                return (
                  <Pressable
                    key={region}
                    onPress={() => {
                      setSelectedRegion(region);
                      setRegionModalOpen(false);
                    }}
                  >
                    {({ pressed }) => (
                      <View
                        style={[
                          s.modalRow,
                          active && s.modalRowActive,
                          pressed && { backgroundColor: c.bg.subtle },
                        ]}
                      >
                        <Text
                          style={[
                            s.modalRowText,
                            active && s.modalRowTextActive,
                          ]}
                        >
                          {region === '전체' ? '전체 지역' : region}
                        </Text>
                        {active && <Feather name="check" size={18} color={c.brand.primary} />}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function GymCard({ gym, isFavorite }: { gym: GymListItem; isFavorite: boolean }) {
  const router = useRouter();
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
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
        <GymThumbnail name={gym.name} branch={gym.branch} size={56} />

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
              <Feather name="map-pin" size={11} color={c.text.tertiary} />
              <Text style={s.gymMetaText} numberOfLines={1}>
                {location}
              </Text>
            </View>
            {sizeBit && (
              <View style={s.gymMetaItem}>
                <Feather name="grid" size={11} color={c.text.tertiary} />
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
          >
            {({ pressed }) => (
              <View style={[{ opacity: pressed ? 0.6 : 1 }, s.favoriteBtn]}>
                <Ionicons
                  name={isFavorite ? "star" : "star-outline"}
                  size={20}
                  color={isFavorite ? c.status.warning : c.border.strong}
                />
              </View>
            )}
          </Pressable>
          <Feather name="chevron-right" size={18} color={c.border.strong} />
        </View>
      </View>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.card },
    header: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 8,
    },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: c.text.primary,
      letterSpacing: -0.5,
    },
    countBadge: {
      backgroundColor: c.bg.accent,
      paddingHorizontal: 10,
      paddingVertical: 2,
      borderRadius: 12,
      marginLeft: 8,
    },
    countBadgeText: {
      color: c.brand.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    headerSubtitle: {
      fontSize: 12,
      color: c.text.tertiary,
      marginTop: 4,
      fontWeight: '500',
    },

    searchContainer: {
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.bg.subtle,
      borderWidth: 1,
      borderColor: c.border.subtle,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    searchBarFocused: {
      borderColor: c.brand.primary,
      backgroundColor: c.bg.card,
    },
    searchInput: {
      flex: 1,
      color: c.text.primary,
      fontSize: 15,
      paddingVertical: 4,
      marginLeft: 8,
    },

    filterBlock: {
      borderBottomWidth: 1,
      borderColor: c.border.subtle,
      paddingBottom: 8,
    },
    scrollFilterWrap: { paddingBottom: 4 },
    scrollFilterContent: { paddingHorizontal: 20, gap: 8, flexDirection: 'row' },

    topFilterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingTop: 0,
      paddingBottom: 8,
    },
    regionSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
    },
    regionSelectActive: { backgroundColor: c.bg.accent, borderColor: c.brand.primary },
    regionSelectInactive: { backgroundColor: c.bg.card, borderColor: c.border.subtle },
    regionSelectText: { fontSize: 12, fontWeight: '700', minWidth: 54 },
    regionSelectTextActive: { color: c.brand.primaryDeep },
    regionSelectTextInactive: { color: c.text.primary },
    favOnlyChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
    },
    favOnlyChipActive: { backgroundColor: c.bg.accent, borderColor: c.brand.primary },
    favOnlyChipInactive: { backgroundColor: c.bg.card, borderColor: c.border.subtle },
    favOnlyText: { fontSize: 12, fontWeight: '700' },
    favOnlyTextActive: { color: c.brand.primaryDeep },
    favOnlyTextInactive: { color: c.text.tertiary },

    modalBackdrop: {
      flex: 1,
      backgroundColor: c.bg.overlay,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalSheet: {
      backgroundColor: c.bg.card,
      borderRadius: 24,
      padding: 20,
      shadowColor: c.shadow.color,
      shadowOpacity: 0.15,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    modalHeader: {
      paddingBottom: 12,
      marginBottom: 8,
      borderBottomWidth: 1,
      borderColor: c.border.subtle,
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: c.text.primary },
    modalSubtitle: { fontSize: 12, color: c.text.tertiary, marginTop: 4, fontWeight: '500' },
    modalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      marginVertical: 1,
    },
    modalRowActive: { backgroundColor: c.bg.subtle },
    modalRowText: { fontSize: 16, color: c.text.secondary, fontWeight: '600' },
    modalRowTextActive: { color: c.brand.primary, fontWeight: '800' },

    regionChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    regionChipActive: { backgroundColor: c.brand.primary, borderColor: c.brand.primary },
    regionChipInactive: { backgroundColor: c.bg.card, borderColor: c.border.subtle },
    regionChipText: { fontSize: 13 },
    regionChipTextActive: { color: c.brand.onPrimary, fontWeight: '800' },
    regionChipTextInactive: { color: c.text.secondary, fontWeight: '600' },

    facilityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
    },
    facilityChipActive: { backgroundColor: c.bg.accent, borderColor: c.brand.primary },
    facilityChipInactive: { backgroundColor: c.bg.card, borderColor: c.border.subtle },
    facilityChipText: { fontSize: 12 },
    facilityChipTextActive: { color: c.brand.primary, fontWeight: '700' },
    facilityChipTextInactive: { color: c.text.tertiary, fontWeight: '600' },

    loaderWrap: { padding: 48, alignItems: 'center', justifyContent: 'center' },
    errorCard: {
      marginHorizontal: 20,
      marginVertical: 12,
      borderWidth: 1,
      borderColor: c.status.danger,
      borderRadius: 12,
      padding: 16,
      backgroundColor: c.status.dangerBg,
    },
    errorCardText: { color: c.status.danger, fontWeight: '600' },

    listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },

    emptyWrap: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 4 },
    emptyIconWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: c.bg.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: c.text.primary, marginTop: 4 },
    emptySubtitle: {
      fontSize: 12,
      color: c.text.tertiary,
      textAlign: 'center',
      marginTop: 4,
      lineHeight: 18,
    },
    requestBtn: {
      marginTop: 16,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.border.strong,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: c.bg.card,
    },
    requestBtnText: { color: c.text.secondary, fontSize: 13, fontWeight: '700' },

    footerBtn: {
      marginTop: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.border.strong,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: c.bg.card,
    },
    footerBtnText: { color: c.text.tertiary, fontSize: 13, fontWeight: '600' },

    gymCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.bg.card,
      borderWidth: 1,
      borderColor: c.border.subtle,
      borderRadius: 20,
      padding: 14,
      marginBottom: 12,
      shadowColor: c.shadow.color,
      shadowOpacity: c.shadow.opacity,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    gymCardInfo: { flex: 1, marginLeft: 12, gap: 4 },
    gymTitleRow: { flexDirection: 'row', alignItems: 'baseline' },
    gymName: { fontSize: 15, fontWeight: '800', color: c.text.primary },
    gymBranch: { fontSize: 12, fontWeight: '600', color: c.text.tertiary, marginLeft: 6 },
    gymMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
    gymMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    gymMetaText: { fontSize: 11, fontWeight: '600', color: c.text.tertiary },
    badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    badgeRegular: {
      backgroundColor: c.bg.subtle,
      borderWidth: 1,
      borderColor: c.border.subtle,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    badgeRegularText: { fontSize: 10, fontWeight: '700', color: c.text.secondary },
    // 보드 뱃지는 카테고리 색깔(보드 종류 식별용) — 의도적으로 라이트/다크 동일 유지
    badgeMoonboard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: 'rgba(147, 51, 234, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(147, 51, 234, 0.3)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    badgeMoonboardText: { fontSize: 10, fontWeight: '800', color: '#a855f7' },
    badgeKilter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.3)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    badgeKilterText: { fontSize: 10, fontWeight: '800', color: '#3b82f6' },
    badgeTension: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: 'rgba(249, 115, 22, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(249, 115, 22, 0.3)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    badgeTensionText: { fontSize: 10, fontWeight: '800', color: '#f97316' },
    gymCardRight: { justifyContent: 'center', alignItems: 'center', paddingLeft: 8, gap: 8 },
    favoriteBtn: { padding: 4 },
  });
}
