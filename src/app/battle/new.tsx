import { customAlert } from '@/components/ui/custom-alert';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { Section } from '@/components/ui/section';
import { useGyms } from '@/hooks/use-gyms';
import { useThemeColors } from '@/lib/theme';
import {
  useCreateBattle,
  useLookupCrewForBattle,
  type BattleType,
  type ScoringRules,
} from '@/hooks/use-battles';

const TITLE_MAX = 40;

type ScoringMode = 'linear' | 'exp' | 'custom';

const V_GRADES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

const DEFAULT_CUSTOM_POINTS: Record<string, number> = {
  '0': 1, '1': 2, '2': 4, '3': 7, '4': 12,
  '5': 20, '6': 32, '7': 50, '8': 75, '9': 100,
};

export default function NewBattleScreen() {
  const c = useThemeColors();
  const router = useRouter();
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
    !createBattle.isPending;

  function buildScoringRules(): ScoringRules {
    if (scoringMode === 'linear') return { type: 'linear', base: 1 };
    if (scoringMode === 'exp') return { type: 'exp', base: 1.5 };
    // custom
    const v_points: Record<string, number> = {};
    for (const k of V_GRADES) {
      const n = parseInt(customPoints[k], 10);
      if (!Number.isNaN(n)) v_points[k] = n;
    }
    return { type: 'custom', v_points };
  }

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
        scoringRules: buildScoringRules(),
        teamAName: battleType === 'crew_internal_team' ? teamAName.trim() || 'A팀' : undefined,
        teamBName: battleType === 'crew_internal_team' ? teamBName.trim() || 'B팀' : undefined,
      });
      router.replace({ pathname: '/battle/[id]', params: { id } } as never);
    } catch (e) {
      customAlert('대결 만들기 실패', e instanceof Error ? e.message : '오류');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color={c.text.primary} />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold mr-6">
          대결 만들기
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerClassName="p-5 gap-6 pb-8" keyboardShouldPersistTaps="handled">
          <Section title="대결 종류" required>
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
            <Section title="팀 이름" required>
              <View className="flex-row gap-2">
                <View className="flex-1 bg-background-secondary border border-border-subtle rounded-xl px-3.5">
                  <TextInput
                    placeholder="A팀"
                    placeholderTextColor="#9CA3AF"
                    value={teamAName}
                    onChangeText={(t) => setTeamAName(t.slice(0, 12))}
                    maxLength={12}
                    className="py-3 text-text-primary text-sm font-bold"
                  />
                </View>
                <View className="flex-1 bg-background-secondary border border-border-subtle rounded-xl px-3.5">
                  <TextInput
                    placeholder="B팀"
                    placeholderTextColor="#9CA3AF"
                    value={teamBName}
                    onChangeText={(t) => setTeamBName(t.slice(0, 12))}
                    maxLength={12}
                    className="py-3 text-text-primary text-sm font-bold"
                  />
                </View>
              </View>
            </Section>
          )}

          <Section title="제목" required>
            <View className="bg-background-secondary border border-border-subtle rounded-xl px-3.5">
              <TextInput
                placeholder="예: 더클라임 원정 대결"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={(t) => setTitle(t.slice(0, TITLE_MAX))}
                maxLength={TITLE_MAX}
                className="py-3 text-text-primary text-base"
              />
            </View>
          </Section>

          <Section title="날짜 (기록용)" required>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="bg-background-secondary border border-border-subtle rounded-xl px-3.5 py-3 active:opacity-70 flex-row items-center"
            >
              <Feather name="calendar" size={16} color={c.text.tertiary} />
              <Text className="text-text-primary text-base font-bold ml-2">
                {formatDate(battleDate)}
              </Text>
            </Pressable>
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

          <Section title="암장" required>
            <Pressable
              onPress={() => setShowGymModal(true)}
              className="bg-background-secondary border border-border-subtle rounded-xl px-3.5 py-3 active:opacity-70 flex-row items-center"
            >
              <Feather name="map-pin" size={16} color={c.text.tertiary} />
              <Text className={`text-base ml-2 flex-1 ${selectedGym ? 'text-text-primary font-bold' : 'text-text-muted'}`}>
                {selectedGym
                  ? `${selectedGym.name}${selectedGym.branch ? ` ${selectedGym.branch}` : ''}`
                  : '암장 선택'}
              </Text>
              <Feather name="chevron-down" size={16} color={c.text.muted} />
            </Pressable>
          </Section>

          {battleType === 'crew_vs_crew' && (
            <Section title="상대 크루" required>
              <View className="flex-row items-center bg-background-secondary border border-border-subtle rounded-xl px-3.5">
                <Feather name="key" size={14} color={c.text.tertiary} />
                <TextInput
                  placeholder="상대 크루 초대코드 (6자리)"
                  placeholderTextColor="#9CA3AF"
                  value={opponentCode}
                  onChangeText={(t) =>
                    setOpponentCode(t.replace(/[^A-Za-z0-9]/g, '').slice(0, 6))
                  }
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  className="flex-1 py-3 ml-2 text-text-primary text-base"
                  style={{ letterSpacing: 3, fontWeight: '800' }}
                />
              </View>
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

          <Section title="점수 규칙" required>
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

        <View className="px-5 pt-3 pb-5 border-t border-border-subtle">
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            className={`rounded-xl py-4 items-center ${
              !canSubmit ? 'bg-background-tertiary' : 'bg-brand-primary'
            }`}
          >
            {createBattle.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`font-bold text-base ${
                  !canSubmit ? 'text-text-muted' : 'text-background-primary'
                }`}
              >
                대결 만들기
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <GymPickerModal
        visible={showGymModal}
        gyms={allGyms ?? []}
        selectedId={gymId}
        onSelect={(picked) => { setGymId(picked); setShowGymModal(false); }}
        onClose={() => setShowGymModal(false)}
      />
    </SafeAreaView>
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
