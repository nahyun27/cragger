import { useRouter } from '@/lib/router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { SessionCalendar } from '@/components/log/session-calendar';
import { SessionRow } from '@/components/session/session-row';
import { EmptyState } from '@/components/ui/empty-state';
import { SESSION_CATEGORIES, type SessionCategory } from '@/constants/session-category';
import { useRecentSessions } from '@/hooks/use-recent-sessions';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

type ViewMode = 'list' | 'calendar';

export default function LogScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const toggleLayouts = useRef<{ x: number; y: number; width: number; height: number }[]>([]);
  const toggleX = useSharedValue(0);
  const toggleW = useSharedValue(0);
  const togglePillTop = useSharedValue(0);
  const togglePillH = useSharedValue(0);
  const SLIDE = { duration: 220, easing: Easing.out(Easing.ease) } as const;
  const pillStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: togglePillTop.value,
    height: togglePillH.value,
    left: toggleX.value,
    width: toggleW.value,
    borderRadius: 10,
    backgroundColor: c.brand.primary,
    shadowColor: c.brand.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  }));
  useEffect(() => {
    const idx = viewMode === 'calendar' ? 0 : 1;
    const layout = toggleLayouts.current[idx];
    if (layout) {
      toggleX.value = withTiming(layout.x, SLIDE);
      toggleW.value = withTiming(layout.width, SLIDE);
    }
  }, [viewMode]);
  const [categoryFilter, setCategoryFilter] = useState<SessionCategory | 'all'>('all');
  const [gymQuery, setGymQuery] = useState('');
  const { data: sessions, isLoading, error, isRefetching, refetch } = useRecentSessions(20);

  const filteredSessions = useMemo(() => {
    if (!sessions) return sessions;
    const q = gymQuery.trim().toLowerCase();
    return sessions.filter((s) => {
      if (categoryFilter !== 'all') {
        // 카테고리 미입력 세션은 attempts 기반 추론 (discipline) — boulder/lead/board 비교
        const inferred = s.category ?? (s.discipline === 'lead' ? 'lead' : s.discipline === 'boulder' ? 'boulder' : null);
        if (inferred !== categoryFilter) return false;
      }
      if (q) {
        const name = ((s.gym?.name ?? '') + ' ' + (s.gym?.branch ?? '')).toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [sessions, categoryFilter, gymQuery]);

  const isEmpty = !isLoading && (filteredSessions?.length ?? 0) === 0;

  const stats = useMemo(() => {
    if (!sessions) return { totalSessions: 0, totalSends: 0, latestGym: '-' };
    const totalSends = sessions.reduce((acc, s) => acc + (s.send_count || 0), 0);
    const latestGym = sessions[0]?.gym?.name || '-';
    return {
      totalSessions: sessions.length,
      totalSends,
      latestGym,
    };
  }, [sessions]);

  const insets = useSafeAreaInsets();

  return (
    <View style={s.container}>
      {/* Header */}
      <View
        className="z-20 border-b border-border-subtle absolute top-0 left-0 right-0"
        style={{
          paddingTop: Math.max(insets.top, 20),
          backgroundColor: c.bg.card,
        }}
      >
        <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>기록</Text>
          <Text style={s.headerSubtitle}>나의 등반 세션</Text>
        </View>
        <Pressable
          onPress={() => router.push('/session/new')}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          hitSlop={6}
        >
          <View style={s.writeBtn}>
            <Feather name="plus" size={14} color={c.brand.onPrimary} />
            <Text style={s.writeBtnText}>기록 추가</Text>
          </View>
        </Pressable>
        </View>

        {/* View toggle */}
        <View style={s.toggleWrap}>
        <View style={s.toggle}>
          <Animated.View style={pillStyle} />
          <ToggleBtn
            label="캘린더"
            icon="calendar"
            active={viewMode === 'calendar'}
            onPress={() => setViewMode('calendar')}
            onLayout={(e) => {
              const { x, y, width, height } = e.nativeEvent.layout;
              toggleLayouts.current[0] = { x, y, width, height };
              if (togglePillH.value === 0) { togglePillTop.value = y; togglePillH.value = height; }
              if (viewMode === 'calendar') { toggleX.value = x; toggleW.value = width; }
            }}
          />
          <ToggleBtn
            label="리스트"
            icon="list"
            active={viewMode === 'list'}
            onPress={() => setViewMode('list')}
            onLayout={(e) => {
              const { x, y, width, height } = e.nativeEvent.layout;
              toggleLayouts.current[1] = { x, y, width, height };
              if (togglePillH.value === 0) { togglePillTop.value = y; togglePillH.value = height; }
              if (viewMode === 'list') { toggleX.value = x; toggleW.value = width; }
            }}
          />
        </View>
      </View>
      </View>

      <View style={{ flex: 1, backgroundColor: c.bg.primary }}>
        {viewMode === 'calendar' ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingTop: Math.max(insets.top, 20) + 134,
              paddingBottom: 120,  // 리스트 뷰와 동일 — 탭바 + 살짝
            }}
          >
            <SessionCalendar />
          </ScrollView>
        ) : (
          <>
            {isLoading && (
              <View style={s.loadingContainer}>
                <ActivityIndicator size="large" color={c.brand.primary} />
              </View>
            )}

            {error && (
              <View style={s.errorContainer}>
                <Text style={s.errorText}>{error.message}</Text>
              </View>
            )}

            {!isLoading && !error && (
              <FlatList
                data={filteredSessions}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[s.listContent, { paddingTop: Math.max(insets.top, 20) + 134 }]}
                contentInsetAdjustmentBehavior="never"
                automaticallyAdjustContentInsets={false}
                refreshing={isRefetching}
                onRefresh={refetch}
                ListHeaderComponent={
                  <>
                    {/* Dashboard summary card */}
                    <View style={s.statsCard}>
                      <View style={s.statsCardHeader}>
                        <View style={s.statsCardIconWrap}>
                          <Feather name="trending-up" size={12} color={c.brand.primary} />
                        </View>
                        <Text style={s.statsCardTitle}>최근 등반 통계</Text>
                      </View>
                      <View style={s.statsRow}>
                        <View style={s.statCol}>
                          <Text style={s.statLabel}>총 세션</Text>
                          <Text style={[s.statVal, { color: c.text.primary }]}>{stats.totalSessions}</Text>
                        </View>
                        <View style={s.statDivider} />
                        <View style={s.statCol}>
                          <Text style={s.statLabel}>총 완등</Text>
                          <Text style={[s.statVal, { color: c.brand.primary }]}>{stats.totalSends}</Text>
                        </View>
                        <View style={s.statDivider} />
                        <View style={s.statCol}>
                          <Text style={s.statLabel}>최근 암장</Text>
                          <Text style={s.statValLatest} numberOfLines={1}>
                            {stats.latestGym}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={s.sectionTitle}>지난 세션 목록</Text>

                    {/* 필터 — 카테고리 칩 + 암장 검색 */}
                    <View style={s.filterWrap}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 6, paddingRight: 16 }}
                      >
                        <FilterChip
                          label="전체"
                          active={categoryFilter === 'all'}
                          onPress={() => setCategoryFilter('all')}
                          fg={c.text.primary}
                          bg={c.bg.subtle}
                        />
                        {SESSION_CATEGORIES.map((cat) => (
                          <FilterChip
                            key={cat.key}
                            label={cat.label}
                            active={categoryFilter === cat.key}
                            onPress={() => setCategoryFilter(cat.key)}
                            fg={cat.fg}
                            bg={cat.bg}
                          />
                        ))}
                      </ScrollView>
                      <View style={s.searchBar}>
                        <Feather name="search" size={14} color={c.text.tertiary} />
                        <TextInput
                          value={gymQuery}
                          onChangeText={setGymQuery}
                          placeholder="암장 이름으로 검색"
                          placeholderTextColor={c.text.muted}
                          style={s.searchInput}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        {gymQuery.length > 0 && (
                          <Pressable onPress={() => setGymQuery('')} hitSlop={6}>
                            <Feather name="x" size={14} color={c.text.tertiary} />
                          </Pressable>
                        )}
                      </View>
                    </View>

                    {isEmpty && (
                      <EmptyState
                        icon="activity"
                        tone="muted"
                        title={
                          (sessions?.length ?? 0) === 0
                            ? '기록이 존재하지 않습니다'
                            : '조건에 맞는 기록이 없어요'
                        }
                        description={
                          (sessions?.length ?? 0) === 0
                            ? '첫 번째 등반 흔적을 남기고 기록을 쌓아가보세요!'
                            : '필터를 조정해보세요'
                        }
                        action={
                          (sessions?.length ?? 0) === 0
                            ? {
                                label: '등반 기록 추가하기',
                                icon: 'edit-3',
                                onPress: () => router.push('/session/new'),
                              }
                            : undefined
                        }
                      />
                    )}
                  </>
                }
                renderItem={({ item }) => <SessionRow session={item} />}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            )}
          </>
        )}
      </View>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  fg,
  bg,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  fg: string;
  bg: string;
}) {
  const c = useThemeColors();
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: active ? bg : c.bg.card,
            borderWidth: 1.5,
            borderColor: active ? fg : c.border.subtle,
            opacity: pressed ? 0.7 : 1,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: active ? fg : c.text.secondary,
              letterSpacing: -0.2,
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function ToggleBtn({
  label,
  icon,
  active,
  onPress,
  onLayout,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  active: boolean;
  onPress: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable onPress={onPress} onLayout={onLayout} style={s.togglePressable}>
      {({ pressed }) => (
        <View style={[s.toggleBtn, pressed && { opacity: 0.85 }]}>
          <Feather name={icon} size={14} color={active ? c.brand.onPrimary : c.text.tertiary} />
          <Text style={[s.toggleBtnLabel, active && s.toggleBtnLabelActive]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: c.text.primary,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 12,
      color: c.text.tertiary,
      marginTop: 2,
    },
    writeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      height: 38,
      borderRadius: 12,
      backgroundColor: c.brand.primary,
      shadowColor: c.brand.primary,
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
      justifyContent: 'center',
    },
    writeBtnText: {
      color: c.brand.onPrimary,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: -0.2,
    },

    toggleWrap: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 6,
    },
    toggle: {
      flexDirection: 'row',
      backgroundColor: c.bg.card,
      borderRadius: 14,
      padding: 5,
      gap: 4,
      borderWidth: 1,
      borderColor: c.border.subtle,
    },
    togglePressable: {
      flex: 1,
    },
    toggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 10,
    },
    toggleBtnActive: {
      backgroundColor: c.brand.primary,
      shadowColor: c.brand.primary,
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    toggleBtnLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text.tertiary,
    },
    toggleBtnLabelActive: {
      fontWeight: '800',
      color: c.brand.onPrimary,
    },

    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorContainer: {
      margin: 24,
      padding: 16,
      borderRadius: 16,
      backgroundColor: c.status.dangerBg,
      borderWidth: 1,
      borderColor: c.status.danger,
    },
    errorText: {
      color: c.status.danger,
      fontSize: 13,
      fontWeight: '600',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 120,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: c.text.primary,
      marginBottom: 12,
      marginTop: 8,
      paddingHorizontal: 4,
    },

    filterWrap: {
      gap: 8,
      marginBottom: 14,
      paddingHorizontal: 4,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: c.bg.card,
      borderWidth: 1,
      borderColor: c.border.subtle,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: c.text.primary,
      padding: 0,
    },

    statsCard: {
      backgroundColor: c.bg.card,
      borderWidth: 1,
      borderColor: c.border.subtle,
      borderRadius: 24,
      padding: 18,
      marginBottom: 20,
      shadowColor: c.shadow.color,
      shadowOpacity: c.shadow.opacity,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    statsCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 14,
    },
    statsCardIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: c.bg.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsCardTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: c.text.secondary,
      letterSpacing: 0.3,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statCol: {
      flex: 1,
      alignItems: 'center',
    },
    statDivider: {
      width: 1,
      height: 32,
      backgroundColor: c.border.subtle,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: c.text.muted,
      marginBottom: 4,
    },
    statVal: {
      fontSize: 22,
      fontWeight: '900',
    },
    statValLatest: {
      fontSize: 14,
      fontWeight: '800',
      color: c.brand.primaryDeep,
      marginTop: 4,
    },

    emptyCard: {
      borderWidth: 1,
      borderColor: c.border.strong,
      borderStyle: 'dashed',
      borderRadius: 22,
      padding: 28,
      alignItems: 'center',
      marginTop: 4,
      backgroundColor: c.bg.card,
    },
    emptyIconWrapper: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.bg.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: c.text.primary,
    },
    emptySubtitle: {
      fontSize: 11,
      color: c.text.tertiary,
      textAlign: 'center',
      lineHeight: 16,
      marginVertical: 10,
    },
    emptyBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: c.brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyBtnText: {
      color: c.brand.onPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
  });
}
