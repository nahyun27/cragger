import { customAlert } from '@/components/ui/custom-alert';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from '@/lib/router';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MultiGymPickerField } from '@/components/gym/multi-gym-picker-field';
import { Section } from '@/components/ui/section';
import { FormInput } from '@/components/ui/form';
import { BottomCTA } from '@/components/ui/bottom-cta';
import { useGyms } from '@/hooks/use-gyms';
import { useThemeColors } from '@/lib/theme';
import {
  addMonthsISO,
  useDeleteMembership,
  useMembership,
  useMembershipUsage,
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

  const c = useThemeColors();  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error } = useMembership(id);
  const updateMembership = useUpdateMembership();
  const deleteMembership = useDeleteMembership();
  const { data: allGyms } = useGyms();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#f8fafc' : '#0f172a';

  const [gymIds, setGymIds] = useState<string[]>([]);
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<MembershipType>('period');
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
    setGymIds(data.gym_ids?.length ? data.gym_ids : [data.gym_id]);
    setName(data.name ?? '');
    // 월/1일권 레거시 값은 UI상 '기간권'으로 통합
    setType(
      data.membership_type === 'passes' ? 'passes' : 'period',
    );
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


  const canSubmit = useMemo(() => {
    if (gymIds.length === 0 || !data) return false;
    if (type === 'passes') {
      const n = parseInt(totalPasses, 10);
      if (!Number.isFinite(n) || n < 1) return false;
      const u = parseInt(usedPasses, 10);
      if (!Number.isFinite(u) || u < 0 || u > n) return false;
    }
    return true;
  }, [gymIds, type, totalPasses, usedPasses, data]);

  async function handleSave() {
    if (!id || !data || !canSubmit || updateMembership.isPending) return;
    try {
      const priceNum = price.trim() ? parseInt(price.replace(/[^\d]/g, ''), 10) : null;
      const endDate =
        type === 'period' ? addMonthsISO(data.start_date, durationMonths) : null;
      const firstGym = allGyms?.find((g) => g.id === gymIds[0]);
      const firstGymLabel = firstGym
        ? `${firstGym.name}${firstGym.branch ? ` ${firstGym.branch}` : ''}`
        : '암장';
      const gymName = name.trim()
        ? name.trim()
        : gymIds.length > 1
        ? `${firstGymLabel} 외 ${gymIds.length - 1}곳`
        : firstGymLabel;
      await updateMembership.mutateAsync({
        id,
        gymIds,
        gymName,
        name: name.trim() || null,
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
      customAlert('저장 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  function handleDelete() {
    if (!id || deleteMembership.isPending) return;
    customAlert('회원권을 삭제할까요?', '되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMembership.mutateAsync(id);
            router.replace('/(tabs)/profile');
          } catch (e) {
            customAlert('삭제 실패', e instanceof Error ? e.message : '알 수 없는 오류');
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
        <ActivityIndicator size="large" color={c.brand.primary} />
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
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
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
            <ActivityIndicator size="small" color={c.status.danger} />
          ) : (
            <Feather name="trash-2" size={22} color={c.status.danger} />
          )}
        </Pressable>
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
          {/* 이름 (옵션) */}
          <Section title="이름" icon="tag">
            <Text className="text-text-tertiary text-[11px] font-semibold mb-2">
              선택 — 연합 패스 별칭 (예: T-pass)
            </Text>
            <FormInput
              placeholder="예: T-pass"
              value={name}
              onChangeText={(t) => setName(t.slice(0, 30))}
              maxLength={30}
            />
          </Section>

          {/* Gym Section — 다중 선택 */}
          <Section title="암장" required icon="map-pin">
            <Text className="text-text-tertiary text-[11px] font-semibold mb-2">
              여러 지점 이용 가능한 패스면 모두 추가하세요
            </Text>
            <MultiGymPickerField value={gymIds} onChange={setGymIds} />
          </Section>

          {/* Start Date Section (Read-Only Card) */}
          <Section title="시작일" icon="calendar">
            <View className="px-4 py-3.5 rounded-xl bg-background-secondary border border-border-subtle flex-row items-center gap-2">
              <Feather name="calendar" size={16} color={c.text.tertiary} />
              <Text className="text-text-primary text-base font-semibold">{data.start_date}</Text>
            </View>
            <Text className="text-text-tertiary text-xs px-1 mt-0.5">
              시작일 변경은 v1.1에서 지원될 예정입니다.
            </Text>
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
                  선택 시 종료일: {addMonthsISO(data.start_date, durationMonths)}
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
                <Section title="사용한 횟수" icon="check">
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

          {/* Usage History — sessions linked to this membership */}
          <UsageHistorySection membershipId={id} />
        </ScrollView>

        <BottomCTA
          label="저장하기"
          icon="check-circle"
          onPress={handleSave}
          loading={updateMembership.isPending}
          disabled={!canSubmit}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
);
}

// 사용 이력 — 이 회원권에 연결된 세션 목록
function UsageHistorySection({ membershipId }: { membershipId: string | undefined }) {
  const c = useThemeColors();
  const router = useRouter();
  const { data: usage, isLoading } = useMembershipUsage(membershipId);

  return (
    <Section title="사용 이력" icon="clock">
      {isLoading ? (
        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
          <ActivityIndicator color={c.brand.primary} />
        </View>
      ) : !usage || usage.length === 0 ? (
        <View
          style={{
            paddingVertical: 18,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: c.border.subtle,
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Feather name="inbox" size={18} color={c.text.muted} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: c.text.tertiary }}>
            아직 연결된 기록이 없어요
          </Text>
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          {usage.map((u) => (
            <Pressable
              key={u.session_id}
              onPress={() =>
                router.push({
                  pathname: '/session/[id]',
                  params: { id: u.session_id },
                })
              }
            >
              {({ pressed }) => (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: c.border.subtle,
                    backgroundColor: pressed ? c.bg.subtle : c.bg.card,
                  }}
                >
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: c.bg.subtle,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '900',
                        color: c.text.secondary,
                        letterSpacing: -0.2,
                      }}
                    >
                      {u.session_date.slice(5).replace('-', '.')}
                    </Text>
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: '800',
                      color: c.text.primary,
                      letterSpacing: -0.2,
                    }}
                    numberOfLines={1}
                  >
                    {u.gym
                      ? `${u.gym.name}${u.gym.branch ? ` ${u.gym.branch}` : ''}`
                      : '암장 미선택'}
                  </Text>
                  {u.send_count > 0 && (
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: c.brand.primaryDeep,
                      }}
                    >
                      완등 {u.send_count}
                    </Text>
                  )}
                  <Feather name="chevron-right" size={14} color={c.text.muted} />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </Section>
  );
}

