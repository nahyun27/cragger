import { customAlert } from '@/components/ui/custom-alert';
import { useLocalSearchParams, useRouter } from '@/lib/router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { BoardEntry, makeEmptyBoardProblem, type BoardProblemEntry, type BoardType } from '@/components/climb/board-entry';
import { GRID_COLORS, type GridColor } from '@/components/climb/color-grid';
import { EnduranceEntry, type EnduranceStyle } from '@/components/climb/endurance-entry';
import { LeadEntry, type LeadRoute } from '@/components/climb/lead-entry';
import {
  ColorCountsTable,
  emptyColorCounts,
  type ColorCountsValue,
} from '@/components/session/color-counts-table';
import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { MembershipPicker } from '@/components/session/membership-picker';
import { Chip } from '@/components/ui/chip';
import { Sheet } from '@/components/ui/sheet';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import { FormInput } from '@/components/ui/form';
import { BottomCTA } from '@/components/ui/bottom-cta';
import { useGyms } from '@/hooks/use-gyms';
import { useGymRegisteredColors } from '@/hooks/use-gym-registered-colors';
import { useRecentColorActivity } from '@/hooks/use-recent-color-activity';
import { useRecentGyms } from '@/hooks/use-recent-gyms';
import { useRecordSession, type ClimbingDiscipline, type SprayWallAttemptEntry } from '@/hooks/use-record-session';
import { useSprayWallProblems, useSprayWallPhotos, useGymColorSchemes, type HoldType, type SprayWallPhoto } from '@/hooks/use-spray-wall';
import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import { useThemeColors } from '@/lib/theme';

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

const CONDITION_OPTIONS: { value: number; icon: any; color: string; label: string }[] = [
  { value: 1, icon: 'emoticon-dead-outline', color: '#ef4444', label: '최악' },
  { value: 2, icon: 'emoticon-sad-outline', color: '#f97316', label: '안좋음' },
  { value: 3, icon: 'emoticon-neutral-outline', color: '#eab308', label: '보통' },
  { value: 4, icon: 'emoticon-happy-outline', color: '#84cc16', label: '좋음' },
  { value: 5, icon: 'emoticon-excited-outline', color: '#06b6d4', label: '최상' },
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
  const c = useThemeColors();
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      {({ pressed }) => (
        <View
          style={{
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: 'center',
            gap: 6,
            borderWidth: 1.5,
            borderColor: active ? '#06b6d4' : c.border.subtle,
            backgroundColor: active ? '#06b6d4' : c.bg.primary,
            opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
            ...(active
              ? {
                  shadowColor: '#06b6d4',
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 3,
                }
              : {}),
          }}
        >
          <Feather
            name={icon}
            size={20}
            color={active ? '#ffffff' : c.text.secondary}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: active ? '#ffffff' : c.text.secondary,
              letterSpacing: -0.2,
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const SW = Dimensions.get('window').width;

const SW_HOLD_COLOR: Record<HoldType, string> = {
  start: '#22c55e', middle: '#3b82f6', top: '#ef4444', foot: '#7c3aed',
};
const SW_HOLD_SIZE: Record<HoldType, number> = {
  start: 28, middle: 20, top: 28, foot: 20,
};

// ── 스프레이월 문제 선택 컴포넌트 ───────────────────────────────
function SprayWallAttemptPicker({ problems, colorSchemes, photos, attempts, onChange }: {
  problems: NonNullable<ReturnType<typeof useSprayWallProblems>['data']>;
  colorSchemes: NonNullable<ReturnType<typeof useGymColorSchemes>['data']>;
  photos: SprayWallPhoto[];
  attempts: SprayWallAttemptEntry[];
  onChange: (a: SprayWallAttemptEntry[]) => void;
}) {
  const c = useThemeColors();
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [previewPhotoH, setPreviewPhotoH] = React.useState(SW * 0.75);

  const previewProblem = React.useMemo(
    () => problems.find((p) => p.id === previewId) ?? null,
    [problems, previewId],
  );
  const previewPhoto = React.useMemo(() => {
    if (!previewProblem) return null;
    return photos.find((ph) => ph.id === previewProblem.photo_id) ?? photos[0] ?? null;
  }, [previewProblem, photos]);

  React.useEffect(() => {
    if (!previewPhoto) return;
    Image.getSize(previewPhoto.photo_url, (w, h) => {
      setPreviewPhotoH(Math.min(Math.round(SW * h / w), 480));
    });
  }, [previewPhoto]);

  function getColorHex(color: string | null): string | null {
    if (!color) return null;
    const s = colorSchemes.find((cs) => cs.color === color);
    return resolveColorHex(color, s?.color_hex ?? null);
  }

  function getAttempt(problemId: string): SprayWallAttemptEntry | undefined {
    return attempts.find((a) => a.problemId === problemId);
  }

  function addProblem(problemId: string) {
    if (getAttempt(problemId)) return;
    onChange([...attempts, { problemId, result: 'send', tries: 1 }]);
  }

  function removeProblem(problemId: string) {
    onChange(attempts.filter((a) => a.problemId !== problemId));
  }

  function updateAttempt(problemId: string, patch: Partial<SprayWallAttemptEntry>) {
    onChange(attempts.map((a) => a.problemId === problemId ? { ...a, ...patch } : a));
  }

  const sorted = [...problems].sort((a, b) => a.number - b.number);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 11, color: c.text.muted, fontWeight: '600', marginBottom: 2 }}>
        문제를 탭해서 추가 · 추가한 문제는 결과와 횟수를 설정해요
      </Text>

      {sorted.map((p, idx) => {
        const attempt = getAttempt(p.id);
        const colorHex = getColorHex(p.color);
        const badgeColor = colorHex ?? '#7c3aed';
        const isAdded = !!attempt;

        return (
          <View
            key={p.id}
            style={[
              swStyles.row,
              {
                backgroundColor: isAdded ? `${badgeColor}12` : c.bg.card,
                borderColor: isAdded ? badgeColor : c.border.subtle,
              },
            ]}
          >
            {/* 번호 배지 (리스트 순서) */}
            <View style={[swStyles.badge, { backgroundColor: badgeColor }]}>
              <Text style={swStyles.badgeText}>{idx + 1}</Text>
            </View>

            {/* 문제 정보 + 보기 버튼 */}
            <Pressable style={{ flex: 1 }} onPress={() => !isAdded && addProblem(p.id)}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.text.primary }} numberOfLines={1}>
                {p.name || (p.description ? p.description : `문제 #${idx + 1}`)}
              </Text>
              <Text style={{ fontSize: 11, color: c.text.tertiary, fontWeight: '600' }}>
                {p.problem_type === 'endurance' ? '지구력' : '찍볼'}
              </Text>
            </Pressable>

            {/* 보기 버튼 */}
            {photos.length > 0 && (
              <Pressable
                onPress={() => setPreviewId(p.id)}
                hitSlop={8}
                style={swStyles.previewBtn}
              >
                <Feather name="eye" size={14} color={c.text.tertiary} />
              </Pressable>
            )}

            {/* 추가된 문제: 결과 + 횟수 */}
            {isAdded && attempt ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {/* 결과 토글 */}
                <Pressable
                  onPress={() => updateAttempt(p.id, { result: attempt.result === 'send' ? 'fall' : 'send' })}
                  style={[
                    swStyles.resultBtn,
                    { backgroundColor: attempt.result === 'send' ? '#22c55e' : '#ef4444' },
                  ]}
                >
                  <Text style={swStyles.resultText}>
                    {attempt.result === 'send' ? '완등' : '미완'}
                  </Text>
                </Pressable>

                {/* 횟수 조절 */}
                <View style={swStyles.triesRow}>
                  <Pressable
                    onPress={() => updateAttempt(p.id, { tries: Math.max(1, attempt.tries - 1) })}
                    hitSlop={6}
                  >
                    <Feather name="minus" size={14} color={c.text.tertiary} />
                  </Pressable>
                  <Text style={[swStyles.triesText, { color: c.text.primary }]}>{attempt.tries}</Text>
                  <Pressable
                    onPress={() => updateAttempt(p.id, { tries: attempt.tries + 1 })}
                    hitSlop={6}
                  >
                    <Feather name="plus" size={14} color={c.text.tertiary} />
                  </Pressable>
                </View>

                {/* 제거 */}
                <Pressable onPress={() => removeProblem(p.id)} hitSlop={8}>
                  <Feather name="x" size={16} color={c.text.muted} />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => addProblem(p.id)} style={swStyles.addBtn}>
                <Feather name="plus" size={14} color={badgeColor} />
              </Pressable>
            )}
          </View>
        );
      })}

      {/* ── 문제 미리보기 시트 ──────────────────────────────── */}
      <Sheet
        visible={!!previewId}
        onClose={() => setPreviewId(null)}
        variant="bottom"
        title={previewProblem ? (previewProblem.name || `문제 #${sorted.indexOf(previewProblem) + 1}`) : ''}
        noScroll
        contentStyle={{ paddingHorizontal: 0, paddingTop: 0 }}
      >
        {previewProblem && previewPhoto ? (
          <ScrollView
            style={{ width: SW, height: previewPhotoH }}
            contentContainerStyle={{ width: SW, height: previewPhotoH }}
            maximumZoomScale={3}
            minimumZoomScale={1}
            bouncesZoom
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            <View style={{ width: SW, height: previewPhotoH }}>
              <Image
                source={{ uri: previewPhoto.photo_url }}
                style={{ width: SW, height: previewPhotoH }}
                resizeMode="contain"
              />
              {previewProblem.holds.map((h, idx) => {
                const isEnd = previewProblem.problem_type === 'endurance';
                const color = isEnd ? '#f97316' : SW_HOLD_COLOR[h.hold_type];
                const size = isEnd ? 20 : SW_HOLD_SIZE[h.hold_type];
                const label = isEnd
                  ? String(idx + 1)
                  : h.hold_type === 'start' ? 'S'
                  : h.hold_type === 'top' ? 'T'
                  : '';
                const left = (h.marker_x / 100) * SW - size / 2;
                const top = (h.marker_y / 100) * previewPhotoH - size / 2;
                return (
                  <View
                    key={h.id}
                    style={{
                      position: 'absolute', left, top,
                      width: size, height: size, borderRadius: size / 2,
                      backgroundColor: color,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 2, borderColor: '#ffffff',
                      shadowColor: '#000', shadowOpacity: 0.3,
                      shadowRadius: 3, shadowOffset: { width: 0, height: 2 },
                      elevation: 4,
                    }}
                  >
                    {label ? (
                      <Text style={{ color: '#ffffff', fontSize: size * 0.38, fontWeight: '900' }}>{label}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : null}
      </Sheet>
    </View>
  );
}

const swStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 12,
    borderWidth: 1.5,
  },
  badge: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  resultBtn: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  resultText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  triesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  triesText: { fontSize: 14, fontWeight: '900', minWidth: 18, textAlign: 'center' },
  addBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  previewBtn: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
});

export default function NewSessionScreen() {

  const c = useThemeColors();  const router = useRouter();
  const insets = useSafeAreaInsets();
  const recordSession = useRecordSession();
  const params = useLocalSearchParams<{ gymId?: string; date?: string }>();
  // 캘린더에서 특정 날짜 클릭 시 ?date=YYYY-MM-DD 로 들어옴.
  const forcedDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : null;

  const [dateChoice, setDateChoice] = useState<DateChoice>('today');
  const [gymId, setGymId] = useState<string | null>(params.gymId ?? null);
  const [showGymModal, setShowGymModal] = useState(false);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [condition, setCondition] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [discipline, setDiscipline] = useState<ClimbingDiscipline>('boulder');
  const [colorCounts, setColorCounts] = useState<ColorCountsValue>(emptyColorCounts);
  const [leadRoutes, setLeadRoutes] = useState<LeadRoute[]>([]);
  const [boardType, setBoardType] = useState<BoardType | null>(null);
  const [boardProblems, setBoardProblems] = useState<BoardProblemEntry[]>(() => [makeEmptyBoardProblem()]);
  const [enduranceStyle, setEnduranceStyle] = useState<EnduranceStyle | null>(null);
  const [sprayWallAttempts, setSprayWallAttempts] = useState<SprayWallAttemptEntry[]>([]);

  const { data: recentGyms } = useRecentGyms();
  const { data: recentColors } = useRecentColorActivity(gymId);
  const { data: registeredColors } = useGymRegisteredColors(gymId);
  const sprayWallProblemsQ = useSprayWallProblems(gymId ?? undefined);
  const sprayWallPhotosQ = useSprayWallPhotos(gymId ?? undefined);
  const gymColorSchemesQ = useGymColorSchemes(gymId ?? undefined);
  const sprayWallProblemList = sprayWallProblemsQ.data ?? [];
  const sprayWallPhotoList = sprayWallPhotosQ.data ?? [];
  const gymColorSchemes = gymColorSchemesQ.data ?? [];
  // gym_color_schemes.order_index 순서가 있으면 그걸 우선 사용.
  // 없으면(암장 미등록) recentColors 기반 fallback.
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
  const { data: allGyms } = useGyms();
  const selectedGym = useMemo(
    () => allGyms?.find((g) => g.id === gymId) ?? null,
    [allGyms, gymId],
  );

  // 등반 종목 = 암장 필수, 지구력/근력 = 암장 옵션
  const isClimbDiscipline = discipline === 'boulder' || discipline === 'lead' || discipline === 'board';

  const canSubmit = useMemo(() => {
    if (isClimbDiscipline && !gymId) return false;
    if (discipline === 'boulder') {
      return Object.values(colorCounts).some((c) => c.tries > 0) || sprayWallAttempts.length > 0;
    }
    if (discipline === 'lead') {
      return leadRoutes.length > 0;
    }
    if (discipline === 'board') {
      const filled = boardProblems.filter((p) => p.name.trim().length > 0);
      return !!boardType && filled.length > 0;
    }
    if (discipline === 'endurance') {
      return !!enduranceStyle || sprayWallAttempts.length > 0;
    }
    // strength
    return true;
  }, [isClimbDiscipline, gymId, discipline, colorCounts, leadRoutes, boardType, boardProblems, enduranceStyle, sprayWallAttempts]);

  async function handleSubmit() {
    if (recordSession.isPending) return;
    if (isClimbDiscipline && !gymId) return;
    try {
      await recordSession.mutateAsync({
        gymId,
        sessionDate: forcedDate ?? isoDateForChoice(dateChoice),
        durationMin,
        condition,
        notes: notes.trim() ? notes.trim().slice(0, 100) : null,
        membershipId,
        discipline,
        colors: discipline === 'boulder' ? Object.values(colorCounts) : undefined,
        sprayWallAttempts: (discipline === 'boulder' || discipline === 'endurance') ? sprayWallAttempts : undefined,
        leadRoutes: discipline === 'lead' ? leadRoutes : undefined,
        boardType: discipline === 'board' ? boardType : null,
        boardProblems: discipline === 'board' ? boardProblems : undefined,
        enduranceStyle: discipline === 'endurance' ? enduranceStyle : null,
      });
      router.replace('/(tabs)/log');
    } catch (e) {
      customAlert('기록 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary }} edges={['left', 'right']}>
      <ScreenHeader title="오늘 운동 기록" onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        <Section title="종목" required icon="activity">
          <View className="flex-row flex-wrap gap-2">
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
              active={discipline === 'board'}
              onPress={() => setDiscipline('board')}
            />
            <DisciplineBtn
              label="지구력"
              icon="activity"
              active={discipline === 'endurance'}
              onPress={() => setDiscipline('endurance')}
            />
            <DisciplineBtn
              label="근력"
              icon="zap"
              active={discipline === 'strength'}
              onPress={() => setDiscipline('strength')}
            />
          </View>
        </Section>

        <Section title="날짜" required icon="calendar">
          {forcedDate ? (
            <View className="flex-row items-center gap-2 px-3 py-2.5 rounded-xl bg-background-secondary border border-border-subtle">
              <Feather name="calendar" size={14} color={c.brand.primary} />
              <Text className="text-text-primary text-sm font-extrabold">
                {forcedDate.replace(/-/g, '.')}
              </Text>
              <Text className="text-text-tertiary text-[11px] font-semibold">
                · 캘린더에서 선택한 날짜
              </Text>
            </View>
          ) : (
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
                  customAlert('준비 중', '그저께 이전 날짜 선택은 v1.1에서 추가됩니다.')
                }
              />
            </View>
          )}
        </Section>

        <Section
          title="암장"
          required={isClimbDiscipline}
          icon="map-pin"
        >
          {!isClimbDiscipline && (
            <Text className="text-text-tertiary text-[11px] font-semibold mb-2">
              선택 — 헬스장 / 홈트레이닝 등 외부 시설은 비워두세요
            </Text>
          )}
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
          <Section title="회원권" icon="credit-card">
            <MembershipPicker
              gymId={gymId}
              selectedId={membershipId}
              onSelect={setMembershipId}
            />
          </Section>
        )}

        <Section title="운동 시간" icon="clock">
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

        <Section title="컨디션" icon="zap">
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

        {discipline === 'boulder' && (
          <Section title="색깔별 기록" icon="droplet">
            <ColorCountsTable
              value={colorCounts}
              onChange={setColorCounts}
              colors={colorOrder}
              primaryCount={primaryCount}
            />
          </Section>
        )}

        {/* ── 스프레이월 문제 (볼더링 + 지구력 + 스프레이월 있는 암장) ── */}
        {(discipline === 'boulder' || discipline === 'endurance') && sprayWallProblemList.length > 0 && (
          <Section title="스프레이월 문제" icon="map-pin">
            <SprayWallAttemptPicker
              problems={sprayWallProblemList}
              colorSchemes={gymColorSchemes}
              photos={sprayWallPhotoList}
              attempts={sprayWallAttempts}
              onChange={setSprayWallAttempts}
            />
          </Section>
        )}
        {discipline === 'lead' && (
          <Section title="루트 기록" required icon="trending-up">
            <LeadEntry value={leadRoutes} onChange={setLeadRoutes} />
          </Section>
        )}
        {discipline === 'board' && (
          <Section title="보드 기록" required icon="grid">
            <BoardEntry
              boardType={boardType}
              onChangeBoardType={setBoardType}
              problems={boardProblems}
              onChangeProblems={setBoardProblems}
            />
          </Section>
        )}
        {discipline === 'endurance' && (
          <Section title="지구력" required icon="activity">
            <EnduranceEntry value={enduranceStyle} onChange={setEnduranceStyle} />
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
        label="기록"
        icon="check"
        onPress={handleSubmit}
        loading={recordSession.isPending}
        disabled={!canSubmit}
      />

      <GymPickerModal
        visible={showGymModal}
        gyms={allGyms ?? []}
        selectedId={gymId}
        onSelect={(id) => {
          setGymId(id);
          setMembershipId(null);
          setShowGymModal(false);
        }}
        onClose={() => setShowGymModal(false)}
      />
    </SafeAreaView>
  );
}
