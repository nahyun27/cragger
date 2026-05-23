import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { GymStatsCard } from '@/components/stats/gym-stats-card';
import { useUserStats } from '@/hooks/use-user-stats';
import {
  currentMonth,
  currentYear,
  formatMonth,
  formatYear,
  monthRange,
  yearRange,
} from '@/lib/date-ranges';

type Scope = 'month' | 'year' | 'all';

export default function StatsScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>('month');
  const [monthAnchor, setMonthAnchor] = useState<{ year: number; month: number }>(
    () => currentMonth(),
  );
  const [yearAnchor, setYearAnchor] = useState<number>(() => currentYear());

  const range = useMemo(() => {
    if (scope === 'month') return monthRange(monthAnchor.year, monthAnchor.month);
    if (scope === 'year') return yearRange(yearAnchor);
    return {};
  }, [scope, monthAnchor, yearAnchor]);

  const { data: stats, isLoading, error } = useUserStats(range);

  function shiftMonth(delta: number) {
    setMonthAnchor((cur) => {
      let m = cur.month + delta;
      let y = cur.year;
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      while (m > 12) {
        m -= 12;
        y += 1;
      }
      return { year: y, month: m };
    });
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <View style={s.backBtn}>
            <Feather name="arrow-left" size={22} color="#0f172a" />
          </View>
        </Pressable>
        <Text style={s.headerTitle}>전체 통계</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Scope toggle */}
      <View style={s.toggleWrap}>
        <View style={s.toggle}>
          <ScopeBtn label="월별" active={scope === 'month'} onPress={() => setScope('month')} />
          <ScopeBtn label="년별" active={scope === 'year'} onPress={() => setScope('year')} />
          <ScopeBtn label="전체" active={scope === 'all'} onPress={() => setScope('all')} />
        </View>
      </View>

      {/* Anchor picker (month/year) */}
      {scope === 'month' && (
        <AnchorPicker
          label={formatMonth(monthAnchor.year, monthAnchor.month)}
          onPrev={() => shiftMonth(-1)}
          onNext={() => shiftMonth(1)}
          canGoNext={
            monthAnchor.year < currentYear() ||
            (monthAnchor.year === currentYear() && monthAnchor.month < currentMonth().month)
          }
        />
      )}
      {scope === 'year' && (
        <AnchorPicker
          label={formatYear(yearAnchor)}
          onPrev={() => setYearAnchor((y) => y - 1)}
          onNext={() => setYearAnchor((y) => y + 1)}
          canGoNext={yearAnchor < currentYear()}
        />
      )}

      <ScrollView contentContainerStyle={s.scrollContent}>
        {isLoading && (
          <View style={s.loaderWrap}>
            <ActivityIndicator color="#0d9488" />
          </View>
        )}

        {error && (
          <View style={s.errorCard}>
            <Text style={s.errorText}>{error.message}</Text>
          </View>
        )}

        {stats && (
          <>
            <View style={s.summaryCard}>
              <View style={s.summaryMetricsRow}>
                <SummaryMetric label="세션" value={stats.totalSessions} icon="calendar" />
                <Divider />
                <SummaryMetric label="완등" value={stats.totalSends} icon="check-circle" />
                <Divider />
                <SummaryMetric label="활동 일수" value={stats.activityDays} icon="award" />
              </View>
            </View>

            {stats.gyms.length === 0 ? (
              <View style={s.emptyCard}>
                <Feather name="activity" size={24} color="#94a3b8" />
                <Text style={s.emptyTitle}>해당 기간 기록이 없어요</Text>
                <Text style={s.emptySubtitle}>
                  {scope === 'month'
                    ? '다른 달로 이동해 보세요'
                    : scope === 'year'
                    ? '다른 년도로 이동해 보세요'
                    : '아직 기록이 없어요'}
                </Text>
              </View>
            ) : (
              <View style={s.gymList}>
                {stats.gyms.map((gym, i) => (
                  <GymStatsCard
                    key={gym.gymId}
                    gym={gym}
                    defaultExpanded={i < 1}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ScopeBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[s.scopeBtn, active && s.scopeBtnActive]}>
        <Text style={[s.scopeBtnLabel, active && s.scopeBtnLabelActive]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function AnchorPicker({
  label,
  onPrev,
  onNext,
  canGoNext,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  canGoNext: boolean;
}) {
  return (
    <View style={s.anchorRow}>
      <Pressable
        onPress={onPrev}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
      >
        <View style={s.anchorBtn}>
          <Feather name="chevron-left" size={18} color="#0f172a" />
        </View>
      </Pressable>
      <Text style={s.anchorLabel}>{label}</Text>
      <Pressable
        onPress={canGoNext ? onNext : undefined}
        hitSlop={8}
        disabled={!canGoNext}
        style={({ pressed }) => ({ opacity: !canGoNext ? 0.3 : pressed ? 0.5 : 1 })}
      >
        <View style={s.anchorBtn}>
          <Feather name="chevron-right" size={18} color="#0f172a" />
        </View>
      </Pressable>
    </View>
  );
}

function SummaryMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Feather>['name'];
}) {
  return (
    <View style={s.metricCol}>
      <Feather name={icon} size={14} color="#475569" />
      <Text style={s.metricVal}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },

  toggleWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#f8fafc',
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  scopeBtn: {
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  scopeBtnLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  scopeBtnLabelActive: { fontWeight: '800', color: '#0f172a' },

  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  anchorBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  anchorLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    minWidth: 120,
    textAlign: 'center',
  },

  scrollContent: { padding: 16, paddingBottom: 32, gap: 12 },
  loaderWrap: { paddingVertical: 24, alignItems: 'center' },

  summaryCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  summaryMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricCol: { flex: 1, alignItems: 'center', gap: 4 },
  metricVal: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  metricLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: '#e2e8f0' },

  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    marginTop: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  emptySubtitle: { fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 16 },

  errorCard: {
    margin: 4,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  gymList: { gap: 10, marginTop: 4 },
});
