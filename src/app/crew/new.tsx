import { customAlert } from '@/components/ui/custom-alert';
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
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { Section } from '@/components/ui/section';
import { FormInput, FormPressable } from '@/components/ui/form';
import { BottomCTA } from '@/components/ui/bottom-cta';
import { CREW_REGION_OPTIONS, useCreateCrew, type CrewRegion } from '@/hooks/use-crews';
import { useGyms } from '@/hooks/use-gyms';
import { useThemeColors } from '@/lib/theme';

const NAME_MAX = 30;
const DESC_MAX = 200;

export default function NewCrewScreen() {

  const c = useThemeColors();  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createCrew = useCreateCrew();
  const { data: allGyms } = useGyms();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gymId, setGymId] = useState<string | null>(null);
  const [region, setRegion] = useState<CrewRegion | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);

  const selectedGym = useMemo(
    () => allGyms?.find((g) => g.id === gymId) ?? null,
    [allGyms, gymId],
  );

  const canSubmit = name.trim().length > 0 && !createCrew.isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      const { id } = await createCrew.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        homeGymId: gymId,
        region: region,
      });
      router.replace({ pathname: '/crew/[id]', params: { id } } as never);
    } catch (e) {
      customAlert('크루 생성 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <View className="flex-row items-center px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color={c.text.primary} />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold mr-6">
          크루 만들기
        </Text>
      </View>

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
          {/* 로고 placeholder */}
          <View className="items-center gap-2 pt-1">
            <View
              className="w-24 h-24 rounded-full bg-background-secondary border-2 border-border-subtle items-center justify-center"
              style={{ borderStyle: 'dashed' }}
            >
              <Feather name="users" size={28} color={c.text.muted} />
            </View>
            <Text className="text-text-tertiary text-xs">로고 업로드는 곧 추가됩니다</Text>
          </View>

          <Section title="이름" required icon="users">
            <FormInput
              placeholder="크루 이름 (최대 30자)"
              value={name}
              onChangeText={(t) => setName(t.slice(0, NAME_MAX))}
              maxLength={NAME_MAX}
            />
          </Section>

          <Section title="소개" icon="align-left">
            <FormInput
              placeholder="크루 소개 (최대 200자)"
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, DESC_MAX))}
              maxLength={DESC_MAX}
              multiline
            />
            <Text className="text-text-tertiary text-xs text-right">
              {description.length} / {DESC_MAX}
            </Text>
          </Section>

          <Section title="주요 활동지역" icon="map">
            <View className="flex-row flex-wrap gap-1.5">
              {CREW_REGION_OPTIONS.map((r) => {
                const active = region === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRegion(active ? null : r)}
                    className={`px-3 py-1.5 rounded-full border ${
                      active
                        ? 'bg-brand-primary border-brand-primary'
                        : 'bg-background-secondary border-border-subtle'
                    } active:opacity-80`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        active ? 'text-background-primary' : 'text-text-secondary'
                      }`}
                    >
                      {r}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="주 활동 암장" icon="map-pin">
            <FormPressable
              onPress={() => setShowGymModal(true)}
              leadingIcon="search"
              placeholder="암장 선택 (선택)"
              value={
                selectedGym
                  ? `${selectedGym.name}${selectedGym.branch ? ` ${selectedGym.branch}` : ''}`
                  : null
              }
              trailingNode={
                selectedGym ? (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setGymId(null);
                    }}
                    hitSlop={6}
                  >
                    <Feather name="x" size={16} color={c.text.muted} />
                  </Pressable>
                ) : undefined
              }
            />
          </Section>
        </ScrollView>

        <BottomCTA
          label="크루 만들기"
          icon="users"
          onPress={handleSubmit}
          loading={createCrew.isPending}
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
