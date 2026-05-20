import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { Section } from '@/components/ui/section';
import { useGyms } from '@/hooks/use-gyms';
import {
  addMonthsISO,
  useDeleteMembership,
  useMembership,
  useUpdateMembership,
  type MembershipType,
} from '@/hooks/use-memberships';

const DURATION_CHIPS: { months: number; label: string }[] = [
  { months: 1, label: '1개월' },
  { months: 3, label: '3개월' },
  { months: 6, label: '6개월' },
  { months: 12, label: '12개월' },
];

export default function EditMembershipScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useMembership(id);
  const updateMembership = useUpdateMembership();
  const deleteMembership = useDeleteMembership();
  const { data: allGyms } = useGyms();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#fafafa' : '#18181b';

  const [gymId, setGymId] = useState<string | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);
  const [type, setType] = useState<MembershipType>('monthly');
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [totalPasses, setTotalPasses] = useState<string>('10');
  const [usedPasses, setUsedPasses] = useState<string>('0');
  const [price, setPrice] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [prefilled, setPrefilled] = useState(false);

  const [isTotalFocused, setIsTotalFocused] = useState(false);
  const [isUsedFocused, setIsUsedFocused] = useState(false);
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [isNotesFocused, setIsNotesFocused] = useState(false);

  useEffect(() => {
    if (prefilled || !data) return;
    setGymId(data.gym_id);
    setType(data.membership_type);
    setTotalPasses(data.total_passes != null ? String(data.total_passes) : '10');
    setUsedPasses(String(data.used_passes));
    setPrice(data.price_krw != null ? String(data.price_krw) : '');
    setNotes(data.notes ?? '');
    // 기간 추정: end_date - start_date 가 30/90/180/365 ± 약간이면 매핑
    if (data.end_date) {
      const start = new Date(`${data.start_date}T00:00:00`);
      const end = new Date(`${data.end_date}T00:00:00`);
      const months = Math.round(
        (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()),
      );
      const matched = DURATION_CHIPS.find((c) => c.months === months);
      setDurationMonths(matched ? matched.months : 1);
    }
    setPrefilled(true);
  }, [data, prefilled]);

  const selectedGym = useMemo(
    () => allGyms?.find((g) => g.id === gymId) ?? null,
    [allGyms, gymId],
  );

  const canSubmit = useMemo(() => {
    if (!gymId || !data) return false;
    if (type === 'passes') {
      const n = parseInt(totalPasses, 10);
      if (!Number.isFinite(n) || n < 1) return false;
      const u = parseInt(usedPasses, 10);
      if (!Number.isFinite(u) || u < 0 || u > n) return false;
    }
    return true;
  }, [gymId, type, totalPasses, usedPasses, data]);

  async function handleSave() {
    if (!id || !data || !gymId || !canSubmit || updateMembership.isPending) return;
    try {
      const priceNum = price.trim() ? parseInt(price.replace(/[^\d]/g, ''), 10) : null;
      const endDate =
        type === 'monthly' || type === 'period'
          ? addMonthsISO(data.start_date, durationMonths)
          : type === 'single'
            ? data.start_date
            : null;
      await updateMembership.mutateAsync({
        id,
        gymId,
        membershipType: type,
        startDate: data.start_date,
        endDate,
        totalPasses: type === 'passes' ? parseInt(totalPasses, 10) : null,
        usedPasses: type === 'passes' ? parseInt(usedPasses, 10) : 0,
        priceKrw: priceNum ?? null,
        notes: notes.trim() || null,
      });
      router.back();
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  function handleDelete() {
    if (!id || deleteMembership.isPending) return;
    Alert.alert('회원권을 삭제할까요?', '되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMembership.mutateAsync(id);
            router.replace('/(tabs)/profile');
          } catch (e) {
            Alert.alert('삭제 실패', e instanceof Error ? e.message : '알 수 없는 오류');
          }
        },
      },
    ]);
  }

  if (isLoading || !prefilled) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center"
        edges={['top', 'bottom']}
      >
        <ActivityIndicator size="large" color="#0d9488" />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center p-6"
        edges={['top', 'bottom']}
      >
        <Text className="text-status-danger text-center mb-4 text-base font-semibold">
          {error?.message ?? '회원권을 찾을 수 없어요'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="border border-border-default rounded-xl px-5 py-2.5 bg-background-secondary"
        >
          <Text className="text-text-primary font-semibold">돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border-subtle bg-background-primary justify-between">
        <Pressable
          onPress={() => router.back()}
          className="p-1.5 rounded-lg active:bg-background-secondary"
          hitSlop={8}
        >
          <Feather name="arrow-left" size={24} color={iconColor} />
        </Pressable>
        <Text className="text-text-primary text-lg font-bold text-center">
          회원권 수정
        </Text>
        <Pressable
          onPress={handleDelete}
          disabled={deleteMembership.isPending}
          className="p-1.5 rounded-lg active:bg-status-danger/10"
          hitSlop={8}
        >
          {deleteMembership.isPending ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Feather name="trash-2" size={22} color="#ef4444" />
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="p-5 gap-6">
          {/* Gym Section */}
          <Section title="암장" required>
            <Pressable
              onPress={() => setShowGymModal(true)}
              className="flex-row items-center justify-between border border-border-subtle bg-background-secondary rounded-xl py-3 px-4 active:bg-background-tertiary"
            >
              <View className="flex-row items-center gap-2">
                <Feather name="search" size={16} color="#71717a" />
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
              <Feather name="chevron-down" size={16} color="#71717a" />
            </Pressable>
          </Section>

          {/* Start Date Section (Read-Only Card) */}
          <Section title="시작일">
            <View className="px-4 py-3.5 rounded-xl bg-background-secondary border border-border-subtle flex-row items-center gap-2">
              <Feather name="calendar" size={16} color="#71717a" />
              <Text className="text-text-primary text-base font-semibold">{data.start_date}</Text>
            </View>
            <Text className="text-text-tertiary text-xs px-1 mt-0.5">
              시작일 변경은 v1.1에서 지원될 예정입니다.
            </Text>
          </Section>

          {/* Membership Type Section (2x2 Grid) */}
          <Section title="종류" required>
            <View className="flex-row gap-3">
              <View className="flex-1 gap-3">
                {/* Monthly */}
                <Pressable
                  onPress={() => setType('monthly')}
                  className={`p-4 rounded-2xl border gap-1.5 justify-center ${
                    type === 'monthly'
                      ? 'border-brand-primary bg-brand-primary/5'
                      : 'border-border-subtle bg-background-primary'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Feather
                        name="calendar"
                        size={18}
                        color={type === 'monthly' ? '#0d9488' : '#71717a'}
                      />
                      <Text
                        className={`text-base font-bold ${
                          type === 'monthly' ? 'text-brand-primary' : 'text-text-primary'
                        }`}
                      >
                        월 회원권
                      </Text>
                    </View>
                    {type === 'monthly' ? (
                      <View className="w-4 h-4 rounded-full bg-brand-primary items-center justify-center">
                        <Feather name="check" size={10} color="white" />
                      </View>
                    ) : (
                      <View className="w-4 h-4 rounded-full border border-border-default bg-background-primary" />
                    )}
                  </View>
                  <Text className="text-text-tertiary text-xs">정기 결제식 이용권</Text>
                </Pressable>

                {/* Passes */}
                <Pressable
                  onPress={() => setType('passes')}
                  className={`p-4 rounded-2xl border gap-1.5 justify-center ${
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
                        color={type === 'passes' ? '#0d9488' : '#71717a'}
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
                  <Text className="text-text-tertiary text-xs">횟수 차감 이용권</Text>
                </Pressable>
              </View>

              <View className="flex-1 gap-3">
                {/* Period */}
                <Pressable
                  onPress={() => setType('period')}
                  className={`p-4 rounded-2xl border gap-1.5 justify-center ${
                    type === 'period'
                      ? 'border-brand-primary bg-brand-primary/5'
                      : 'border-border-subtle bg-background-primary'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Feather
                        name="clock"
                        size={18}
                        color={type === 'period' ? '#0d9488' : '#71717a'}
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
                  <Text className="text-text-tertiary text-xs">일정 기간 지정형</Text>
                </Pressable>

                {/* Single */}
                <Pressable
                  onPress={() => setType('single')}
                  className={`p-4 rounded-2xl border gap-1.5 justify-center ${
                    type === 'single'
                      ? 'border-brand-primary bg-brand-primary/5'
                      : 'border-border-subtle bg-background-primary'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Feather
                        name="tag"
                        size={18}
                        color={type === 'single' ? '#0d9488' : '#71717a'}
                      />
                      <Text
                        className={`text-base font-bold ${
                          type === 'single' ? 'text-brand-primary' : 'text-text-primary'
                        }`}
                      >
                        1일권
                      </Text>
                    </View>
                    {type === 'single' ? (
                      <View className="w-4 h-4 rounded-full bg-brand-primary items-center justify-center">
                        <Feather name="check" size={10} color="white" />
                      </View>
                    ) : (
                      <View className="w-4 h-4 rounded-full border border-border-default bg-background-primary" />
                    )}
                  </View>
                  <Text className="text-text-tertiary text-xs">단일 방문용 이용권</Text>
                </Pressable>
              </View>
            </View>
          </Section>

          {/* Duration Section */}
          {(type === 'monthly' || type === 'period') && (
            <Section title="기간" required>
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
                <Feather name="info" size={14} color="#0d9488" />
                <Text className="text-brand-primary text-xs font-semibold">
                  선택 시 종료일: {addMonthsISO(data.start_date, durationMonths)}
                </Text>
              </View>
            </Section>
          )}

          {/* Passes Inputs (Horizontal 2 Columns) */}
          {type === 'passes' && (
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Section title="총 횟수" required>
                  <TextInput
                    placeholder="10"
                    placeholderTextColor="#a1a1aa"
                    value={totalPasses}
                    onChangeText={(t) => setTotalPasses(t.replace(/[^\d]/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    onFocus={() => setIsTotalFocused(true)}
                    onBlur={() => setIsTotalFocused(false)}
                    className={`border rounded-xl px-3.5 py-2.5 text-text-primary text-base ${
                      isTotalFocused
                        ? 'border-brand-primary bg-background-primary'
                        : 'border-border-subtle bg-background-secondary'
                    }`}
                  />
                </Section>
              </View>
              <View className="flex-1">
                <Section title="사용한 횟수">
                  <TextInput
                    placeholder="0"
                    placeholderTextColor="#a1a1aa"
                    value={usedPasses}
                    onChangeText={(t) => setUsedPasses(t.replace(/[^\d]/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    onFocus={() => setIsUsedFocused(true)}
                    onBlur={() => setIsUsedFocused(false)}
                    className={`border rounded-xl px-3.5 py-2.5 text-text-primary text-base ${
                      isUsedFocused
                        ? 'border-brand-primary bg-background-primary'
                        : 'border-border-subtle bg-background-secondary'
                    }`}
                  />
                </Section>
              </View>
            </View>
          )}

          {/* Price Section */}
          <Section title="가격 (원)">
            <View
              className={`flex-row items-center border rounded-xl px-3.5 py-1.5 ${
                isPriceFocused
                  ? 'border-brand-primary bg-background-primary'
                  : 'border-border-subtle bg-background-secondary'
              }`}
            >
              <Text className="text-text-muted text-base mr-1.5">₩</Text>
              <TextInput
                placeholder="선택 사항"
                placeholderTextColor="#a1a1aa"
                value={price}
                onChangeText={(t) => setPrice(t.replace(/[^\d]/g, '').slice(0, 8))}
                keyboardType="number-pad"
                onFocus={() => setIsPriceFocused(true)}
                onBlur={() => setIsPriceFocused(false)}
                className="flex-1 text-text-primary text-base py-1 outline-none"
              />
            </View>
          </Section>

          {/* Notes Section */}
          <Section title="메모">
            <View
              className={`border rounded-xl px-3.5 py-2.5 min-h-[80px] relative ${
                isNotesFocused
                  ? 'border-brand-primary bg-background-primary'
                  : 'border-border-subtle bg-background-secondary'
              }`}
            >
              <TextInput
                placeholder="메모를 입력해 주세요 (선택 사항)"
                placeholderTextColor="#a1a1aa"
                value={notes}
                onChangeText={(t) => setNotes(t.slice(0, 200))}
                maxLength={200}
                multiline
                onFocus={() => setIsNotesFocused(true)}
                onBlur={() => setIsNotesFocused(false)}
                className="text-text-primary text-base outline-none w-full"
                style={{ textAlignVertical: 'top', height: 60 }}
              />
              <Text className="absolute right-3.5 bottom-2.5 text-text-muted text-[10px] font-semibold">
                {notes.length} / 200
              </Text>
            </View>
          </Section>
        </ScrollView>

        {/* Save Button */}
        <View className="px-5 pt-3 pb-6 border-t border-border-subtle bg-background-primary">
          <Pressable
            onPress={handleSave}
            disabled={!canSubmit || updateMembership.isPending}
            style={({ pressed }) => [
              {
                transform: [{ scale: pressed && canSubmit ? 0.98 : 1 }],
                opacity: pressed && canSubmit ? 0.9 : 1,
              },
            ]}
            className={`rounded-xl p-4 items-center justify-center flex-row gap-2 elevation-sm ${
              !canSubmit ? 'bg-background-tertiary' : 'bg-brand-primary'
            }`}
          >
            {updateMembership.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Feather
                  name="check-circle"
                  size={18}
                  color={!canSubmit ? '#a1a1aa' : '#ffffff'}
                />
                <Text
                  className={`font-bold text-base ${
                    !canSubmit ? 'text-text-muted' : 'text-background-primary'
                  }`}
                >
                  저장하기
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

    <GymPickerModal
      visible={showGymModal}
      gyms={allGyms ?? []}
      selectedId={gymId}
      onSelect={(pickedId) => {
        setGymId(pickedId);
        setShowGymModal(false);
      }}
      onClose={() => setShowGymModal(false)}
    />
  </SafeAreaView>
);
}

