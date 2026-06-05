import { customAlert } from '@/components/ui/custom-alert';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  useColorScheme,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { Section } from '@/components/ui/section';
import { FormInput } from '@/components/ui/form';
import { BottomCTA } from '@/components/ui/bottom-cta';
import { useFavoriteGymIds } from '@/hooks/use-favorites';
import { useGyms } from '@/hooks/use-gyms';
import {
  addMonthsISO,
  useCreateMembership,
  type MembershipType,
} from '@/hooks/use-memberships';
import { useRecentGyms } from '@/hooks/use-recent-gyms';
import { useThemeColors } from '@/lib/theme';

type StartDateChoice = 'today' | 'yesterday' | 'day_before';
const START_CHIPS: { value: StartDateChoice; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: 'yesterday', label: '어제' },
  { value: 'day_before', label: '그저께' },
];

function startDateForChoice(choice: StartDateChoice): string {
  const d = new Date();
  if (choice === 'yesterday') d.setDate(d.getDate() - 1);
  if (choice === 'day_before') d.setDate(d.getDate() - 2);
  return d.toISOString().slice(0, 10);
}

const DURATION_CHIPS: { months: number; label: string }[] = [
  { months: 1, label: '1개월' },
  { months: 3, label: '3개월' },
  { months: 6, label: '6개월' },
  { months: 12, label: '12개월' },
];

export default function NewMembershipScreen() {

  const c = useThemeColors();  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createMembership = useCreateMembership();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#f8fafc' : '#0f172a';

  const [startChoice, setStartChoice] = useState<StartDateChoice>('today');
  const [gymId, setGymId] = useState<string | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);
  const [type, setType] = useState<MembershipType>('period');
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [totalPasses, setTotalPasses] = useState<string>('10');
  const [usedPasses, setUsedPasses] = useState<string>('0');
  const [price, setPrice] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isTotalFocused, setIsTotalFocused] = useState(false);
  const [isUsedFocused, setIsUsedFocused] = useState(false);
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [isNotesFocused, setIsNotesFocused] = useState(false);

  const { data: recentGyms } = useRecentGyms();
  const { data: allGyms } = useGyms();
  const { data: favoriteIds } = useFavoriteGymIds();
  const selectedGym = useMemo(
    () => allGyms?.find((g) => g.id === gymId) ?? null,
    [allGyms, gymId],
  );

  // 즐겨찾기한 최근 암장 우선 정렬.
  const sortedRecentGyms = useMemo(() => {
    if (!recentGyms) return recentGyms;
    if (!favoriteIds || favoriteIds.size === 0) return recentGyms;
    const favs: typeof recentGyms = [];
    const rest: typeof recentGyms = [];
    for (const g of recentGyms) {
      (favoriteIds.has(g.id) ? favs : rest).push(g);
    }
    return [...favs, ...rest];
  }, [recentGyms, favoriteIds]);

  const startDate = startDateForChoice(startChoice);
  const computedEndDate = useMemo(() => {
    if (type === 'period') {
      return addMonthsISO(startDate, durationMonths);
    }
    return null;
  }, [type, startDate, durationMonths]);

  const canSubmit = useMemo(() => {
    if (!gymId) return false;
    if (type === 'passes') {
      const n = parseInt(totalPasses, 10);
      if (!Number.isFinite(n) || n < 1) return false;
      const u = parseInt(usedPasses, 10);
      if (!Number.isFinite(u) || u < 0 || u > n) return false;
    }
    return true;
  }, [gymId, type, totalPasses, usedPasses]);

  async function handleSubmit() {
    if (!gymId || !canSubmit || createMembership.isPending) return;
    try {
      const priceNum = price.trim() ? parseInt(price.replace(/[^\d]/g, ''), 10) : null;
      await createMembership.mutateAsync({
        gymId,
        membershipType: type,
        startDate,
        endDate: type === 'period' ? computedEndDate : null,
        totalPasses: type === 'passes' ? parseInt(totalPasses, 10) : null,
        usedPasses: type === 'passes' ? parseInt(usedPasses, 10) : 0,
        priceKrw: priceNum ?? null,
        notes: notes.trim() || null,
      });
      router.replace('/(tabs)/profile');
    } catch (e) {
      customAlert('회원권 추가 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border-subtle bg-background-primary">
        <Pressable
          onPress={() => router.back()}
          className="p-1.5 rounded-lg active:bg-background-secondary"
          hitSlop={8}
        >
          <Feather name="arrow-left" size={24} color={iconColor} />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-lg font-bold mr-8">
          회원권 추가
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="p-5 gap-6"
          contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
        >
          {/* Gym Section */}
          <Section title="암장" required icon="map-pin">
            <Pressable
              onPress={() => setShowGymModal(true)}
              className="flex-row items-center justify-between border border-border-subtle bg-background-secondary rounded-xl py-3 px-4 active:bg-background-tertiary"
            >
              <View className="flex-row items-center gap-2">
                <Feather name="search" size={16} color={c.text.tertiary} />
                <Text
                  className={`text-base ${
                    selectedGym ? 'text-text-primary font-semibold' : 'text-text-muted'
                  }`}
                >
                  {selectedGym
                    ? `${selectedGym.name}${selectedGym.branch ? ` ${selectedGym.branch}` : ''}`
                    : '암장을 선택해주세요'}
                </Text>
              </View>
              <Feather name="chevron-down" size={16} color={c.text.tertiary} />
            </Pressable>

            {sortedRecentGyms && sortedRecentGyms.length > 0 && (
              <View className="mt-3 gap-1.5">
                <Text className="text-text-tertiary text-xs font-semibold px-0.5">
                  최근 방문한 암장
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2"
                >
                  {sortedRecentGyms.map((g) => {
                    const isSelected = gymId === g.id;
                    return (
                      <Pressable
                        key={g.id}
                        onPress={() => setGymId(g.id)}
                        className={`px-3.5 py-2 rounded-full border ${
                          isSelected
                            ? 'border-brand-primary bg-brand-primary/10'
                            : 'border-border-subtle bg-background-primary'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isSelected ? 'text-brand-primary' : 'text-text-secondary'
                          }`}
                        >
                          {g.name}
                          {g.branch ? ` ${g.branch}` : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </Section>

          {/* Membership Type Section */}
          <Section title="종류" required icon="tag">
            <View className="flex-row gap-3">
              {/* Period (기간권) */}
              <Pressable
                onPress={() => setType('period')}
                className={`flex-1 p-4 rounded-2xl border gap-1.5 justify-center ${
                  type === 'period'
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-border-subtle bg-background-primary'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Feather
                      name="calendar"
                      size={18}
                      color={type === 'period' ? '#06b6d4' : '#64748b'}
                    />
                    <Text
                      className={`text-base font-bold ${
                        type === 'period' ? 'text-brand-primary' : 'text-text-primary'
                      }`}
                    >
                      기간권
                    </Text>
                  </View>
                  {type === 'period' ? (
                    <View className="w-4 h-4 rounded-full bg-brand-primary items-center justify-center">
                      <Feather name="check" size={10} color="white" />
                    </View>
                  ) : (
                    <View className="w-4 h-4 rounded-full border border-border-default bg-background-primary" />
                  )}
                </View>
                <Text className="text-text-tertiary text-xs">기간 동안 무제한</Text>
              </Pressable>

              {/* Passes (다회권) */}
              <Pressable
                onPress={() => setType('passes')}
                className={`flex-1 p-4 rounded-2xl border gap-1.5 justify-center ${
                  type === 'passes'
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-border-subtle bg-background-primary'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Feather
                      name="layers"
                      size={18}
                      color={type === 'passes' ? '#06b6d4' : '#64748b'}
                    />
                    <Text
                      className={`text-base font-bold ${
                        type === 'passes' ? 'text-brand-primary' : 'text-text-primary'
                      }`}
                    >
                      다회권
                    </Text>
                  </View>
                  {type === 'passes' ? (
                    <View className="w-4 h-4 rounded-full bg-brand-primary items-center justify-center">
                      <Feather name="check" size={10} color="white" />
                    </View>
                  ) : (
                    <View className="w-4 h-4 rounded-full border border-border-default bg-background-primary" />
                  )}
                </View>
                <Text className="text-text-tertiary text-xs">횟수 차감</Text>
              </Pressable>
            </View>
          </Section>

          {/* Start Date Section */}
          <Section title="시작일" required icon="calendar">
            <View className="flex-row gap-2">
              {START_CHIPS.map(({ value, label }) => {
                const isSelected = startChoice === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setStartChoice(value)}
                    className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary/10'
                        : 'border-border-subtle bg-background-primary'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        isSelected ? 'text-brand-primary' : 'text-text-secondary'
                      }`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => customAlert('준비 중', '그저께 이전 시작일은 v1.1에서 추가됩니다.')}
                className="px-4 py-2.5 rounded-xl border border-border-subtle bg-background-primary items-center justify-center"
              >
                <Text className="text-text-muted text-sm font-semibold">더 이전</Text>
              </Pressable>
            </View>

            <View className="flex-row items-center gap-1.5 mt-1 px-1">
              <Feather name="calendar" size={12} color={c.text.tertiary} />
              <Text className="text-text-tertiary text-xs font-semibold">
                지정일: {startDate}
              </Text>
            </View>
          </Section>

          {/* Duration Section */}
          {type === 'period' && (
            <Section title="기간" required icon="clock">
              <View className="flex-row gap-2">
                {DURATION_CHIPS.map(({ months, label }) => {
                  const isSelected = durationMonths === months;
                  return (
                    <Pressable
                      key={months}
                      onPress={() => setDurationMonths(months)}
                      className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                        isSelected
                          ? 'border-brand-primary bg-brand-primary/10'
                          : 'border-border-subtle bg-background-primary'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          isSelected ? 'text-brand-primary' : 'text-text-secondary'
                        }`}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="mt-1 flex-row items-center gap-1.5 bg-brand-primary/5 p-3 rounded-xl border border-brand-primary/10">
                <Feather name="info" size={14} color={c.brand.primary} />
                <Text className="text-brand-primary text-xs font-semibold">
                  선택 시 종료일: {computedEndDate}
                </Text>
              </View>
            </Section>
          )}

          {/* Passes Inputs (Horizontal 2 Columns) */}
          {type === 'passes' && (
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Section title="총 횟수" required icon="hash">
                  <FormInput
                    placeholder="10"
                    value={totalPasses}
                    onChangeText={(t) => setTotalPasses(t.replace(/[^\d]/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    trailingUnit="회"
                  />
                </Section>
              </View>
              <View className="flex-1">
                <Section title="이미 사용한 횟수" icon="check">
                  <FormInput
                    placeholder="0"
                    value={usedPasses}
                    onChangeText={(t) => setUsedPasses(t.replace(/[^\d]/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    trailingUnit="회"
                  />
                </Section>
              </View>
            </View>
          )}

          {/* Price Section */}
          <Section title="가격" icon="dollar-sign">
            <FormInput
              leadingText="₩"
              placeholder="선택 사항"
              value={price}
              onChangeText={(t) => setPrice(t.replace(/[^\d]/g, '').slice(0, 8))}
              keyboardType="number-pad"
            />
          </Section>

          {/* Notes Section */}
          <Section title="메모" icon="message-square">
            <FormInput
              placeholder="메모를 입력해 주세요 (선택 사항)"
              value={notes}
              onChangeText={(t) => setNotes(t.slice(0, 200))}
              maxLength={200}
              multiline
            />
            <Text className="text-text-muted text-[10px] font-semibold text-right">
              {notes.length} / 200
            </Text>
          </Section>
        </ScrollView>

        <BottomCTA
          label="저장하기"
          icon="check-circle"
          onPress={handleSubmit}
          loading={createMembership.isPending}
          disabled={!canSubmit}
        />
      </KeyboardAvoidingView>

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

