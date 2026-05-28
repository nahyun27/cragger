import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { SessionCalendar } from '@/components/log/session-calendar';
import { SessionRow } from '@/components/session/session-row';
import { useRecentSessions } from '@/hooks/use-recent-sessions';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

type ViewMode = 'list' | 'calendar';

export default function LogScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const { data: sessions, isLoading, error, isRefetching, refetch } = useRecentSessions(20);
  const isEmpty = !isLoading && (sessions?.length ?? 0) === 0;

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

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
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
            <Feather name="plus" size={14} color="#ffffff" />
            <Text style={s.writeBtnText}>기록 추가</Text>
          </View>
        </Pressable>
      </View>

      {/* View toggle */}
      <View style={s.toggleWrap}>
        <View style={s.toggle}>
          <ToggleBtn
            label="리스트"
            icon="list"
            active={viewMode === 'list'}
            onPress={() => setViewMode('list')}
          />
          <ToggleBtn
            label="캘린더"
            icon="calendar"
            active={viewMode === 'calendar'}
            onPress={() => setViewMode('calendar')}
          />
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: c.bg.primary }}>
        {viewMode === 'calendar' ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 4 }}>
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
                data={sessions}
                keyExtractor={(item) => item.id}
                contentContainerStyle={s.listContent}
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

                    {isEmpty && (
                      <View style={s.emptyCard}>
                        <View style={s.emptyIconWrapper}>
                          <Feather name="activity" size={28} color="#94a3b8" />
                        </View>
                        <Text style={s.emptyTitle}>기록이 존재하지 않습니다</Text>
                        <Text style={s.emptySubtitle}>
                          첫 번째 등반 흔적을 남기고 기록을 쌓아가보세요!
                        </Text>
                        <Pressable
                          onPress={() => router.push('/session/new')}
                          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                        >
                          <View style={s.emptyBtn}>
                            <Text style={s.emptyBtnText}>등반 기록 추가하기</Text>
                          </View>
                        </Pressable>
                      </View>
                    )}
                  </>
                }
                renderItem={({ item }) => <SessionRow session={item} />}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function ToggleBtn({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  active: boolean;
  onPress: () => void;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  // Pressable 함수형 style 의 flex 가 silently drop 되는 케이스를 피하려고
  // children-as-function + 정적 style 패턴.
  return (
    <Pressable onPress={onPress} style={s.togglePressable}>
      {({ pressed }) => (
        <View style={[s.toggleBtn, active && s.toggleBtnActive, pressed && { opacity: 0.85 }]}>
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
      backgroundColor: c.bg.card,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 14,
      backgroundColor: c.bg.card,
      borderBottomWidth: 1,
      borderColor: c.border.subtle,
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
      paddingTop: 14,
      paddingBottom: 6,
      backgroundColor: c.bg.primary,
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
