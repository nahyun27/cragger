import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, LocaleConfig, type DateData } from 'react-native-calendars';
import { Feather } from '@expo/vector-icons';

import { useMonthlySessions, type MonthlySession } from '@/hooks/use-monthly-sessions';
import { GymThumbnail } from '@/components/gym/gym-thumbnail';
import { SessionRow } from '@/components/session/session-row';

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
  const today = todayYMD();
  const [visibleYM, setVisibleYM] = useState<{ year: number; month: number }>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const { data, isLoading, error } = useMonthlySessions(visibleYM.year, visibleYM.month);

  const selectedSessions = data?.byDate[selectedDate] ?? [];
  const selectedSends = data?.sendCountsByDate[selectedDate] ?? 0;

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
      const isSelected = ds === selectedDate;
      const isToday = ds === today;
      const isDisabled = state === 'disabled';
      const primaryGym = sessionsOnDay[0]?.gym ?? null;
      const extraCount = sessionsOnDay.length > 1 ? sessionsOnDay.length - 1 : 0;
      const condition = data?.conditionByDate[ds];
      const condColor = condition ? CONDITION_COLOR[condition] : null;

      const dayNumColor = isDisabled
        ? '#cbd5e1'
        : isToday
        ? BRAND
        : '#475569';

      return (
        <Pressable
          onPress={() => setSelectedDate(ds)}
          style={({ pressed }) => [
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
          ) : (
            <View style={s.gymBlockEmpty} />
          )}
          {condColor && <View style={[s.condDot, { backgroundColor: condColor }]} />}
        </Pressable>
      );
    },
    [data, selectedDate, today],
  );

  return (
    <View style={s.wrap}>
      <View style={s.calendarCard}>
        <Calendar
          current={`${visibleYM.year}-${pad2(visibleYM.month)}-01`}
          onDayPress={(d: DateData) => setSelectedDate(d.dateString)}
          onMonthChange={(d: DateData) => setVisibleYM({ year: d.year, month: d.month })}
          monthFormat="yyyy년 M월"
          firstDay={0}
          enableSwipeMonths
          renderArrow={(direction) => (
            <Feather
              name={direction === 'left' ? 'chevron-left' : 'chevron-right'}
              size={20}
              color="#0f172a"
            />
          )}
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            textSectionTitleColor: '#94a3b8',
            monthTextColor: '#0f172a',
            arrowColor: '#0f172a',
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
      ) : selectedSessions.length === 0 ? (
        <View style={s.emptyBox}>
          <Text style={s.emptyText}>이 날엔 기록이 없어요</Text>
        </View>
      ) : (
        <View style={s.sessions}>
          {selectedSessions.map((sess: MonthlySession) => (
            <SessionRow key={sess.id} session={sess} />
          ))}
        </View>
      )}
    </View>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.summaryCol}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryVal}>{value}</Text>
    </View>
  );
}

function SummaryStatDivider() {
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

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  calendarCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ecfeff',
  },
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
    backgroundColor: '#f8fafc',
    opacity: 0.5,
  },
  extraBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#0f172a',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  extraBadgeText: {
    color: '#ffffff',
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
    borderColor: '#f1f5f9',
    backgroundColor: '#fafbfc',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    height: 24,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  summaryVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
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
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  selectedHeaderMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  loader: { paddingVertical: 16, alignItems: 'center' },
  errorBox: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  emptyBox: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  emptyText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  sessions: { gap: 8 },
});
