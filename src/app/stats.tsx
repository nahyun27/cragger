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

import { BarChart } from 'react-native-gifted-charts';

import { GymStatsCard } from '@/components/stats/gym-stats-card';
import { useMonthlyStats } from '@/hooks/use-monthly-stats';
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
  const { data: deep } = useMonthlyStats(6);

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
            <ActivityIndicator color="#06b6d4" />
          </View>
        )}

        {error && (
          <View style={s.errorCard}>
            <Text style={s.errorText}>{error.message}</Text>
          </View>
        )}

        {deep && deep.monthly.some((m) => m.sessionCount > 0 || m.sendCount > 0) && (
          <MonthlyTrendCard deep={deep} />
        )}

        {deep && deep.gradeDistribution.length > 0 && (
          <GradeDistributionCard deep={deep} />
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

function MonthlyTrendCard({ deep }: { deep: { monthly: { monthLabel: string; sessionCount: number; sendCount: number }[] } }) {
  // grouped bars: 세션 + 완등
  const sessionMax = Math.max(...deep.monthly.map((m) => m.sessionCount), 1);
  const sendMax = Math.max(...deep.monthly.map((m) => m.sendCount), 1);
  const maxVal = Math.max(sessionMax, sendMax);

  const barData: Array<{
    value: number;
    label?: string;
    spacing?: number;
    frontColor: string;
  }> = [];
  for (const m of deep.monthly) {
    barData.push({
      value: m.sessionCount,
      label: m.monthLabel,
      spacing: 4,
      frontColor: '#2563eb',
    });
    barData.push({
      value: m.sendCount,
      frontColor: '#16a34a',
    });
  }

  return (
    <View style={s.chartCard}>
      <View style={s.chartHeader}>
        <Text style={s.chartTitle}>최근 6개월 추이</Text>
        <View style={s.chartLegendRow}>
          <View style={s.chartLegendItem}>
            <View style={[s.chartLegendDot, { backgroundColor: '#2563eb' }]} />
            <Text style={s.chartLegendText}>세션</Text>
          </View>
          <View style={s.chartLegendItem}>
            <View style={[s.chartLegendDot, { backgroundColor: '#16a34a' }]} />
            <Text style={s.chartLegendText}>완등</Text>
          </View>
        </View>
      </View>
      <BarChart
        data={barData}
        height={140}
        barWidth={14}
        spacing={18}
        initialSpacing={8}
        barBorderRadius={3}
        yAxisThickness={0}
        xAxisThickness={0}
        xAxisLabelTextStyle={{ color: '#94a3b8', fontSize: 10 }}
        yAxisTextStyle={{ color: '#94a3b8', fontSize: 10 }}
        noOfSections={Math.min(4, maxVal)}
        maxValue={maxVal}
        hideRules
        disableScroll
      />
    </View>
  );
}

function GradeDistributionCard({
  deep,
}: {
  deep: { gradeDistribution: { vGrade: string; sendCount: number }[]; maxVGrade: string | null };
}) {
  const barData = deep.gradeDistribution.map((g) => ({
    value: g.sendCount,
    label: g.vGrade,
    frontColor: '#06b6d4',
  }));
  const maxVal = Math.max(...barData.map((b) => b.value), 1);

  return (
    <View style={s.chartCard}>
      <View style={s.chartHeader}>
        <Text style={s.chartTitle}>V그레이드 분포</Text>
        {deep.maxVGrade && (
          <View style={s.maxVPill}>
            <Feather name="award" size={11} color="#d97706" />
            <Text style={s.maxVPillText}>최고 {deep.maxVGrade}</Text>
          </View>
        )}
      </View>
      <BarChart
        data={barData}
        height={120}
        barWidth={22}
        spacing={14}
        initialSpacing={8}
        barBorderRadius={3}
        yAxisThickness={0}
        xAxisThickness={0}
        xAxisLabelTextStyle={{ color: '#94a3b8', fontSize: 10 }}
        yAxisTextStyle={{ color: '#94a3b8', fontSize: 10 }}
        noOfSections={Math.min(4, maxVal)}
        maxValue={maxVal}
        hideRules
        disableScroll
      />
    </View>
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
    paddingTop: 14,
    backgroundColor: '#f8fafc',
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 5,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeBtnActive: {
    backgroundColor: '#06b6d4',
    shadowColor: '#06b6d4',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  scopeBtnLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  scopeBtnLabelActive: { fontWeight: '800', color: '#ffffff' },

  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: '#f8fafc',
  },
  anchorBtn: {
    width: 36,
    height: 36,
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
    minWidth: 140,
    textAlign: 'center',
    letterSpacing: -0.3,
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

  // Chart cards
  chartCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 16,
    paddingBottom: 6,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  chartLegendRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chartLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chartLegendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  maxVPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  maxVPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
});
