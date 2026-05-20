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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { Chip } from '@/components/ui/chip';
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

const TYPE_OPTIONS: { value: MembershipType; label: string }[] = [
  { value: 'monthly', label: '월권' },
  { value: 'period', label: '기간권' },
  { value: 'passes', label: '다회권' },
  { value: 'single', label: '1일권' },
];

export default function EditMembershipScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useMembership(id);
  const updateMembership = useUpdateMembership();
  const deleteMembership = useDeleteMembership();
  const { data: allGyms } = useGyms();

  const [gymId, setGymId] = useState<string | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);
  const [type, setType] = useState<MembershipType>('monthly');
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [totalPasses, setTotalPasses] = useState<string>('10');
  const [usedPasses, setUsedPasses] = useState<string>('0');
  const [price, setPrice] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [prefilled, setPrefilled] = useState(false);

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
          {error?.message ?? '회원권을 찾을 수 없어요'}
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
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-2 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2" hitSlop={8}>
          <Text className="text-text-primary text-2xl">←</Text>
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold">
          회원권 수정
        </Text>
        <Pressable
          onPress={handleDelete}
          disabled={deleteMembership.isPending}
          className="p-2"
          hitSlop={8}
        >
          {deleteMembership.isPending ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-xl">🗑️</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="p-4 gap-6">
          <Section title="암장" required>
            <Chip
              label={
                selectedGym
                  ? `${selectedGym.name}${selectedGym.branch ? ` ${selectedGym.branch}` : ''}`
                  : '선택 안 됨'
              }
              selected={!!selectedGym}
              onPress={() => setShowGymModal(true)}
            />
          </Section>

          <Section title="시작일">
            <View className="px-3 py-2 rounded-md bg-background-secondary">
              <Text className="text-text-primary text-sm">{data.start_date}</Text>
            </View>
            <Text className="text-text-tertiary text-xs">시작일 변경은 v1.1</Text>
          </Section>

          <Section title="종류" required>
            <View className="flex-row flex-wrap gap-2">
              {TYPE_OPTIONS.map(({ value, label }) => (
                <Chip
                  key={value}
                  label={label}
                  selected={type === value}
                  onPress={() => setType(value)}
                />
              ))}
            </View>
          </Section>

          {(type === 'monthly' || type === 'period') && (
            <Section title="기간" required>
              <View className="flex-row flex-wrap gap-2">
                {DURATION_CHIPS.map(({ months, label }) => (
                  <Chip
                    key={months}
                    label={label}
                    selected={durationMonths === months}
                    onPress={() => setDurationMonths(months)}
                  />
                ))}
              </View>
              <Text className="text-text-tertiary text-xs">
                종료일: {addMonthsISO(data.start_date, durationMonths)}
              </Text>
            </Section>
          )}

          {type === 'passes' && (
            <>
              <Section title="총 횟수" required>
                <TextInput
                  value={totalPasses}
                  onChangeText={(t) => setTotalPasses(t.replace(/[^\d]/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
                />
              </Section>
              <Section title="사용한 횟수">
                <TextInput
                  value={usedPasses}
                  onChangeText={(t) => setUsedPasses(t.replace(/[^\d]/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
                />
                <Text className="text-text-tertiary text-xs">
                  실수로 차감한 경우 직접 조정하세요.
                </Text>
              </Section>
            </>
          )}

          <Section title="가격 (원)">
            <TextInput
              placeholder="선택"
              placeholderTextColor="#9CA3AF"
              value={price}
              onChangeText={(t) => setPrice(t.replace(/[^\d]/g, '').slice(0, 8))}
              keyboardType="number-pad"
              className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
            />
          </Section>

          <Section title="메모">
            <TextInput
              value={notes}
              onChangeText={(t) => setNotes(t.slice(0, 200))}
              maxLength={200}
              multiline
              className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base min-h-[60px]"
              style={{ textAlignVertical: 'top' }}
            />
          </Section>
        </ScrollView>

        <View className="px-4 pt-2 pb-2 border-t border-border-subtle">
          <Pressable
            onPress={handleSave}
            disabled={!canSubmit || updateMembership.isPending}
            className={`rounded-md p-4 items-center ${
              !canSubmit ? 'bg-background-tertiary' : 'bg-brand-primary'
            }`}
          >
            {updateMembership.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`font-semibold ${
                  !canSubmit ? 'text-text-muted' : 'text-background-primary'
                }`}
              >
                저장
              </Text>
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
