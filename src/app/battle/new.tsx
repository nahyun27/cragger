import { customAlert } from '@/components/ui/custom-alert';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { Section } from '@/components/ui/section';
import { useThemeColors } from '@/lib/theme';
import {
  useCreateBattle,
  useLookupCrewForBattle,
  type BattleType,
} from '@/hooks/use-battles';

const TITLE_MAX = 40;

function endOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(23, 59, 59, 0);
  return n;
}

export default function NewBattleScreen() {

  const c = useThemeColors();  const router = useRouter();
  const { crewId } = useLocalSearchParams<{ crewId: string }>();
  const createBattle = useCreateBattle();

  const [battleType, setBattleType] = useState<BattleType>('individual');
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [endsAt, setEndsAt] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return endOfDay(d);
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [opponentCode, setOpponentCode] = useState('');
  const opponentCodeUpper = opponentCode.trim().toUpperCase();
  const opponentLookup = useLookupCrewForBattle(opponentCodeUpper);

  const opponentReady =
    battleType !== 'crew_vs_crew' ||
    (opponentLookup.data != null && opponentLookup.data.id !== crewId);

  const canSubmit =
    title.trim().length > 0 &&
    endsAt.getTime() > startsAt.getTime() &&
    opponentReady &&
    !createBattle.isPending;

  async function handleSubmit() {
    if (!canSubmit || !crewId) return;
    try {
      const { id } = await createBattle.mutateAsync({
        battleType,
        title: title.trim(),
        crewId,
        opponentCrewId:
          battleType === 'crew_vs_crew' ? opponentLookup.data?.id ?? null : null,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
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
            <View className="flex-row gap-2">
              <TypeBtn
                label="크루 내 개인전"
                desc="멤버끼리 점수 경쟁"
                active={battleType === 'individual'}
                onPress={() => setBattleType('individual')}
              />
              <TypeBtn
                label="크루 vs 크루"
                desc="총점 대결"
                active={battleType === 'crew_vs_crew'}
                onPress={() => setBattleType('crew_vs_crew')}
              />
            </View>
          </Section>

          <Section title="제목" required>
            <View className="bg-background-secondary border border-border-subtle rounded-xl px-3.5">
              <TextInput
                placeholder="예: 11월 주간 대결"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={(t) => setTitle(t.slice(0, TITLE_MAX))}
                maxLength={TITLE_MAX}
                className="py-3 text-text-primary text-base"
              />
            </View>
          </Section>

          <Section title="기간" required>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setShowStartPicker(true)}
                className="flex-1 bg-background-secondary border border-border-subtle rounded-xl px-3.5 py-3 active:opacity-70"
              >
                <Text className="text-text-tertiary text-xs font-semibold">시작</Text>
                <Text className="text-text-primary text-sm font-bold mt-1">
                  {formatDate(startsAt)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowEndPicker(true)}
                className="flex-1 bg-background-secondary border border-border-subtle rounded-xl px-3.5 py-3 active:opacity-70"
              >
                <Text className="text-text-tertiary text-xs font-semibold">종료</Text>
                <Text className="text-text-primary text-sm font-bold mt-1">
                  {formatDate(endsAt)}
                </Text>
              </Pressable>
            </View>
            {showStartPicker && (
              <RnDatePicker
                value={startsAt}
                onChange={(d) => {
                  setStartsAt(d);
                  setShowStartPicker(false);
                }}
                onClose={() => setShowStartPicker(false)}
              />
            )}
            {showEndPicker && (
              <RnDatePicker
                value={endsAt}
                onChange={(d) => {
                  setEndsAt(endOfDay(d));
                  setShowEndPicker(false);
                }}
                onClose={() => setShowEndPicker(false)}
              />
            )}
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
                          멤버 {opponentLookup.data.member_count}명 · 상대 크루장
                          수락 후 시작
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
    </SafeAreaView>
  );
}

function TypeBtn({
  label,
  desc,
  active,
  onPress,
}: {
  label: string;
  desc: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      {({ pressed }) => (
        <View
          style={{
            paddingVertical: 14,
            paddingHorizontal: 12,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: active ? '#06b6d4' : '#e2e8f0',
            backgroundColor: active ? '#ecfeff' : '#ffffff',
            opacity: pressed ? 0.85 : 1,
            gap: 4,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '800',
              color: active ? '#0e7490' : '#475569',
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: active ? '#0e7490' : '#94a3b8',
            }}
          >
            {desc}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function RnDatePicker({
  value,
  onChange,
  onClose,
}: {
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
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
  return `${y}.${m}.${day}`;
}
