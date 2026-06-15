import { useRouter } from '@/lib/router';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { BarChart, LineChart } from 'react-native-gifted-charts';

import { GymStatsCard } from '@/components/stats/gym-stats-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useDailyActivity } from '@/hooks/use-daily-activity';
import { useMonthlyStats } from '@/hooks/use-monthly-stats';
import { useUserStats } from '@/hooks/use-user-stats';
import { useThemeColors, type ThemeColors } from '@/lib/theme';
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
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader title="전체 통계" onBack={() => router.back()} />

      <ScrollView
        style={{ backgroundColor: c.bg.primary }}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 12 }]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        {/* 1) 추이 — scope 무관 항상 최근 6개월 */}
        {deep && deep.monthly.some((m) => m.sessionCount > 0 || m.sendCount > 0) && (
          <MonthlyTrendCard deep={{ monthly: deep.monthly }} title="최근 6개월 추이" />
        )}
        {deep && deep.monthly.some((m) => m.maxVNum != null) && (
          <MonthlyVTrendCard monthly={deep.monthly} />
        )}
        <ActivityHeatmapCard />


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
            <ActivityIndicator color={c.brand.primary} />
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
                <SummaryMetric label="최고" value={stats.maxVGrade ?? '-'} icon="award" />
              </View>
            </View>

            {stats.gyms.length === 0 ? (
              <EmptyState
                compact
                icon="activity"
                tone="muted"
                title="해당 기간 기록이 없어요"
                description={
                  scope === 'month'
                    ? '다른 달로 이동해 보세요'
                    : scope === 'year'
                    ? '다른 년도로 이동해 보세요'
                    : '아직 기록이 없어요'
                }
              />
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
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

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
        xAxisLabelTextStyle={{ color: c.text.muted, fontSize: 10 }}
        yAxisTextStyle={{ color: c.text.muted, fontSize: 10 }}
        noOfSections={Math.min(4, maxVal)}
        maxValue={maxVal}
        hideRules
        disableScroll
      />
    </View>
  );
}

// ── 월별 최고 V그레이드 추이 ─────────────────────────────────
function MonthlyVTrendCard({
  monthly,
}: {
  monthly: { monthLabel: string; maxVNum: number | null }[];
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { width: winW } = useWindowDimensions();

  // gifted-charts 는 null 값을 잘 못 다루니 0으로 채우되 dataPointColor 로 빈 점 표시.
  // 더 나은 UX: 빈 월은 점 숨김.
  const N = monthly.length;
  const data = monthly.map((m) => ({
    value: m.maxVNum ?? 0,
    label: m.monthLabel,
    hideDataPoint: m.maxVNum == null,
  }));
  const innerW = chartInnerWidth(winW);
  const initialSpacing = 10;
  const endSpacing = 10;
  const spacing = N > 1
    ? Math.max(2, Math.floor((innerW - initialSpacing - endSpacing) / (N - 1)))
    : innerW;
  const maxVal = Math.max(...monthly.map((m) => m.maxVNum ?? 0), 4);
  return (
    <View style={s.chartCard}>
      <View style={s.chartHeader}>
        <Text style={s.chartTitle}>최고 V그레이드 추이</Text>
        <Text style={s.chartLegendText}>월별 최고 (체감 또는 평균)</Text>
      </View>
      <LineChart
        data={data}
        color1="#7c3aed"
        thickness={2.5}
        curved
        height={140}
        width={innerW}
        spacing={spacing}
        initialSpacing={initialSpacing}
        endSpacing={endSpacing}
        dataPointsRadius={4}
        dataPointsColor1="#7c3aed"
        yAxisThickness={0}
        xAxisThickness={1}
        xAxisColor="#e2e8f0"
        xAxisLabelTextStyle={{ color: c.text.muted, fontSize: 10 }}
        yAxisTextStyle={{ color: c.text.muted, fontSize: 10 }}
        noOfSections={Math.min(4, Math.ceil(maxVal))}
        maxValue={Math.ceil(maxVal)}
        hideRules
        disableScroll
      />
    </View>
  );
}

// ── 활동 heatmap (지난 ~52주, 7일 × N주) ────────────────────
function ActivityHeatmapCard() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { width: winW } = useWindowDimensions();
  const { data } = useDailyActivity(180);

  // 셀 계산: 일요일이 row=0, 토요일이 row=6.
  // 가장 오래된 날부터 시작해서 처음 일요일까지 빈 셀, 그 뒤 7일씩.
  const cells = useMemo(() => {
    if (!data) return null;
    const days: { date: string; count: number; dow: number }[] = [];
    const cur = new Date(data.start);
    const end = new Date(data.end);
    while (cur <= end) {
      const iso = cur.toISOString().slice(0, 10);
      days.push({ date: iso, count: data.byDate.get(iso) ?? 0, dow: cur.getDay() });
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [data]);

  if (!cells || cells.length === 0) return null;

  const max = Math.max(...cells.map((d) => d.count), 1);
  function level(count: number): number {
    if (count === 0) return 0;
    const ratio = count / max;
    if (ratio < 0.34) return 1;
    if (ratio < 0.67) return 2;
    return 3;
  }
  const intensity = ['transparent', '#a7f3d0', '#34d399', '#059669'];

  // 첫 날의 요일 만큼 빈 셀 prefix
  const leadEmpty = cells[0].dow;
  const all = [
    ...Array.from({ length: leadEmpty }, () => null),
    ...cells,
  ];
  // 7행으로 transpose 하려면 col 별로 묶음
  const numCols = Math.ceil(all.length / 7);
  const grid: ({ count: number } | null)[][] = Array.from({ length: 7 }, () => []);
  for (let i = 0; i < all.length; i++) {
    const row = i % 7;
    grid[row].push(all[i] == null ? null : { count: all[i]!.count });
  }
  // 7행 길이가 다를 수 있어 마지막 열 빈 셀로 채움
  for (const row of grid) {
    while (row.length < numCols) row.push(null);
  }

  // 카드 너비에 맞게 셀 크기 동적 계산 (chartInnerWidth 활용)
  const GAP = 2;
  const innerW = chartInnerWidth(winW);
  const CELL = Math.max(3, Math.floor((innerW - (numCols - 1) * GAP) / numCols));

  return (
    <View style={s.chartCard}>
      <View style={s.chartHeader}>
        <Text style={s.chartTitle}>활동 heatmap</Text>
        <Text style={s.chartLegendText}>지난 6개월</Text>
      </View>
      <View style={{ gap: GAP }}>
        {grid.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: GAP }}>
            {row.map((cell, ci) => (
              <View
                key={ci}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 2,
                  backgroundColor: cell ? intensity[level(cell.count)] : 'transparent',
                  borderWidth: cell ? 0 : 0,
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
        <Text style={[s.chartLegendText, { marginRight: 2 }]}>적음</Text>
        {[1, 2, 3].map((l) => (
          <View
            key={l}
            style={{
              width: CELL,
              height: CELL,
              borderRadius: 2,
              backgroundColor: intensity[l],
            }}
          />
        ))}
        <Text style={[s.chartLegendText, { marginLeft: 2 }]}>많음</Text>
      </View>
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
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

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
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
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
        xAxisLabelTextStyle={{ color: c.text.muted, fontSize: 10 }}
        yAxisTextStyle={{ color: c.text.muted, fontSize: 10 }}
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
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

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
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={s.anchorRow}>
      <Pressable
        onPress={onPrev}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
      >
        <View style={s.anchorBtn}>
          <Feather name="chevron-left" size={18} color={c.text.primary} />
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
          <Feather name="chevron-right" size={18} color={c.text.primary} />
        </View>
      </Pressable>
    </View>
  );
}

// profile.tsx 와 동일 톤 — 세션:파랑 / 완등:초록 / 최고:보라
const METRIC_ACCENT: Record<string, string> = {
  calendar: '#2563eb',
  'check-circle': '#16a34a',
  award: '#7c3aed',
};

function SummaryMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentProps<typeof Feather>['name'];
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const accent = METRIC_ACCENT[icon] ?? c.text.secondary;

  return (
    <View style={s.metricCol}>
      <View style={[s.metricIconBox, { backgroundColor: `${accent}15` }]}>
        <Feather name={icon} size={16} color={accent} />
      </View>
      <Text style={s.metricVal}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

function Divider() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return <View style={s.divider} />;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg.primary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: c.bg.card,
    borderBottomWidth: 1,
    borderColor: c.border.subtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.4,
  },

  toggleWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
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
  scopeBtnLabel: { fontSize: 13, fontWeight: '700', color: c.text.tertiary },
  scopeBtnLabelActive: { fontWeight: '800', color: '#ffffff' },

  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: c.bg.primary,
  },
  anchorBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg.card,
  },
  anchorLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: c.text.primary,
    minWidth: 140,
    textAlign: 'center',
    letterSpacing: -0.3,
  },

  scrollContent: { padding: 16, paddingBottom: 32, gap: 12 },
  loaderWrap: { paddingVertical: 24, alignItems: 'center' },

  summaryCard: {
    backgroundColor: c.bg.primary,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 22,
    padding: 18,
    shadowColor: c.shadow.color,
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
  metricIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricVal: { fontSize: 22, fontWeight: '900', color: c.text.primary },
  metricLabel: { fontSize: 11, fontWeight: '700', color: c.text.muted },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: '#e2e8f0' },

  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.border.strong,
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.bg.card,
    marginTop: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: c.text.primary },
  emptySubtitle: { fontSize: 11, color: c.text.muted, textAlign: 'center', lineHeight: 16 },

  errorCard: {
    margin: 4,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: c.status.danger, fontSize: 13, fontWeight: '600' },

  gymList: { gap: 10, marginTop: 4 },

  // Chart cards
  chartCard: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 18,
    padding: 16,
    paddingBottom: 6,
    shadowColor: c.shadow.color,
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
    color: c.text.primary,
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
    color: c.text.secondary,
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
}