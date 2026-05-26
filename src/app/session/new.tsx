import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { GRID_COLORS, type GridColor } from '@/components/climb/color-grid';
import { LeadEntry, type LeadRoute } from '@/components/climb/lead-entry';
import {
  ColorCountsTable,
  emptyColorCounts,
  type ColorCountsValue,
} from '@/components/session/color-counts-table';
import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { Chip } from '@/components/ui/chip';
import { Section } from '@/components/ui/section';
import { useGyms } from '@/hooks/use-gyms';
import { useGymRegisteredColors } from '@/hooks/use-gym-registered-colors';
import { useRecentColorActivity } from '@/hooks/use-recent-color-activity';
import { useRecentGyms } from '@/hooks/use-recent-gyms';
import { useRecordSession, type ClimbingDiscipline } from '@/hooks/use-record-session';

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

const DURATION_CHIPS: { value: number; label: string }[] = [
  { value: 30, label: '30분' },
  { value: 60, label: '1시간' },
  { value: 90, label: '1.5시간' },
  { value: 120, label: '2시간' },
  { value: 150, label: '2.5시간' },
  { value: 180, label: '3시간+' },
];

const CONDITION_OPTIONS: { value: number; icon: 'frown' | 'meh' | 'smile'; color: string; label: string }[] = [
  { value: 1, icon: 'frown', color: '#ef4444', label: '최악' },
  { value: 2, icon: 'frown', color: '#f97316', label: '안좋음' },
  { value: 3, icon: 'meh', color: '#64748b', label: '보통' },
  { value: 4, icon: 'smile', color: '#84cc16', label: '좋음' },
  { value: 5, icon: 'smile', color: '#06b6d4', label: '최상' },
];

function DisciplineBtn({
  label,
  icon,
  active,
  disabled,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: active ? '#06b6d4' : '#e2e8f0',
        backgroundColor: active ? '#ecfeff' : '#ffffff',
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      <Feather
        name={icon}
        size={16}
        color={active ? '#06b6d4' : '#64748b'}
      />
      <Text
        style={{
          fontSize: 11,
          fontWeight: '800',
          color: active ? '#0e7490' : '#64748b',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function NewSessionScreen() {
  const router = useRouter();
  const recordSession = useRecordSession();

  const [dateChoice, setDateChoice] = useState<DateChoice>('today');
  const [gymId, setGymId] = useState<string | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [condition, setCondition] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [discipline, setDiscipline] = useState<ClimbingDiscipline>('boulder');
  const [colorCounts, setColorCounts] = useState<ColorCountsValue>(emptyColorCounts);
  const [leadRoutes, setLeadRoutes] = useState<LeadRoute[]>([]);

  const { data: recentGyms } = useRecentGyms();
  const { data: recentColors } = useRecentColorActivity(gymId);
  const { data: registeredColors } = useGymRegisteredColors(gymId);
  // primary = 그 암장에 등록된 색깔 (recent activity desc). secondary = 나머지.
  // 등록 정보 없으면 primary=전체 14색 (이전과 동일 동작).
  const { colorOrder, primaryCount } = useMemo<{
    colorOrder: readonly GridColor[];
    primaryCount: number;
  }>(() => {
    // 등록된 색깔이 GRID_COLORS와 교집합
    const registered = new Set(
      (registeredColors ?? []).filter((c) =>
        (GRID_COLORS as readonly string[]).includes(c),
      ),
    );
    // 최근 활동순으로 head 만들기 (전체 컬러)
    const seen = new Set<string>();
    const orderHead: GridColor[] = [];
    for (const c of recentColors ?? []) {
      if ((GRID_COLORS as readonly string[]).includes(c) && !seen.has(c)) {
        orderHead.push(c as GridColor);
        seen.add(c);
      }
    }
    const orderTail = GRID_COLORS.filter((c) => !seen.has(c));
    const order: GridColor[] = [...orderHead, ...orderTail];

    if (registered.size === 0) {
      return { colorOrder: order, primaryCount: order.length };
    }
    // 등록된 색깔이 앞으로 오게 재정렬 (등록 색깔끼리는 위 order 순서 유지)
    const primary = order.filter((c) => registered.has(c));
    const secondary = order.filter((c) => !registered.has(c));
    return {
      colorOrder: [...primary, ...secondary],
      primaryCount: primary.length,
    };
  }, [recentColors, registeredColors]);
  const { data: allGyms } = useGyms();
  const selectedGym = useMemo(
    () => allGyms?.find((g) => g.id === gymId) ?? null,
    [allGyms, gymId],
  );

  const canSubmit = useMemo(() => {
    if (!gymId) return false;
    if (discipline === 'boulder') {
      return Object.values(colorCounts).some((c) => c.tries > 0);
    }
    return leadRoutes.length > 0;
  }, [gymId, discipline, colorCounts, leadRoutes]);

  async function handleSubmit() {
    if (!gymId || recordSession.isPending) return;
    try {
      await recordSession.mutateAsync({
        gymId,
        sessionDate: isoDateForChoice(dateChoice),
        durationMin,
        condition,
        notes: notes.trim() ? notes.trim().slice(0, 100) : null,
        discipline,
        colors: discipline === 'boulder' ? Object.values(colorCounts) : undefined,
        leadRoutes: discipline === 'lead' ? leadRoutes : undefined,
      });
      router.replace('/(tabs)/log');
    } catch (e) {
      Alert.alert('기록 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold mr-6">
          오늘 운동 기록
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
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
                Alert.alert('준비 중', '그저께 이전 날짜 선택은 v1.1에서 추가됩니다.')
              }
            />
          </View>
        </Section>

        <Section title="암장" required>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="장소 검색"
              icon={<Feather name="search" size={14} color="#64748b" />}
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

        <Section title="컨디션">
          <View className="flex-row gap-2 justify-between">
            {CONDITION_OPTIONS.map(({ value, icon, color, label }) => {
              const active = condition === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setCondition(active ? null : value)}
                  className={`flex-1 items-center py-2.5 rounded-2xl border gap-1 ${
                    active
                      ? 'border-brand-primary bg-brand-primary/5'
                      : 'border-border-subtle bg-background-primary'
                  }`}
                >
                  <Feather
                    name={icon}
                    size={20}
                    color={active ? color : '#94a3b8'}
                  />
                  <Text
                    className={`text-[10px] ${
                      active ? 'text-brand-primary font-bold' : 'text-text-tertiary'
                    }`}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="종목" required>
          <View className="flex-row gap-2">
            <DisciplineBtn
              label="볼더링"
              icon="square"
              active={discipline === 'boulder'}
              onPress={() => setDiscipline('boulder')}
            />
            <DisciplineBtn
              label="리드"
              icon="trending-up"
              active={discipline === 'lead'}
              onPress={() => setDiscipline('lead')}
            />
            <DisciplineBtn
              label="보드"
              icon="grid"
              active={false}
              disabled
              onPress={() => Alert.alert('준비 중', '보드 기록은 v1.1에서 추가됩니다.')}
            />
            <DisciplineBtn
              label="지구력"
              icon="activity"
              active={false}
              disabled
              onPress={() => Alert.alert('준비 중', '지구력 기록은 v1.1에서 추가됩니다.')}
            />
          </View>
        </Section>

        {discipline === 'boulder' ? (
          <Section title="색깔별 기록">
            <Text className="text-text-tertiary text-xs mb-2">안 적어도 돼요 (옵션)</Text>
            <ColorCountsTable
              value={colorCounts}
              onChange={setColorCounts}
              colors={colorOrder}
              primaryCount={primaryCount}
            />
          </Section>
        ) : (
          <Section title="루트 기록" required>
            <LeadEntry value={leadRoutes} onChange={setLeadRoutes} />
          </Section>
        )}

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
