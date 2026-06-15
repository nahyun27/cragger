import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, LocaleConfig, type DateData } from 'react-native-calendars';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { PlanSheet } from '@/components/log/plan-sheet';
import { customAlert } from '@/components/ui/custom-alert';
import { useRouter } from '@/lib/router';
import { useDeletePlan, useMonthlyPlans, type SessionPlan } from '@/hooks/use-session-plans';
import { useMonthlySessions, type MonthlySession } from '@/hooks/use-monthly-sessions';
import { GymThumbnail } from '@/components/gym/gym-thumbnail';
import { SessionRow } from '@/components/session/session-row';
import {
  SESSION_CATEGORIES_BY_KEY,
  type SessionCategory,
} from '@/constants/session-category';
import { useThemeColors, useEffectiveScheme, type ThemeColors } from '@/lib/theme';

LocaleConfig.locales['ko'] = {
  monthNames: [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월',
  ],
  monthNamesShort: [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월',
  ],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

const BRAND = '#06b6d4';

// 컨디션(1~5) → 색
const CONDITION_COLOR: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#84cc16',
  5: '#22c55e',
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// hash → HSL → hex. gym_id 별 일관 색.
function gymHashHex(gymId: string): string {
  let h = 5381;
  for (let i = 0; i < gymId.length; i++) h = ((h << 5) + h + gymId.charCodeAt(i)) | 0;
  const hue = ((h % 360) + 360) % 360;
  return hslToHex(hue, 58, 55);
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) =>
    ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function shortName(name: string): string {
  // 한글: 첫 2글자, 영문: 첫 2글자 대문자
  const n = name.trim();
  if (!n) return '?';
  if (/^[A-Za-z]/.test(n)) return n.slice(0, 2).toUpperCase();
  return n.slice(0, 2);
}

export function SessionCalendar() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const isDark = useEffectiveScheme() === 'dark';

  const today = todayYMD();
  const [visibleYM, setVisibleYM] = useState<{ year: number; month: number }>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const { data, isLoading, error } = useMonthlySessions(visibleYM.year, visibleYM.month);
  const { data: plansData } = useMonthlyPlans(visibleYM.year, visibleYM.month);
  const deletePlan = useDeletePlan();

  const selectedSessions = data?.byDate[selectedDate] ?? [];
  const selectedSends = data?.sendCountsByDate[selectedDate] ?? 0;
  const selectedPlans = plansData?.byDate[selectedDate] ?? [];

  const [planSheet, setPlanSheet] = useState<{ visible: boolean; date: string }>({
    visible: false,
    date: today,
  });

  const router = useRouter();
  const handleDayPress = useCallback(
    (ds: string) => {
      setSelectedDate(ds);
      const hasRecord = (data?.byDate[ds]?.length ?? 0) > 0;
      const hasPlan = (plansData?.byDate[ds]?.length ?? 0) > 0;
      if (hasRecord || hasPlan) return;

      const dateLabel = ds.replace(/-/g, '.');
      if (ds > today) {
        // 미래 → 계획 등록
        customAlert(
          '운동 계획 등록',
          `${dateLabel}에 운동 계획을 등록할까요?`,
          [
            { text: '나중에', style: 'cancel' },
            {
              text: '등록',
              onPress: () => setPlanSheet({ visible: true, date: ds }),
            },
          ],
        );
      } else {
        // 과거 or 오늘 → 기록 추가
        customAlert(
          '기록 추가',
          `${dateLabel}에 운동 기록을 추가할까요?`,
          [
            { text: '나중에', style: 'cancel' },
            {
              text: '추가',
              onPress: () => router.push(`/session/new?date=${ds}` as never),
            },
          ],
        );
      }
    },
    [today, data, plansData, router],
  );

  function handleDeletePlan(planId: string) {
    customAlert('계획 삭제', '이 계획을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => deletePlan.mutate(planId),
      },
    ]);
  }

  // 월 요약 5지표
  const summary = useMemo(() => {
    if (!data) {
      return { sessions: 0, gyms: 0, sends: 0, sendRate: 0, durationHr: 0 };
    }
    const totalSessions = data.sessions.length;
    const gyms = new Set<string>();
    let totalSends = 0;
    let totalAttempts = 0;
    let totalMin = 0;
    for (const s of data.sessions) {
      if (s.gym) gyms.add(s.gym.id);
      totalSends += s.send_count;
      totalAttempts += s.attempt_count;
      totalMin += s.duration_min ?? 0;
    }
    const sendRate = totalAttempts > 0 ? Math.round((totalSends / totalAttempts) * 100) : 0;
    return {
      sessions: totalSessions,
      gyms: gyms.size,
      sends: totalSends,
      sendRate,
      durationHr: Math.round((totalMin / 60) * 10) / 10,
    };
  }, [data]);

  const renderDay = useCallback(
    ({ date, state }: { date?: DateData; state?: string }) => {
      if (!date) return <View style={s.dayCell} />;
      const ds = date.dateString;
      const sessionsOnDay = data?.byDate[ds] ?? [];
      const plansOnDay = plansData?.byDate[ds] ?? [];
      const isSelected = ds === selectedDate;
      const isToday = ds === today;
      const isDisabled = state === 'disabled';
      const isFuture = ds > today;
      const primarySession = sessionsOnDay[0] ?? null;
      const primaryGym = primarySession?.gym ?? null;
      const primaryCategory = primarySession?.category ?? null;
      const extraCount = sessionsOnDay.length > 1 ? sessionsOnDay.length - 1 : 0;
      const condition = data?.conditionByDate[ds];
      const condColor = condition ? CONDITION_COLOR[condition] : null;
      const primaryPlan = plansOnDay[0] ?? null;
      const planGym = primaryPlan?.gym ?? null;
      const planCategory = primaryPlan?.category ?? null;
      const hasPlan = plansOnDay.length > 0;
      const isPastPlan = hasPlan && ds < today;

      const dayNumColor = isDisabled
        ? c.text.tertiary
        : isToday
        ? BRAND
        : c.text.primary;

      return (
        <Pressable onPress={() => handleDayPress(ds)}>
          {({ pressed }) => (
          <View
            style={[
              s.dayCell,
              isSelected && s.dayCellSelected,
              pressed && { opacity: 0.7 },
            ]}
          >
          <Text style={[s.dayNum, { color: dayNumColor }, isToday && s.dayNumToday]}>
            {date.day}
          </Text>
          {primaryGym ? (
            <View style={s.gymBlockWrap}>
              <GymThumbnail
                name={primaryGym.name}
                branch={primaryGym.branch}
                size={38}
              />
              {extraCount > 0 && (
                <View style={s.extraBadge}>
                  <Text style={s.extraBadgeText}>+{extraCount}</Text>
                </View>
              )}
            </View>
          ) : primarySession && primaryCategory ? (
            // 암장 없는 세션 (근력/지구력 등)
            <View style={s.gymBlockWrap}>
              <CategoryBlock category={primaryCategory} />
            </View>
          ) : hasPlan ? (
            <View style={s.gymBlockWrap}>
              {planGym ? (
                <GymThumbnail
                  name={planGym.name}
                  branch={planGym.branch}
                  logoUrl={(planGym as { logo_url?: string | null }).logo_url ?? null}
                  logoBgHex={(planGym as { logo_bg_hex?: string | null }).logo_bg_hex ?? null}
                  size={38}
                />
              ) : planCategory ? (
                <CategoryBlock category={planCategory} />
              ) : (
                <View style={s.gymBlockEmpty}>
                  <Feather name="calendar" size={18} color={BRAND} />
                </View>
              )}
              <View style={[s.planBadge, isPastPlan && s.planBadgePast]}>
                <Feather name={isPastPlan ? 'alert-circle' : 'calendar'} size={9} color="#ffffff" />
              </View>
            </View>
          ) : (
            <View
              style={[
                s.gymBlockEmpty,
                (isToday || isFuture) && !isDisabled && s.gymBlockEmptyFuture,
              ]}
            >
              <MaterialCommunityIcons
                name="terrain"
                size={20}
                color={(isToday || isFuture) ? c.text.secondary : c.text.tertiary}
                style={{ opacity: (isToday || isFuture) ? 0.5 : 0.35 }}
              />
            </View>
          )}
          {condColor && <View style={[s.condDot, { backgroundColor: condColor }]} />}
          </View>
          )}
        </Pressable>
      );
    },
    [data, plansData, selectedDate, today, handleDayPress, c, s],
  );

  return (
    <View style={s.wrap}>
      <View style={s.calendarCard}>
        <Calendar
          key={isDark ? 'dark' : 'light'}
          current={`${visibleYM.year}-${pad2(visibleYM.month)}-01`}
          onDayPress={(d: DateData) => handleDayPress(d.dateString)}
          onMonthChange={(d: DateData) => setVisibleYM({ year: d.year, month: d.month })}
          monthFormat="yyyy년 M월"
          firstDay={0}
          enableSwipeMonths
          renderArrow={(direction) => (
            <Feather
              name={direction === 'left' ? 'chevron-left' : 'chevron-right'}
              size={20}
              color={c.text.primary}
            />
          )}
          theme={{
            backgroundColor: c.bg.card,
            calendarBackground: c.bg.card,
            textSectionTitleColor: c.text.muted,
            monthTextColor: c.text.primary,
            arrowColor: c.text.primary,
            textMonthFontWeight: '800',
            textMonthFontSize: 16,
            textDayHeaderFontWeight: '700',
            textDayHeaderFontSize: 11,
          }}
          dayComponent={renderDay}
          style={s.calendar}
        />

        {/* 월 요약 5지표 */}
        <View style={s.summaryStrip}>
          <SummaryStat label="기록" value={String(summary.sessions)} />
          <SummaryStatDivider />
          <SummaryStat label="장소" value={String(summary.gyms)} />
          <SummaryStatDivider />
          <SummaryStat label="완등" value={String(summary.sends)} />
          <SummaryStatDivider />
          <SummaryStat label="완등률" value={`${summary.sendRate}%`} />
          <SummaryStatDivider />
          <SummaryStat label="운동" value={`${summary.durationHr}H`} />
        </View>
      </View>

      {/* Selected-day summary + sessions */}
      <View style={s.selectedHeader}>
        <Text style={s.selectedHeaderDate}>{formatLongDate(selectedDate)}</Text>
        {selectedSessions.length > 0 ? (
          <Text style={s.selectedHeaderMeta}>
            세션 {selectedSessions.length}개 · 완등 {selectedSends}
          </Text>
        ) : selectedPlans.length > 0 ? (
          <Text style={s.selectedHeaderMeta}>계획 {selectedPlans.length}개</Text>
        ) : null}
      </View>

      {isLoading ? (
        <View style={s.loader}>
          <ActivityIndicator color={BRAND} />
        </View>
      ) : error ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error.message}</Text>
        </View>
      ) : selectedSessions.length === 0 && selectedPlans.length === 0 ? (
        <View style={s.emptyBox}>
          <Text style={s.emptyText}>
            {selectedDate > today ? '이 날 운동 계획을 등록해보세요' : '이 날엔 기록이 없어요'}
          </Text>
          {selectedDate > today && (
            <Pressable
              onPress={() => setPlanSheet({ visible: true, date: selectedDate })}
            >
              {({ pressed }) => (
                <View style={[s.planAddBtn, pressed && { opacity: 0.8 }]}>
                  <Feather name="calendar" size={14} color="#ffffff" />
                  <Text style={s.planAddBtnText}>계획 등록</Text>
                </View>
              )}
            </Pressable>
          )}
        </View>
      ) : (
        <View style={s.sessions}>
          {selectedPlans.map((p) => (
            <PlanRow key={p.id} plan={p} c={c} onDelete={() => handleDeletePlan(p.id)} />
          ))}
          {selectedSessions.map((sess: MonthlySession) => (
            <SessionRow key={sess.id} session={sess} />
          ))}
        </View>
      )}

      <PlanSheet
        visible={planSheet.visible}
        plannedDate={planSheet.date}
        onClose={() => setPlanSheet((p) => ({ ...p, visible: false }))}
      />
    </View>
  );
}

// 암장 없는 세션/계획용 카테고리 블록 — 38×38 카드에 카테고리 아이콘
function CategoryBlock({ category }: { category: SessionCategory }) {
  const meta = SESSION_CATEGORIES_BY_KEY[category];
  if (!meta) return null;
  return (
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: meta.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name={meta.cellIcon} size={22} color={meta.fg} />
    </View>
  );
}

function PlanRow({
  plan,
  c,
  onDelete,
}: {
  plan: SessionPlan;
  c: ThemeColors;
  onDelete: () => void;
}) {
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const isPast = plan.planned_date < todayYMD();
  const gymLabel = plan.gym
    ? `${plan.gym.name}${plan.gym.branch ? ` ${plan.gym.branch}` : ''}`
    : '계획';

  function handleRecord() {
    const qs = plan.gym?.id
      ? `?date=${plan.planned_date}&gymId=${plan.gym.id}`
      : `?date=${plan.planned_date}`;
    router.push(`/session/new${qs}` as never);
  }

  return (
    <View style={[s.planRow, isPast && s.planRowPast]}>
      <View style={[s.planIcon, isPast && s.planIconPast]}>
        <Feather name="calendar" size={14} color={isPast ? '#f97316' : BRAND} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.planRowTitle}>{gymLabel}</Text>
        <Text style={s.planRowMeta}>
          {plan.planned_time ? `${plan.planned_time.slice(0, 5)} · ` : ''}
          {isPast ? '다녀오셨나요?' : (plan.notes ?? '계획됨')}
        </Text>
      </View>
      {isPast ? (
        <View style={s.planPastActions}>
          <Pressable onPress={handleRecord} hitSlop={4}>
            {({ pressed }) => (
              <View style={[s.planRecordBtn, pressed && { opacity: 0.75 }]}>
                <Feather name="edit-3" size={12} color="#ffffff" />
                <Text style={s.planRecordBtnText}>기록</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={4}>
            {({ pressed }) => (
              <View style={[s.planMissBtn, pressed && { opacity: 0.75 }]}>
                <Text style={s.planMissBtnText}>못 갔어요</Text>
              </View>
            )}
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={onDelete} hitSlop={8}>
          <Feather name="x" size={16} color={c.text.muted} />
        </Pressable>
      )}
    </View>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={s.summaryCol}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryVal}>{value}</Text>
    </View>
  );
}

function SummaryStatDivider() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return <View style={s.summaryDivider} />;
}

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatLongDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const w = KO_WEEKDAYS[d.getDay()];
  return `${y}.${m}.${day} (${w})`;
}

const CELL_HEIGHT = 64;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  calendarCard: {
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 18,
    backgroundColor: c.bg.card,
    overflow: 'hidden',
  },
  calendar: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  // Custom day cell
  dayCell: {
    width: '100%',
    minHeight: CELL_HEIGHT,
    alignItems: 'center',
    paddingTop: 4,
    gap: 3,
    borderRadius: 10,
    paddingHorizontal: 1,
  },
  dayCellSelected: {
    backgroundColor: c.bg.accent,
  },
  // dayCellFuture / dayCellPlan 제거 — 셀 자체 bg 없음. 시각 차별화는 안의 아이콘/썸네일이 담당.
  dayNum: {
    fontSize: 11,
    fontWeight: '700',
  },
  dayNumToday: {
    fontWeight: '900',
  },
  gymBlockWrap: {
    position: 'relative',
  },
  gymBlockEmpty: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: c.bg.primary,
    opacity: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymBlockEmptyFuture: {
    backgroundColor: c.border.subtle,
    opacity: 1,
  },
  extraBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: c.text.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: c.bg.card,
  },
  extraBadgeText: {
    color: c.bg.primary,
    fontSize: 8,
    fontWeight: '800',
  },
  condDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 1,
  },

  // Summary strip (5 metrics)
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderColor: c.border.subtle,
    backgroundColor: c.bg.subtle,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: c.border.subtle,
    alignSelf: 'center',
    height: 24,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: c.text.muted,
  },
  summaryVal: {
    fontSize: 15,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.3,
  },

  // Selected day list
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  selectedHeaderDate: {
    fontSize: 15,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.3,
  },
  selectedHeaderMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text.tertiary,
  },
  loader: { paddingVertical: 16, alignItems: 'center' },
  errorBox: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: c.status.dangerBg,
    borderWidth: 1,
    borderColor: c.status.danger,
  },
  errorText: { color: c.status.danger, fontSize: 13, fontWeight: '600' },
  emptyBox: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border.subtle,
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.bg.card,
  },
  emptyText: { fontSize: 13, color: c.text.tertiary, fontWeight: '600' },
  sessions: { gap: 8 },

  // 캘린더 셀의 계획 뱃지 (썸네일 위에 작게)
  planBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: BRAND,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: c.bg.card,
  },

  // 빈 상태에서 '계획 등록' 버튼
  planAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  planAddBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },

  // 선택일 list의 계획 row
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BRAND,
    backgroundColor: c.bg.accent,
  },
  planIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.2,
  },
  planRowMeta: {
    fontSize: 11,
    color: c.text.secondary,
    fontWeight: '600',
    marginTop: 1,
  },

  // 지난 계획 row 변형
  planRowPast: {
    borderColor: '#f97316',
    backgroundColor: c.bg.card,
  },
  planIconPast: {
    backgroundColor: '#fff7ed',
  },
  planPastActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  planRecordBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  planMissBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border.subtle,
  },
  planMissBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text.secondary,
  },

  // 지난 계획 캘린더 뱃지 (주황)
  planBadgePast: {
    backgroundColor: '#f97316',
  },
  });
}