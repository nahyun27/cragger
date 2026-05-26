import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { BarChart, LineChart } from 'react-native-gifted-charts';

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

  // 추이는 scope 무관 항상 최근 6개월 (토글 위 별도 카드).
  // 클라이밍 안 한 날도 있으니 scope 별 분기는 과해보임.
  const { data: deep } = useMonthlyStats({ months: 6 });

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

      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* 1) 추이 — scope 무관 항상 최근 6개월 */}
        {deep && deep.monthly.some((m) => m.sessionCount > 0 || m.sendCount > 0) && (
          <MonthlyTrendCard deep={{ monthly: deep.monthly }} title="최근 6개월 추이" />
        )}

        {/* 2) Scope toggle + anchor */}
        <View style={s.toggle}>
          <ScopeBtn label="월별" active={scope === 'month'} onPress={() => setScope('month')} />
          <ScopeBtn label="년별" active={scope === 'year'} onPress={() => setScope('year')} />
          <ScopeBtn label="전체" active={scope === 'all'} onPress={() => setScope('all')} />
        </View>
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

        {stats && stats.gradeDistribution.length > 0 && (
          <BoulderStatsCard
            grades={stats.gradeDistribution}
            maxGrade={stats.maxVGrade}
          />
        )}

        {stats && stats.leadDistribution.length > 0 && (
          <LeadStatsCard
            grades={stats.leadDistribution}
            maxGrade={stats.maxLeadGrade}
          />
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

const COLOR_SESSION = '#38BDF8';  // sky-400 — 산뜻 파랑
const COLOR_SEND = '#34D399';     // emerald-400 — 산뜻 초록
const COLOR_GRADE = '#22D3EE';    // cyan-400

// 카드 내부 차트가 그릴 수 있는 가로 폭.
// 화면 폭 - ScrollView padding(16*2) - card padding(16*2) - yAxis 라벨(~32)
function chartInnerWidth(windowWidth: number): number {
  return Math.max(180, windowWidth - 16 * 2 - 16 * 2 - 32);
}

function MonthlyTrendCard({ deep, title = '최근 6개월 추이' }: { deep: { monthly: { monthLabel: string; sessionCount: number; sendCount: number }[] }; title?: string }) {
  const { width: winW } = useWindowDimensions();
  const sessionMax = Math.max(...deep.monthly.map((m) => m.sessionCount), 1);
  const sendMax = Math.max(...deep.monthly.map((m) => m.sendCount), 1);
  const maxVal = Math.max(sessionMax, sendMax);

  const sessionData = deep.monthly.map((m) => ({
    value: m.sessionCount,
    label: m.monthLabel,
    dataPointColor: COLOR_SESSION,
  }));
  const sendData = deep.monthly.map((m) => ({
    value: m.sendCount,
    dataPointColor: COLOR_SEND,
  }));

  const N = deep.monthly.length;
  const innerW = chartInnerWidth(winW);
  const initialSpacing = 10;
  const endSpacing = 10;
  const spacing = N > 1
    ? Math.max(2, Math.floor((innerW - initialSpacing - endSpacing) / (N - 1)))
    : innerW;
  // 데이터 포인트 많으면 작게.
  const pointRadius = N > 16 ? 2 : N > 10 ? 3 : 4;

  return (
    <View style={s.chartCard}>
      <View style={s.chartHeader}>
        <Text style={s.chartTitle}>{title}</Text>
        <View style={s.chartLegendRow}>
          <View style={s.chartLegendItem}>
            <View style={[s.chartLegendDot, { backgroundColor: COLOR_SESSION }]} />
            <Text style={s.chartLegendText}>세션</Text>
          </View>
          <View style={s.chartLegendItem}>
            <View style={[s.chartLegendDot, { backgroundColor: COLOR_SEND }]} />
            <Text style={s.chartLegendText}>완등</Text>
          </View>
        </View>
      </View>
      <LineChart
        data={sessionData}
        data2={sendData}
        color1={COLOR_SESSION}
        color2={COLOR_SEND}
        thickness={2.5}
        thickness2={2.5}
        curved
        height={140}
        width={innerW}
        spacing={spacing}
        initialSpacing={initialSpacing}
        endSpacing={endSpacing}
        dataPointsRadius={pointRadius}
        dataPointsColor1={COLOR_SESSION}
        dataPointsColor2={COLOR_SEND}
        yAxisThickness={0}
        xAxisThickness={1}
        xAxisColor="#e2e8f0"
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

function BoulderStatsCard({
  grades,
  maxGrade,
}: {
  grades: { vGrade: string; sendCount: number }[];
  maxGrade: string | null;
}) {
  return (
    <DistributionCard
      title="볼더링 통계"
      labelKey="vGrade"
      data={grades}
      maxGrade={maxGrade}
      barColor={COLOR_GRADE}
    />
  );
}

function LeadStatsCard({
  grades,
  maxGrade,
}: {
  grades: { grade: string; sendCount: number }[];
  maxGrade: string | null;
}) {
  return (
    <DistributionCard
      title="리드 통계"
      labelKey="grade"
      data={grades}
      maxGrade={maxGrade}
      barColor="#F59E0B"  // amber — 리드 톤
    />
  );
}

function DistributionCard<T extends { sendCount: number }>({
  title,
  labelKey,
  data,
  maxGrade,
  barColor,
}: {
  title: string;
  labelKey: keyof T;
  data: T[];
  maxGrade: string | null;
  barColor: string;
}) {
  const { width: winW } = useWindowDimensions();
  const barData = data.map((g) => ({
    value: g.sendCount,
    label: String(g[labelKey]),
    frontColor: barColor,
  }));
  const maxVal = Math.max(...barData.map((b) => b.value), 1);

  // bar + spacing 합산이 inner 너비 안에 들어가게.
  const N = barData.length;
  const innerW = chartInnerWidth(winW);
  const initialSpacing = 8;
  // bar 1개 + spacing 1개 = (innerW - initialSpacing) / N
  const unit = N > 0 ? Math.max(8, Math.floor((innerW - initialSpacing) / N)) : 30;
  const barWidth = Math.max(6, Math.floor(unit * 0.6));
  const spacing = Math.max(2, unit - barWidth);

  return (
    <View style={s.chartCard}>
      <View style={s.chartHeader}>
        <Text style={s.chartTitle}>{title}</Text>
        {maxGrade && (
          <View style={s.maxVPill}>
            <Feather name="award" size={11} color="#d97706" />
            <Text style={s.maxVPillText}>최고 {maxGrade}</Text>
          </View>
        )}
      </View>
      <BarChart
        data={barData}
        height={120}
        width={innerW}
        barWidth={barWidth}
        spacing={spacing}
        initialSpacing={initialSpacing}
        endSpacing={4}
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
  // Pressable 함수형 style 이 flex: 1 을 silently drop 해서 width 0 으로
  // 무너지는 케이스. children-as-function + inner View 패턴으로 안전하게.
  return (
    <Pressable onPress={onPress} style={s.scopeBtnPressable}>
      {({ pressed }) => (
        <View style={[s.scopeBtn, active && s.scopeBtnActive, pressed && { opacity: 0.85 }]}>
          <Text style={[s.scopeBtnLabel, active && s.scopeBtnLabelActive]}>{label}</Text>
        </View>
      )}
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
  scopeBtnPressable: {
    flex: 1,
  },
  scopeBtn: {
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
