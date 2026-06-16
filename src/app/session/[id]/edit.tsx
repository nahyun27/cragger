import { customAlert } from '@/components/ui/custom-alert';
import { useLocalSearchParams, useRouter } from '@/lib/router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { GRID_COLORS, type GridColor } from '@/components/climb/color-grid';
import { LeadEntry, type LeadRoute } from '@/components/climb/lead-entry';
import {
  ColorCountsTable,
  emptyColorCounts,
  type ColorCountsValue,
} from '@/components/session/color-counts-table';
import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { MembershipPicker } from '@/components/session/membership-picker';
import { Chip } from '@/components/ui/chip';
import { Section } from '@/components/ui/section';
import { FormInput } from '@/components/ui/form';
import { BottomCTA } from '@/components/ui/bottom-cta';
import { useGyms } from '@/hooks/use-gyms';
import { useGymRegisteredColors } from '@/hooks/use-gym-registered-colors';
import { useGymColorSchemes } from '@/hooks/use-spray-wall';
import { useRecentColorActivity } from '@/hooks/use-recent-color-activity';
import { useRecentGyms } from '@/hooks/use-recent-gyms';
import { useSessionDetail, useUpdateSession } from '@/hooks/use-session';
import { useThemeColors } from '@/lib/theme';

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatLongDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const w = KO_WEEKDAYS[d.getDay()];
  return `${y}.${m}.${day} (${w})`;
}

const DURATION_CHIPS: { value: number; label: string }[] = [
  { value: 30, label: '30분' },
  { value: 60, label: '1시간' },
  { value: 90, label: '1.5시간' },
  { value: 120, label: '2시간' },
  { value: 150, label: '2.5시간' },
  { value: 180, label: '3시간+' },
];

const CONDITION_OPTIONS: { value: number; icon: any; color: string; label: string }[] = [
  { value: 1, icon: 'emoticon-dead-outline', color: '#ef4444', label: '최악' },
  { value: 2, icon: 'emoticon-sad-outline', color: '#f97316', label: '안좋음' },
  { value: 3, icon: 'emoticon-neutral-outline', color: '#eab308', label: '보통' },
  { value: 4, icon: 'emoticon-happy-outline', color: '#84cc16', label: '좋음' },
  { value: 5, icon: 'emoticon-excited-outline', color: '#06b6d4', label: '최상' },
];

export default function EditSessionScreen() {

  const c = useThemeColors();  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error } = useSessionDetail(id);
  const updateSession = useUpdateSession();
  const { data: recentGyms } = useRecentGyms();
  const { data: allGyms } = useGyms();

  const [gymId, setGymId] = useState<string | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [condition, setCondition] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [colorCounts, setColorCounts] = useState<ColorCountsValue>(emptyColorCounts);
  const [leadRoutes, setLeadRoutes] = useState<LeadRoute[]>([]);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const { data: recentColors } = useRecentColorActivity(gymId);
  const gymColorSchemesQ = useGymColorSchemes(gymId ?? undefined);
  const gymColorSchemes = gymColorSchemesQ.data ?? [];

  const { colorOrder, primaryCount } = useMemo<{
    colorOrder: readonly GridColor[];
    primaryCount: number;
  }>(() => {
    const schemeColors = gymColorSchemes
      .map((cs) => cs.color)
      .filter((c) => (GRID_COLORS as readonly string[]).includes(c)) as GridColor[];

    if (schemeColors.length > 0) {
      const schemeSet = new Set(schemeColors);
      const rest = GRID_COLORS.filter((c) => !schemeSet.has(c)) as GridColor[];
      return { colorOrder: [...schemeColors, ...rest], primaryCount: schemeColors.length };
    }

    // fallback: 최근 사용 색깔 먼저
    const seen = new Set<string>();
    const head: GridColor[] = [];
    for (const c of recentColors ?? []) {
      if ((GRID_COLORS as readonly string[]).includes(c) && !seen.has(c)) {
        head.push(c as GridColor);
        seen.add(c);
      }
    }
    const tail = GRID_COLORS.filter((c) => !seen.has(c)) as GridColor[];
    return { colorOrder: [...head, ...tail], primaryCount: head.length };
  }, [gymColorSchemes, recentColors]);

  const isLeadSession = data?.discipline === 'lead';
  const isSprayWallSession = (data?.spray_wall_summary?.length ?? 0) > 0 && data?.discipline !== 'lead';

  // 첫 fetch 완료 시 한 번만 prefill — 이후 사용자 편집 보존
  useEffect(() => {
    if (prefilled || !data) return;
    setGymId(data.gym_id);
    setDurationMin(data.duration_min);
    setCondition(data.condition);
    setNotes(data.notes ?? '');
    setMembershipId(data.membership_id);
    // boulder 색깔 prefill
    const next = emptyColorCounts();
    for (const s of data.color_summary) {
      if ((GRID_COLORS as readonly string[]).includes(s.color)) {
        next[s.color as GridColor] = {
          color: s.color as GridColor,
          tries: s.tries,
          sends: s.sends,
        };
      }
    }
    setColorCounts(next);
    // lead route prefill — breakdown 집계 → 개별 row 복원 (id 는 임시)
    const routes: LeadRoute[] = [];
    let counter = 0;
    for (const ls of data.lead_summary) {
      const b = ls.breakdown;
      for (let k = 0; k < b.onsight; k++) routes.push({ id: `e-${counter++}`, grade: ls.grade, result: 'onsight' });
      for (let k = 0; k < b.flash; k++) routes.push({ id: `e-${counter++}`, grade: ls.grade, result: 'flash' });
      for (let k = 0; k < b.redpoint; k++) routes.push({ id: `e-${counter++}`, grade: ls.grade, result: 'redpoint' });
      for (let k = 0; k < b.fall; k++) routes.push({ id: `e-${counter++}`, grade: ls.grade, result: 'fall' });
    }
    setLeadRoutes(routes);
    setPrefilled(true);
  }, [data, prefilled]);

  const selectedGym = useMemo(
    () => allGyms?.find((g) => g.id === gymId) ?? null,
    [allGyms, gymId],
  );

  const canSubmit = useMemo(() => {
    if (!gymId) return false;
    if (isLeadSession) return leadRoutes.length > 0;
    if (isSprayWallSession) return true;
    return Object.values(colorCounts).some((c) => c.tries > 0);
  }, [gymId, colorCounts, leadRoutes, isLeadSession, isSprayWallSession]);

  async function handleSubmit() {
    if (!id || !gymId || updateSession.isPending) return;
    try {
      await updateSession.mutateAsync({
        sessionId: id,
        gymId,
        durationMin,
        condition,
        notes: notes.trim() ? notes.trim().slice(0, 100) : null,
        membershipId,
        ...(isLeadSession
          ? { leadRoutes }
          : { colors: Object.values(colorCounts) }),
      });
      router.replace({ pathname: '/session/[id]', params: { id } });
    } catch (e) {
      customAlert('저장 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  if (isLoading || !prefilled) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center"
        edges={['top', 'bottom']}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center p-6"
        edges={['top', 'bottom']}
      >
        <Text className="text-status-danger text-center mb-4">
          {error?.message ?? '세션을 찾을 수 없어요'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="border border-border-default rounded-md px-4 py-2"
        >
          <Text className="text-text-primary">돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <View className="flex-row items-center px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color={c.text.primary} />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold mr-6">
          세션 수정
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        {/* 날짜는 readonly — date picker는 v1.1 */}
        <Section title="날짜">
          <View className="px-3 py-2 rounded-md bg-background-secondary">
            <Text className="text-text-primary text-sm">
              {formatLongDate(data.session_date)}
            </Text>
          </View>
          <Text className="text-text-tertiary text-xs">날짜 수정은 v1.1에서 가능</Text>
        </Section>

        <Section title="암장" required>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="장소 검색"
              icon={<Feather name="search" size={14} color={c.text.tertiary} />}
              selected={false}
              onPress={() => setShowGymModal(true)}
            />
            {(recentGyms ?? []).map((g) => (
              <Chip
                key={g.id}
                label={`${g.name}${g.branch ? ` ${g.branch}` : ''}`}
                selected={gymId === g.id}
                onPress={() => { setGymId(g.id); setMembershipId(null); }}
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

        {gymId && (
          <Section title="회원권">
            <MembershipPicker
              gymId={gymId}
              selectedId={membershipId}
              onSelect={setMembershipId}
            />
          </Section>
        )}

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
                    !active ? 'border-border-subtle bg-background-primary' : ''
                  }`}
                  style={
                    active
                      ? { borderColor: color, backgroundColor: `${color}15` }
                      : undefined
                  }
                >
                  <MaterialCommunityIcons
                    name={icon}
                    size={22}
                    color={active ? color : '#94a3b8'}
                  />
                  <Text
                    className={`text-[10px] ${
                      active ? 'font-bold' : 'text-text-tertiary'
                    }`}
                    style={active ? { color } : undefined}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {isLeadSession ? (
          <Section title="리드 루트">
            <LeadEntry value={leadRoutes} onChange={setLeadRoutes} />
          </Section>
        ) : isSprayWallSession ? (
          <Section title="스프레이월">
            <View className="px-3 py-3 rounded-xl bg-background-secondary gap-1">
              <Text className="text-text-tertiary text-xs font-semibold">
                스프레이월 기록 {data!.spray_wall_summary.length}개 — 문제 상세 페이지에서 수정할 수 있어요
              </Text>
              {data!.spray_wall_summary.slice(0, 5).map((sw) => (
                <Text key={sw.id} className="text-text-secondary text-sm font-bold">
                  #{sw.number} {sw.name ?? ''}
                </Text>
              ))}
            </View>
          </Section>
        ) : (
          <Section title="색깔별 기록">
            <ColorCountsTable
              value={colorCounts}
              onChange={setColorCounts}
              colors={colorOrder}
              primaryCount={primaryCount}
            />
          </Section>
        )}

        <Section title="메모" icon="message-square">
          <FormInput
            placeholder="한 줄 메모 (최대 100자)"
            value={notes}
            onChangeText={(t) => setNotes(t.slice(0, 100))}
            maxLength={100}
            multiline
          />
        </Section>
      </ScrollView>

      <BottomCTA
        label="저장"
        onPress={handleSubmit}
        loading={updateSession.isPending}
        disabled={!canSubmit}
      />

      <GymPickerModal
        visible={showGymModal}
        gyms={allGyms ?? []}
        selectedId={gymId}
        onSelect={(pickedId) => {
          setGymId(pickedId);
          setMembershipId(null);
          setShowGymModal(false);
        }}
        onClose={() => setShowGymModal(false)}
      />
    </SafeAreaView>
  );
}
