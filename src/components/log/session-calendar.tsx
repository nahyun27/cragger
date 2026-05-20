import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Calendar, LocaleConfig, type DateData } from 'react-native-calendars';
import { Feather } from '@expo/vector-icons';

import { useMonthlySessions } from '@/hooks/use-monthly-sessions';
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

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const BRAND = '#06b6d4';

export function SessionCalendar() {
  const today = todayYMD();
  // Visible month — controls which monthly query is fetched.
  const [visibleYM, setVisibleYM] = useState<{ year: number; month: number }>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const { data, isLoading, error } = useMonthlySessions(visibleYM.year, visibleYM.month);

  const markedDates = useMemo(() => {
    const marks: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }> = {};
    if (data) {
      for (const date of Object.keys(data.byDate)) {
        marks[date] = { marked: true, dotColor: BRAND };
      }
    }
    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      selectedColor: BRAND,
    };
    return marks;
  }, [data, selectedDate]);

  const selectedSessions = data?.byDate[selectedDate] ?? [];
  const selectedSends = data?.sendCountsByDate[selectedDate] ?? 0;

  return (
    <View style={s.wrap}>
      <Calendar
        current={`${visibleYM.year}-${pad2(visibleYM.month)}-01`}
        onDayPress={(d: DateData) => setSelectedDate(d.dateString)}
        onMonthChange={(d: DateData) => setVisibleYM({ year: d.year, month: d.month })}
        markedDates={markedDates}
        monthFormat="yyyy년 M월"
        firstDay={1} // Monday-start
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
          textSectionTitleColor: '#64748b',
          dayTextColor: '#0f172a',
          textDisabledColor: '#cbd5e1',
          monthTextColor: '#0f172a',
          todayTextColor: BRAND,
          selectedDayBackgroundColor: BRAND,
          selectedDayTextColor: '#ffffff',
          dotColor: BRAND,
          selectedDotColor: '#ffffff',
          textDayFontWeight: '600',
          textMonthFontWeight: '800',
          textDayHeaderFontWeight: '700',
          textDayFontSize: 13,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 11,
          arrowColor: '#0f172a',
        }}
        style={s.calendar}
      />

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
          {selectedSessions.map((sess) => (
            <SessionRow key={sess.id} session={sess} />
          ))}
        </View>
      )}
    </View>
  );
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

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  calendar: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    paddingVertical: 8,
  },
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
