import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, SectionList, Text, TextInput, View } from 'react-native';

import { GymThumbnail } from '@/components/gym/gym-thumbnail';
import { Sheet } from '@/components/ui/sheet';
import { useFavoriteGymIds } from '@/hooks/use-favorites';
import type { GymListItem } from '@/hooks/use-gyms';
import { useThemeColors } from '@/lib/theme';

type Props = {
  visible: boolean;
  gyms: GymListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export function GymPickerModal({ visible, gyms, selectedId, onSelect, onClose }: Props) {
  const c = useThemeColors();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const { data: favoriteIds } = useFavoriteGymIds();

  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;

  // 검색 필터
  const matches = useMemo(() => {
    if (!isSearching) return gyms;
    return gyms.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.branch ?? '').toLowerCase().includes(q) ||
        g.city.toLowerCase().includes(q) ||
        (g.district ?? '').toLowerCase().includes(q),
    );
  }, [gyms, q, isSearching]);

  // 즐겨찾기 / 일반 분리
  const { favs, rest } = useMemo(() => {
    if (!favoriteIds || favoriteIds.size === 0) {
      return { favs: [] as GymListItem[], rest: matches };
    }
    const f: GymListItem[] = [];
    const r: GymListItem[] = [];
    for (const g of matches) {
      (favoriteIds.has(g.id) ? f : r).push(g);
    }
    return { favs: f, rest: r };
  }, [matches, favoriteIds]);

  const sections = useMemo(() => {
    const out: { title: string; data: GymListItem[] }[] = [];
    if (favs.length > 0) out.push({ title: '즐겨찾기', data: favs });
    if (rest.length > 0) out.push({ title: isSearching ? '검색 결과' : '전체 암장', data: rest });
    return out;
  }, [favs, rest, isSearching]);

  const renderRow = (item: GymListItem) => {
    const isFav = favoriteIds?.has(item.id) ?? false;
    const isSelected = item.id === selectedId;
    return (
      <Pressable onPress={() => onSelect(item.id)}>
        {({ pressed }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: isSelected ? c.bg.accent : pressed ? c.bg.subtle : 'transparent',
            }}
          >
            <View style={{ width: 44, height: 44, marginRight: 12 }}>
              <GymThumbnail
                name={item.name}
                branch={item.branch}
                logoUrl={item.logo_url}
                logoBgHex={item.logo_bg_hex}
                size={44}
              />
              {isFav && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: c.bg.card,
                    borderRadius: 10,
                    padding: 2,
                  }}
                >
                  <MaterialCommunityIcons name="star" size={12} color="#f59e0b" />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: isSelected ? c.brand.primary : c.text.primary,
                    letterSpacing: -0.2,
                  }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.branch ? (
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: c.text.secondary,
                      marginLeft: 6,
                    }}
                    numberOfLines={1}
                  >
                    {item.branch}
                  </Text>
                ) : null}
              </View>
              <Text
                style={{
                  fontSize: 11,
                  color: c.text.tertiary,
                  fontWeight: '600',
                  marginTop: 2,
                }}
              >
                {[item.city, item.district].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {isSelected && (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: c.brand.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 12,
                }}
              >
                <Feather name="check" size={14} color={c.brand.onPrimary} />
              </View>
            )}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} variant="full" title="암장 선택" noScroll backgroundColor={c.bg.card}>
      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: c.bg.subtle,
            borderWidth: 1.5,
            borderColor: searchFocused ? c.brand.primary : 'transparent',
          }}
        >
          <Feather
            name="search"
            size={16}
            color={searchFocused ? c.brand.primary : c.text.tertiary}
          />
          <TextInput
            placeholder="이름·지점·지역 검색"
            placeholderTextColor={c.text.tertiary}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              flex: 1,
              fontSize: 15,
              color: c.text.primary,
              padding: 0,
            }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Feather name="x-circle" size={16} color={c.text.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {sections.length === 0 ? (
        <View style={{ paddingTop: 60, alignItems: 'center', gap: 8 }}>
          <Feather name="search" size={28} color={c.text.muted} />
          <Text style={{ fontSize: 14, color: c.text.tertiary, fontWeight: '600' }}>
            검색 결과가 없어요
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderRow(item)}
          renderSectionHeader={({ section }) => (
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 6,
                backgroundColor: c.bg.card,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: c.text.tertiary,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                {section.title} · {section.data.length}
              </Text>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, marginLeft: 72, backgroundColor: c.border.subtle }} />
          )}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </Sheet>
  );
}
