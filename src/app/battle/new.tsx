import { customAlert } from '@/components/ui/custom-alert';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import { FormInput, FormPressable } from '@/components/ui/form';
import { BottomCTA } from '@/components/ui/bottom-cta';
import { CLIMB_COLOR_HEX, CLIMB_COLOR_LABEL } from '@/constants/climb-colors';
import { useGyms } from '@/hooks/use-gyms';
import { supabase } from '@/lib/supabase';
import { useThemeColors } from '@/lib/theme';
import {
  useCreateBattle,
  useLookupCrewForBattle,
  vToScore,
  type BattleType,
  type ColorGrade,
  type ScoreVisibility,
  type ScoringRules,
} from '@/hooks/use-battles';

const TITLE_MAX = 40;

type ScoringMode = 'linear' | 'exp' | 'custom';

const V_GRADES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

const DEFAULT_CUSTOM_POINTS: Record<string, number> = {
  '0': 1, '1': 2, '2': 4, '3': 7, '4': 12,
  '5': 20, '6': 32, '7': 50, '8': 75, '9': 100,
};

function buildScoringRulesFrom(mode: ScoringMode, customPoints: Record<string, string>): ScoringRules {
  if (mode === 'linear') return { type: 'linear', base: 1 };
  if (mode === 'exp') return { type: 'exp', base: 1.5 };
  const v_points: Record<string, number> = {};
  for (const k of V_GRADES) {
    const n = parseInt(customPoints[k], 10);
    if (!Number.isNaN(n)) v_points[k] = n;
  }
  return { type: 'custom', v_points };
}

// 암장에 등록된 색깔 + 크라우드 평균 V (default 추천용)
function useGymColorOptions(gymId: string | null) {
  return useQuery({
    queryKey: ['gyms', gymId, 'color-options'] as const,
    enabled: !!gymId,
    queryFn: async (): Promise<{ color: string; defaultV: number | null }[]> => {
      const [schemesRes, statsRes] = await Promise.all([
        supabase
          .from('gym_color_schemes')
          .select('color, order_index')
          .eq('gym_id', gymId!)
          .order('order_index', { ascending: true }),
        supabase
          .from('gym_color_grade_stats')
          .select('color, avg_v_grade')
          .eq('gym_id', gymId!),
      ]);
      if (schemesRes.error) throw new Error(schemesRes.error.message);
      const schemeRows = (schemesRes.data ?? []) as Array<{ color: string }>;
      const stats = new Map<string, number | null>();
      for (const r of (statsRes.data ?? []) as Array<{ color: string; avg_v_grade: number | null }>) {
        stats.set(r.color, r.avg_v_grade);
      }
      return schemeRows.map((r) => ({ color: r.color, defaultV: stats.get(r.color) ?? null }));
    },
  });
}

export default function NewBattleScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { crewId } = useLocalSearchParams<{ crewId: string }>();
  const createBattle = useCreateBattle();
  const { data: allGyms } = useGyms();

  const [battleType, setBattleType] = useState<BattleType>('crew_internal');
  const [teamAName, setTeamAName] = useState('A팀');
  const [teamBName, setTeamBName] = useState('B팀');
  const [title, setTitle] = useState('');
  const [battleDate, setBattleDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gymId, setGymId] = useState<string | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);
  const [opponentCode, setOpponentCode] = useState('');
  const opponentCodeUpper = opponentCode.trim().toUpperCase();
  const opponentLookup = useLookupCrewForBattle(opponentCodeUpper);

  const [scoringMode, setScoringMode] = useState<ScoringMode>('linear');
  const [customPoints, setCustomPoints] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const k of V_GRADES) m[k] = String(DEFAULT_CUSTOM_POINTS[k]);
    return m;
  });

  const [scoreVisibility, setScoreVisibility] = useState<ScoreVisibility>('live');
  // 색깔 점수 배열 — 순서 = 호스트가 정한 난이도 순(쉬운→어려운)
  const [colorGrades, setColorGrades] = useState<ColorGrade[]>([]);
  // 사용자가 직접 점수 수정한 색깔 — 점수 모드 바꿔도 덮어쓰지 않음
  const editedColors = useRef<Set<string>>(new Set());
  const [showAddColor, setShowAddColor] = useState(false);

  const gymColorOptionsQ = useGymColorOptions(gymId);

  const scoringRules = useMemo(() => buildScoringRulesFrom(scoringMode, customPoints), [scoringMode, customPoints]);

  // 암장의 등록 색깔 + 크라우드 평균 V 로 점수 자동 배정. 사용자가 손댄 점수는 유지.
  useEffect(() => {
    if (!gymColorOptionsQ.data) return;
    const gymRows = gymColorOptionsQ.data;
    setColorGrades((prev) => {
      const prevMap = new Map(prev.map((e) => [e.color, e.points]));
      const next: ColorGrade[] = [];
      // 기존 순서 보존
      for (const e of prev) {
        if (editedColors.current.has(e.color)) {
          next.push(e);
        } else {
          const row = gymRows.find((r) => r.color === e.color);
          const v = row?.defaultV ?? null;
          const pts = v != null ? Math.max(1, Math.round(vToScore(v, scoringRules))) : e.points;
          next.push({ color: e.color, points: pts });
        }
      }
      // 아직 추가 안 된 등록 색깔은 뒤에 추가 (난이도 desc 순)
      const present = new Set(next.map((e) => e.color));
      const newRows = gymRows
        .filter((r) => !present.has(r.color))
        .map((r) => {
          const v = r.defaultV;
          const pts = v != null ? Math.max(1, Math.round(vToScore(v, scoringRules))) : (prevMap.get(r.color) ?? 3);
          return { color: r.color, points: pts };
        })
        .sort((a, b) => a.points - b.points);
      return [...next, ...newRows];
    });
  }, [gymColorOptionsQ.data, scoringRules]);

  const selectedGym = useMemo(
    () => allGyms?.find((g) => g.id === gymId) ?? null,
    [allGyms, gymId],
  );

  const opponentReady =
    battleType !== 'crew_vs_crew' ||
    (opponentLookup.data != null && opponentLookup.data.id !== crewId);

  const canSubmit =
    title.trim().length > 0 &&
    !!gymId &&
    opponentReady &&
    colorGrades.length > 0 &&
    !createBattle.isPending;

  async function handleSubmit() {
    if (!canSubmit || !crewId || !gymId) return;
    try {
      const dateStr = battleDate.toISOString().slice(0, 10);
      const { id } = await createBattle.mutateAsync({
        battleType,
        title: title.trim(),
        crewId,
        opponentCrewId:
          battleType === 'crew_vs_crew' ? opponentLookup.data?.id ?? null : null,
        gymId,
        battleDate: dateStr,
        scoringRules,
        colorGrades,
        scoreVisibility,
        teamAName: battleType === 'crew_internal_team' ? teamAName.trim() || 'A팀' : undefined,
        teamBName: battleType === 'crew_internal_team' ? teamBName.trim() || 'B팀' : undefined,
      });
      router.replace({ pathname: '/battle/[id]', params: { id } } as never);
    } catch (e) {
      customAlert('대결 만들기 실패', e instanceof Error ? e.message : '오류');
    }
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView className="flex-1 bg-background-primary" edges={['left', 'right']}>
      <ScreenHeader title="대결 만들기" onBack={() => router.back()} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="p-5 gap-6"
          contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          keyboardShouldPersistTaps="handled"
        >
          <Section title="대결 종류" required icon="zap">
            <View className="gap-2">
              <TypeBtn
                label="크루 내 개인전"
                desc="참여 멤버끼리 점수 경쟁"
                active={battleType === 'crew_internal'}
                onPress={() => setBattleType('crew_internal')}
              />
              <TypeBtn
                label="크루 내 팀전"
                desc="멤버끼리 A팀 vs B팀 합산 대결"
                active={battleType === 'crew_internal_team'}
                onPress={() => setBattleType('crew_internal_team')}
              />
              <TypeBtn
                label="크루 vs 크루"
                desc="다른 크루와 합산 점수 대결"
                active={battleType === 'crew_vs_crew'}
                onPress={() => setBattleType('crew_vs_crew')}
              />
            </View>
          </Section>

          {battleType === 'crew_internal_team' && (
            <Section title="팀 이름" required icon="users">
              <View className="flex-row gap-2">
                <View style={{ flex: 1 }}>
                  <FormInput
                    placeholder="A팀"
                    value={teamAName}
                    onChangeText={(t) => setTeamAName(t.slice(0, 12))}
                    maxLength={12}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormInput
                    placeholder="B팀"
                    value={teamBName}
                    onChangeText={(t) => setTeamBName(t.slice(0, 12))}
                    maxLength={12}
                  />
                </View>
              </View>
            </Section>
          )}

          <Section title="제목" required icon="edit-3">
            <FormInput
              placeholder="예: 더클라임 원정 대결"
              value={title}
              onChangeText={(t) => setTitle(t.slice(0, TITLE_MAX))}
              maxLength={TITLE_MAX}
            />
          </Section>

          <Section title="날짜 (기록용)" required icon="calendar">
            <FormPressable
              onPress={() => setShowDatePicker(true)}
              leadingIcon="calendar"
              value={formatDate(battleDate)}
            />
            {showDatePicker && (
              <RnDatePicker
                value={battleDate}
                onChange={(d) => {
                  setBattleDate(d);
                  setShowDatePicker(false);
                }}
                onClose={() => setShowDatePicker(false)}
              />
            )}
          </Section>

          <Section title="암장" required icon="map-pin">
            <FormPressable
              onPress={() => setShowGymModal(true)}
              leadingIcon="map-pin"
              placeholder="암장 선택"
              value={
                selectedGym
                  ? `${selectedGym.name}${selectedGym.branch ? ` ${selectedGym.branch}` : ''}`
                  : null
              }
              trailingNode={<Feather name="chevron-down" size={16} color={c.text.muted} />}
            />
          </Section>

          {gymId && (
            <Section title="색깔별 점수" required icon="droplet">
              <Text className="text-text-tertiary text-[11px] font-semibold mb-2">
                쉬운 색깔부터 위에서 아래로. 드래그해서 순서 바꿔요. 암장에 V그레이드가 등록돼 있으면 점수 모드에 따라 자동 배정 — 직접 수정 가능.
              </Text>
              {gymColorOptionsQ.isLoading ? (
                <ActivityIndicator size="small" color={c.brand.primary} />
              ) : (
                <View className="gap-2">
                  {colorGrades.length === 0 && (
                    <Text className="text-text-tertiary text-xs font-semibold py-2">
                      이 암장에 등록된 색깔이 없어요. 아래 버튼으로 직접 추가해 주세요.
                    </Text>
                  )}
                  {colorGrades.length > 0 && (
                    <DraggableFlatList
                      data={colorGrades}
                      keyExtractor={(item) => item.color}
                      onDragEnd={({ data }) => setColorGrades(data)}
                      scrollEnabled={false}
                      activationDistance={8}
                      containerStyle={{ overflow: 'visible' }}
                      renderItem={({ item, drag, isActive }: RenderItemParams<ColorGrade>) => (
                        <ColorGradeRow
                          color={item.color}
                          points={item.points}
                          drag={drag}
                          isActive={isActive}
                          onChangePoints={(n) => {
                            editedColors.current.add(item.color);
                            setColorGrades((prev) =>
                              prev.map((e) => (e.color === item.color ? { ...e, points: n } : e)),
                            );
                          }}
                          onRemove={() => {
                            editedColors.current.delete(item.color);
                            setColorGrades((prev) => prev.filter((e) => e.color !== item.color));
                          }}
                        />
                      )}
                    />
                  )}
                  <Pressable
                    onPress={() => setShowAddColor(true)}
                    className="flex-row items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-border-strong active:opacity-70"
                  >
                    <Feather name="plus" size={14} color={c.text.secondary} />
                    <Text className="text-text-secondary text-xs font-extrabold">색깔 추가</Text>
                  </Pressable>
                </View>
              )}
            </Section>
          )}

          <Section title="점수 공개 시점" required icon="eye">
            <View className="gap-2">
              <ScoringModeBtn
                label="실시간 공개"
                desc="진행 중 점수가 모두에게 보임 (기본)"
                active={scoreVisibility === 'live'}
                onPress={() => setScoreVisibility('live')}
              />
              <ScoringModeBtn
                label="종료 후 공개"
                desc="대결 종료 전까지 점수·랭킹 숨김 (서프라이즈)"
                active={scoreVisibility === 'after_end'}
                onPress={() => setScoreVisibility('after_end')}
              />
            </View>
          </Section>

          {battleType === 'crew_vs_crew' && (
            <Section title="상대 크루" required icon="key">
              <FormInput
                leadingIcon="key"
                placeholder="상대 크루 초대코드 (6자리)"
                value={opponentCode}
                onChangeText={(t) =>
                  setOpponentCode(t.replace(/[^A-Za-z0-9]/g, '').slice(0, 6))
                }
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                inputStyle={{ letterSpacing: 3, fontWeight: '800' }}
              />
              {opponentCodeUpper.length === 6 && (
                <View className="mt-2 bg-background-secondary rounded-xl p-3">
                  {opponentLookup.isLoading ? (
                    <ActivityIndicator size="small" color={c.brand.primary} />
                  ) : opponentLookup.data ? (
                    opponentLookup.data.id === crewId ? (
                      <Text className="text-status-danger text-xs font-semibold">
                        본인 크루와는 대결할 수 없어요
                      </Text>
                    ) : (
                      <View>
                        <Text className="text-text-primary text-sm font-extrabold">
                          {opponentLookup.data.name}
                        </Text>
                        <Text className="text-text-tertiary text-xs">
                          멤버 {opponentLookup.data.member_count}명 · 상대 크루장 수락 후 시작
                        </Text>
                      </View>
                    )
                  ) : (
                    <Text className="text-text-tertiary text-xs">
                      코드를 확인해주세요
                    </Text>
                  )}
                </View>
              )}
            </Section>
          )}

          <Section title="점수 규칙" required icon="award">
            <View className="gap-2">
              <ScoringModeBtn
                label="기본 (V그레이드 × 1)"
                desc="V3 완등 = 3점, V5 완등 = 5점"
                active={scoringMode === 'linear'}
                onPress={() => setScoringMode('linear')}
              />
              <ScoringModeBtn
                label="지수형 (어려울수록 가중치 ↑)"
                desc="V × 1.5^V — V5는 38점, V7은 113점"
                active={scoringMode === 'exp'}
                onPress={() => setScoringMode('exp')}
              />
              <ScoringModeBtn
                label="직접 입력"
                desc="V그레이드별 점수 직접 설정"
                active={scoringMode === 'custom'}
                onPress={() => setScoringMode('custom')}
              />
            </View>
            {scoringMode === 'custom' && (
              <View className="mt-3 bg-background-secondary rounded-xl p-3 gap-2">
                <Text className="text-text-tertiary text-xs font-semibold">V그레이드별 점수</Text>
                <View className="flex-row flex-wrap gap-2">
                  {V_GRADES.map((v) => (
                    <View key={v} className="flex-row items-center bg-background-primary rounded-lg px-2 py-1.5 border border-border-subtle">
                      <Text className="text-text-secondary text-xs font-bold mr-1">V{v}</Text>
                      <TextInput
                        value={customPoints[v]}
                        onChangeText={(t) =>
                          setCustomPoints((p) => ({ ...p, [v]: t.replace(/[^0-9]/g, '') }))
                        }
                        keyboardType="number-pad"
                        className="text-text-primary text-sm font-bold w-10 text-center"
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Section>
        </ScrollView>

        <BottomCTA
          label="대결 만들기"
          icon="zap"
          onPress={handleSubmit}
          loading={createBattle.isPending}
          disabled={!canSubmit}
        />
      </KeyboardAvoidingView>

      <GymPickerModal
        visible={showGymModal}
        gyms={allGyms ?? []}
        selectedId={gymId}
        onSelect={(picked) => { setGymId(picked); setShowGymModal(false); }}
        onClose={() => setShowGymModal(false)}
      />

      <AddColorSheet
        visible={showAddColor}
        existing={colorGrades.map((e) => e.color)}
        onConfirm={(picked) => {
          setColorGrades((prev) => {
            const have = new Set(prev.map((e) => e.color));
            const additions: ColorGrade[] = [];
            for (const color of picked) {
              if (have.has(color)) continue;
              const gymRow = gymColorOptionsQ.data?.find((r) => r.color === color);
              const v = gymRow?.defaultV ?? null;
              const pts = v != null ? Math.max(1, Math.round(vToScore(v, scoringRules))) : 3;
              additions.push({ color, points: pts });
            }
            return [...prev, ...additions];
          });
          setShowAddColor(false);
        }}
        onClose={() => setShowAddColor(false)}
      />
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function ColorGradeRow({
  color, points, drag, isActive, onChangePoints, onRemove,
}: {
  color: string;
  points: number;
  drag: () => void;
  isActive: boolean;
  onChangePoints: (n: number) => void;
  onRemove: () => void;
}) {
  const c = useThemeColors();
  const hex = CLIMB_COLOR_HEX[color] ?? '#9CA3AF';
  const label = CLIMB_COLOR_LABEL[color] ?? color;
  const isLight = color === 'white' || color === 'yellow' || color === 'lime' || color === 'sky';
  const [text, setText] = useState<string>(String(points));
  // 외부에서 points 가 바뀌면(자동 배정 등) 입력값도 동기화
  useEffect(() => {
    setText(String(points));
  }, [points]);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isActive ? c.brand.primary : c.border.subtle,
        backgroundColor: c.bg.card,
        opacity: isActive ? 0.92 : 1,
      }}
    >
      <Pressable onLongPress={drag} delayLongPress={120} hitSlop={6} className="p-1 active:opacity-60">
        <Feather name="menu" size={16} color={c.text.muted} />
      </Pressable>
      <View
        style={{
          width: 24, height: 24, borderRadius: 12, backgroundColor: hex,
          borderWidth: isLight ? 1 : 0, borderColor: c.border.subtle,
        }}
      />
      <Text className="text-text-primary text-[13px] font-extrabold flex-1" numberOfLines={1}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: c.bg.subtle, borderRadius: 8, paddingHorizontal: 8,
          minWidth: 70,
        }}
      >
        <TextInput
          value={text}
          onChangeText={(t) => {
            const cleaned = t.replace(/[^0-9]/g, '').slice(0, 4);
            setText(cleaned);
            const n = parseInt(cleaned, 10);
            if (!Number.isNaN(n)) onChangePoints(n);
          }}
          onBlur={() => {
            if (text === '' || parseInt(text, 10) === 0) {
              setText('1');
              onChangePoints(1);
            }
          }}
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={4}
          selectTextOnFocus
          style={{
            color: c.text.primary, fontSize: 13, fontWeight: '900',
            paddingVertical: 6, minWidth: 32, textAlign: 'right',
          }}
        />
        <Text className="text-text-secondary text-[11px] font-extrabold ml-0.5">점</Text>
      </View>
      <Pressable onPress={onRemove} hitSlop={6} className="p-1.5 active:opacity-60">
        <Feather name="x" size={16} color={c.text.muted} />
      </Pressable>
    </View>
  );
}

function AddColorSheet({
  visible, existing, onConfirm, onClose,
}: {
  visible: boolean;
  existing: string[];
  onConfirm: (colors: string[]) => void;
  onClose: () => void;
}) {
  const c = useThemeColors();
  const taken = new Set(existing);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // 시트 열릴 때마다 선택 초기화
  useEffect(() => {
    if (visible) setPicked(new Set());
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: c.bg.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: c.bg.card, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28, borderTopLeftRadius: 22, borderTopRightRadius: 22 }}
        >
          <Text className="text-text-primary text-base font-extrabold mb-2">색깔 추가</Text>
          <Text className="text-text-tertiary text-[11px] font-semibold mb-3">
            한 번에 여러 색깔을 골라 추가할 수 있어요
          </Text>
          <View className="flex-row flex-wrap" style={{ marginHorizontal: -3 }}>
            {Object.keys(CLIMB_COLOR_HEX).map((color) => {
              const isTaken = taken.has(color);
              const isPicked = picked.has(color);
              const hex = CLIMB_COLOR_HEX[color];
              const label = CLIMB_COLOR_LABEL[color] ?? color;
              const isLight = color === 'white' || color === 'yellow' || color === 'lime' || color === 'sky';
              return (
                <Pressable
                  key={color}
                  disabled={isTaken}
                  onPress={() => {
                    setPicked((prev) => {
                      const next = new Set(prev);
                      if (next.has(color)) next.delete(color);
                      else next.add(color);
                      return next;
                    });
                  }}
                  style={{ width: '25%', padding: 3, opacity: isTaken ? 0.35 : 1 }}
                  className="active:opacity-60"
                >
                  <View
                    style={{
                      backgroundColor: hex,
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      borderWidth: isPicked ? 3 : isLight ? 1 : 0,
                      borderColor: isPicked ? c.brand.primary : c.border.subtle,
                      position: 'relative',
                    }}
                  >
                    <Text style={{ color: isLight ? '#0f172a' : '#ffffff', fontSize: 11, fontWeight: '800' }}>
                      {label}
                    </Text>
                    {isPicked && (
                      <View
                        style={{
                          position: 'absolute', top: -6, right: -6,
                          backgroundColor: c.brand.primary, borderRadius: 10,
                          width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
                          borderWidth: 2, borderColor: c.bg.card,
                        }}
                      >
                        <Feather name="check" size={11} color={c.brand.onPrimary} />
                      </View>
                    )}
                    {isTaken && (
                      <Text className="text-text-muted text-[9px] font-bold mt-0.5">추가됨</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row gap-2 mt-4">
            <Pressable
              onPress={onClose}
              className="flex-1 py-3 rounded-xl items-center"
              style={{ backgroundColor: c.bg.subtle }}
            >
              <Text className="text-text-secondary text-[13px] font-extrabold">취소</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(Array.from(picked))}
              disabled={picked.size === 0}
              className="flex-1 py-3 rounded-xl items-center"
              style={{
                backgroundColor: picked.size === 0 ? c.bg.subtle : c.brand.primary,
                opacity: picked.size === 0 ? 0.55 : 1,
              }}
            >
              <Text
                style={{
                  color: picked.size === 0 ? c.text.muted : c.brand.onPrimary,
                  fontSize: 13, fontWeight: '900',
                }}
              >
                {picked.size > 0 ? `${picked.size}개 추가` : '추가'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TypeBtn({ label, desc, active, onPress }: {
  label: string; desc: string; active: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      {({ pressed }) => (
        <View
          style={{
            paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14,
            borderWidth: 1.5, borderColor: active ? '#06b6d4' : '#e2e8f0',
            backgroundColor: active ? '#ecfeff' : '#ffffff',
            opacity: pressed ? 0.85 : 1, gap: 4,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: active ? '#0e7490' : '#475569' }}>
            {label}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: active ? '#0e7490' : '#94a3b8' }}>
            {desc}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function ScoringModeBtn({ label, desc, active, onPress }: {
  label: string; desc: string; active: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View
          style={{
            paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
            borderWidth: 1.5, borderColor: active ? '#06b6d4' : '#e2e8f0',
            backgroundColor: active ? '#ecfeff' : '#ffffff',
            opacity: pressed ? 0.85 : 1, gap: 3,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: active ? '#0e7490' : '#475569' }}>
            {label}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: active ? '#0e7490' : '#94a3b8' }}>
            {desc}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function RnDatePicker({ value, onChange, onClose }: {
  value: Date; onChange: (d: Date) => void; onClose: () => void;
}) {
  const c = useThemeColors();
  return (
    <>
      <DateTimePicker
        value={value}
        mode="date"
        display={Platform.OS === 'ios' ? 'inline' : 'default'}
        onChange={(event, picked) => {
          if (Platform.OS !== 'ios') onClose();
          if (event.type === 'dismissed') return;
          if (picked) onChange(picked);
        }}
      />
      {Platform.OS === 'ios' && (
        <Pressable onPress={onClose} style={{ alignSelf: 'flex-end', padding: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: c.brand.primary }}>완료</Text>
        </Pressable>
      )}
    </>
  );
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}.${m}.${day} (${days[d.getDay()]})`;
}
