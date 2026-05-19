import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GRID_COLORS, type GridColor } from '@/components/climb/color-grid';
import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import { useGyms, type GymListItem } from '@/hooks/use-gyms';
import { useRecentGyms } from '@/hooks/use-recent-gyms';
import { useRecordSession, type ColorCount } from '@/hooks/use-record-session';

// ── 날짜 칩 헬퍼 ────────────────────────────────────────────
type DateChoice = 'today' | 'yesterday' | 'day_before';
const DATE_CHIPS: { value: DateChoice; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: 'yesterday', label: '어제' },
  { value: 'day_before', label: '그저께' },
];

function isoDateForChoice(choice: DateChoice): string {
  const d = new Date();
  if (choice === 'yesterday') d.setDate(d.getDate() - 1);
  if (choice === 'day_before') d.setDate(d.getDate() - 2);
  return d.toISOString().slice(0, 10);
}

// ── 운동 시간 칩 ────────────────────────────────────────────
const DURATION_CHIPS: { value: number | null; label: string }[] = [
  { value: 30, label: '30분' },
  { value: 60, label: '1시간' },
  { value: 90, label: '1.5시간' },
  { value: 120, label: '2시간' },
  { value: 150, label: '2.5시간' },
  { value: 180, label: '3시간+' },
];

// ── 컨디션 이모지 ───────────────────────────────────────────
const CONDITION_OPTIONS: { value: number; emoji: string }[] = [
  { value: 1, emoji: '😵' },
  { value: 2, emoji: '😟' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' },
  { value: 5, emoji: '😄' },
];

// ── 메인 화면 ──────────────────────────────────────────────
export default function NewSessionScreen() {
  const router = useRouter();
  const recordSession = useRecordSession();

  const [dateChoice, setDateChoice] = useState<DateChoice>('today');
  const [gymId, setGymId] = useState<string | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [condition, setCondition] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [colorCounts, setColorCounts] = useState<Record<GridColor, ColorCount>>(() =>
    Object.fromEntries(
      GRID_COLORS.map((c) => [c, { color: c, tries: 0, sends: 0 }]),
    ) as Record<GridColor, ColorCount>,
  );

  const { data: recentGyms } = useRecentGyms();
  const { data: allGyms } = useGyms();
  const selectedGym = useMemo(
    () => allGyms?.find((g) => g.id === gymId) ?? null,
    [allGyms, gymId],
  );

  const canSubmit = useMemo(() => {
    if (!gymId) return false;
    return Object.values(colorCounts).some((c) => c.tries > 0);
  }, [gymId, colorCounts]);

  function bumpTries(color: GridColor, delta: number) {
    setColorCounts((prev) => {
      const cur = prev[color];
      const nextTries = Math.max(0, cur.tries + delta);
      // 시도가 완등 아래로 내려가면 완등도 같이 깎임
      const nextSends = Math.min(cur.sends, nextTries);
      return { ...prev, [color]: { ...cur, tries: nextTries, sends: nextSends } };
    });
  }

  function bumpSends(color: GridColor, delta: number) {
    setColorCounts((prev) => {
      const cur = prev[color];
      const nextSends = Math.max(0, cur.sends + delta);
      // 완등이 시도를 넘으면 시도도 같이 올림 (편의)
      const nextTries = Math.max(cur.tries, nextSends);
      return { ...prev, [color]: { ...cur, sends: nextSends, tries: nextTries } };
    });
  }

  async function handleSubmit() {
    if (!gymId || recordSession.isPending) return;
    try {
      await recordSession.mutateAsync({
        gymId,
        sessionDate: isoDateForChoice(dateChoice),
        durationMin,
        condition,
        notes: notes.trim() ? notes.trim().slice(0, 100) : null,
        colors: Object.values(colorCounts),
      });
      router.replace('/(tabs)/log');
    } catch (e) {
      Alert.alert('기록 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-2 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2" hitSlop={8}>
          <Text className="text-text-primary text-2xl">←</Text>
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold">
          오늘 운동 기록
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
        {/* 1. 날짜 */}
        <Section title="날짜" required>
          <View className="flex-row gap-2">
            {DATE_CHIPS.map(({ value, label }) => (
              <Chip
                key={value}
                label={label}
                selected={dateChoice === value}
                onPress={() => setDateChoice(value)}
              />
            ))}
            <Chip
              label="더 이전"
              selected={false}
              onPress={() =>
                Alert.alert(
                  '준비 중',
                  '그저께 이전 날짜 선택은 v1.1에서 추가됩니다.',
                )
              }
            />
          </View>
        </Section>

        {/* 2. 암장 */}
        <Section title="암장" required>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="🔍 장소 검색"
              selected={false}
              onPress={() => setShowGymModal(true)}
            />
            {(recentGyms ?? []).map((g) => (
              <Chip
                key={g.id}
                label={`${g.name}${g.branch ? ` ${g.branch}` : ''}`}
                selected={gymId === g.id}
                onPress={() => setGymId(g.id)}
              />
            ))}
          </View>
          {selectedGym && (
            <View className="mt-2 px-3 py-2 rounded-md bg-background-secondary">
              <Text className="text-text-primary text-sm">
                선택: {selectedGym.name}
                {selectedGym.branch ? ` ${selectedGym.branch}` : ''}
                {selectedGym.city ? ` · ${selectedGym.city}` : ''}
              </Text>
            </View>
          )}
        </Section>

        {/* 3. 운동 시간 */}
        <Section title="운동 시간">
          <View className="flex-row flex-wrap gap-2">
            {DURATION_CHIPS.map(({ value, label }) => (
              <Chip
                key={label}
                label={label}
                selected={durationMin === value}
                onPress={() => setDurationMin(durationMin === value ? null : value)}
              />
            ))}
          </View>
        </Section>

        {/* 4. 컨디션 */}
        <Section title="컨디션">
          <View className="flex-row gap-2 justify-between">
            {CONDITION_OPTIONS.map(({ value, emoji }) => {
              const active = condition === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setCondition(active ? null : value)}
                  className={`flex-1 items-center py-3 rounded-md border ${
                    active
                      ? 'border-brand-primary bg-background-secondary'
                      : 'border-border-subtle'
                  }`}
                >
                  <Text className="text-2xl">{emoji}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* 5. 색깔별 기록 */}
        <Section title="색깔별 기록">
          <Text className="text-text-tertiary text-xs mb-2">안 적어도 돼요 (옵션)</Text>
          <View className="gap-2">
            {/* 헤더 */}
            <View className="flex-row items-center gap-3 px-1">
              <View style={{ width: 64 }} />
              <Text className="flex-1 text-text-tertiary text-xs text-center">완등</Text>
              <Text className="flex-1 text-text-tertiary text-xs text-center">시도</Text>
            </View>
            {GRID_COLORS.map((color) => (
              <ColorCountRow
                key={color}
                color={color}
                value={colorCounts[color]}
                onBumpSends={(delta) => bumpSends(color, delta)}
                onBumpTries={(delta) => bumpTries(color, delta)}
              />
            ))}
          </View>
        </Section>

        {/* 6. 메모 */}
        <Section title="메모">
          <TextInput
            placeholder="한 줄 메모 (최대 100자)"
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={(t) => setNotes(t.slice(0, 100))}
            maxLength={100}
            className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
          />
        </Section>
      </ScrollView>

      {/* Sticky 기록 버튼 */}
      <View className="px-4 pt-2 pb-2 border-t border-border-subtle">
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit || recordSession.isPending}
          className={`rounded-md p-4 items-center ${
            !canSubmit ? 'bg-background-tertiary' : 'bg-brand-primary'
          }`}
        >
          {recordSession.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text
              className={`font-semibold ${
                !canSubmit ? 'text-text-muted' : 'text-background-primary'
              }`}
            >
              기록
            </Text>
          )}
        </Pressable>
      </View>

      {/* 암장 검색 모달 */}
      <GymPickerModal
        visible={showGymModal}
        gyms={allGyms ?? []}
        selectedId={gymId}
        onSelect={(id) => {
          setGymId(id);
          setShowGymModal(false);
        }}
        onClose={() => setShowGymModal(false)}
      />
    </SafeAreaView>
  );
}

// ── 보조 컴포넌트 ───────────────────────────────────────────

function Section({
  title,
  required,
  children,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <Text className="text-text-secondary text-sm font-medium">
        {title}
        {required && <Text className="text-status-danger"> *</Text>}
      </Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-2 rounded-full border ${
        selected
          ? 'border-brand-primary bg-brand-primary'
          : 'border-border-default bg-background-primary'
      }`}
    >
      <Text
        className={`text-sm ${
          selected ? 'text-background-primary font-medium' : 'text-text-primary'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ColorCountRow({
  color,
  value,
  onBumpSends,
  onBumpTries,
}: {
  color: GridColor;
  value: ColorCount;
  onBumpSends: (delta: number) => void;
  onBumpTries: (delta: number) => void;
}) {
  const hex = resolveColorHex(color);
  const label = resolveColorLabel(color);
  const needsBorder = color === 'white' || color === 'yellow';
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-row items-center gap-2" style={{ width: 64 }}>
        <View
          className="w-6 h-6 rounded-full"
          style={{
            backgroundColor: hex,
            ...(needsBorder ? { borderWidth: 1, borderColor: '#D4D4D8' } : null),
          }}
        />
        <Text className="text-text-primary text-sm">{label}</Text>
      </View>
      <Counter value={value.sends} onChange={onBumpSends} />
      <Counter value={value.tries} onChange={onBumpTries} />
    </View>
  );
}

function Counter({
  value,
  onChange,
}: {
  value: number;
  onChange: (delta: number) => void;
}) {
  return (
    <View className="flex-1 flex-row items-center justify-center gap-1.5">
      <Pressable
        onPress={() => onChange(-1)}
        disabled={value === 0}
        className={`w-8 h-8 rounded-full items-center justify-center ${
          value === 0 ? 'bg-background-tertiary' : 'bg-background-secondary'
        }`}
        hitSlop={4}
      >
        <Text
          className={`text-base ${
            value === 0 ? 'text-text-muted' : 'text-text-primary'
          }`}
        >
          −
        </Text>
      </Pressable>
      <Text className="text-text-primary text-base font-medium min-w-[20px] text-center">
        {value}
      </Text>
      <Pressable
        onPress={() => onChange(1)}
        className="w-8 h-8 rounded-full bg-brand-primary items-center justify-center"
        hitSlop={4}
      >
        <Text className="text-background-primary text-base">+</Text>
      </Pressable>
    </View>
  );
}

function GymPickerModal({
  visible,
  gyms,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  gyms: GymListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return gyms;
    return gyms.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.branch ?? '').toLowerCase().includes(q) ||
        g.city.toLowerCase().includes(q),
    );
  }, [gyms, query]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
        <View className="flex-row items-center px-2 py-2 border-b border-border-subtle">
          <Pressable onPress={onClose} className="p-2" hitSlop={8}>
            <Text className="text-text-primary text-2xl">×</Text>
          </Pressable>
          <Text className="flex-1 text-center text-text-primary text-base font-semibold">
            암장 선택
          </Text>
          <View className="w-10" />
        </View>
        <View className="px-4 pt-3 pb-2">
          <TextInput
            placeholder="이름·지점·지역 검색"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item.id)}
              className={`flex-row items-center justify-between px-4 py-3 border-b border-border-subtle ${
                item.id === selectedId ? 'bg-background-secondary' : ''
              }`}
            >
              <View>
                <View className="flex-row items-baseline gap-2">
                  <Text className="text-text-primary text-base font-medium">
                    {item.name}
                  </Text>
                  {item.branch && (
                    <Text className="text-text-secondary text-sm">{item.branch}</Text>
                  )}
                </View>
                <Text className="text-text-tertiary text-xs">
                  {[item.city, item.district].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {item.id === selectedId && (
                <Text className="text-brand-primary text-lg">●</Text>
              )}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}
