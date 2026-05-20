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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { Chip } from '@/components/ui/chip';
import { Section } from '@/components/ui/section';
import { useGyms } from '@/hooks/use-gyms';
import {
  addMonthsISO,
  todayISO,
  useCreateMembership,
  type MembershipType,
} from '@/hooks/use-memberships';
import { useRecentGyms } from '@/hooks/use-recent-gyms';

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

const TYPE_OPTIONS: { value: MembershipType; label: string; hint: string }[] = [
  { value: 'monthly', label: '월권', hint: '기간 만료식' },
  { value: 'period', label: '기간권', hint: '명시적 시작/종료' },
  { value: 'passes', label: '다회권', hint: 'N회 차감' },
  { value: 'single', label: '1일권', hint: '한 번 방문' },
];

export default function NewMembershipScreen() {
  const router = useRouter();
  const createMembership = useCreateMembership();

  const [startChoice, setStartChoice] = useState<StartDateChoice>('today');
  const [gymId, setGymId] = useState<string | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);
  const [type, setType] = useState<MembershipType>('monthly');
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [totalPasses, setTotalPasses] = useState<string>('10');
  const [usedPasses, setUsedPasses] = useState<string>('0');
  const [price, setPrice] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const { data: recentGyms } = useRecentGyms();
  const { data: allGyms } = useGyms();
  const selectedGym = useMemo(
    () => allGyms?.find((g) => g.id === gymId) ?? null,
    [allGyms, gymId],
  );

  const startDate = startDateForChoice(startChoice);
  const computedEndDate = useMemo(() => {
    if (type === 'monthly' || type === 'period') {
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
        endDate:
          type === 'monthly' || type === 'period'
            ? computedEndDate
            : type === 'single'
              ? startDate
              : null,
        totalPasses: type === 'passes' ? parseInt(totalPasses, 10) : null,
        usedPasses: type === 'passes' ? parseInt(usedPasses, 10) : 0,
        priceKrw: priceNum ?? null,
        notes: notes.trim() || null,
      });
      router.replace('/(tabs)/profile');
    } catch (e) {
      Alert.alert('회원권 추가 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-2 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2" hitSlop={8}>
          <Text className="text-text-primary text-2xl">←</Text>
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold">
          회원권 추가
        </Text>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="p-4 gap-6">
          <Section title="암장" required>
            <View className="flex-row flex-wrap gap-2">
              <Chip label="🔍 장소 검색" selected={false} onPress={() => setShowGymModal(true)} />
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
                </Text>
              </View>
            )}
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
            <Text className="text-text-tertiary text-xs">
              {TYPE_OPTIONS.find((t) => t.value === type)?.hint}
            </Text>
          </Section>

          <Section title="시작일" required>
            <View className="flex-row gap-2">
              {START_CHIPS.map(({ value, label }) => (
                <Chip
                  key={value}
                  label={label}
                  selected={startChoice === value}
                  onPress={() => setStartChoice(value)}
                />
              ))}
              <Chip
                label="더 이전"
                selected={false}
                onPress={() =>
                  Alert.alert('준비 중', '그저께 이전 시작일은 v1.1에서 추가됩니다.')
                }
              />
            </View>
            <Text className="text-text-tertiary text-xs">{startDate}</Text>
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
                종료일: {computedEndDate}
              </Text>
            </Section>
          )}

          {type === 'passes' && (
            <>
              <Section title="총 횟수" required>
                <TextInput
                  placeholder="10"
                  placeholderTextColor="#9CA3AF"
                  value={totalPasses}
                  onChangeText={(t) => setTotalPasses(t.replace(/[^\d]/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
                />
              </Section>
              <Section title="이미 사용한 횟수">
                <TextInput
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  value={usedPasses}
                  onChangeText={(t) => setUsedPasses(t.replace(/[^\d]/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
                />
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
              placeholder="선택 (최대 200자)"
              placeholderTextColor="#9CA3AF"
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
            onPress={handleSubmit}
            disabled={!canSubmit || createMembership.isPending}
            className={`rounded-md p-4 items-center ${
              !canSubmit ? 'bg-background-tertiary' : 'bg-brand-primary'
            }`}
          >
            {createMembership.isPending ? (
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
        onSelect={(id) => {
          setGymId(id);
          setShowGymModal(false);
        }}
        onClose={() => setShowGymModal(false)}
      />
    </SafeAreaView>
  );
}
