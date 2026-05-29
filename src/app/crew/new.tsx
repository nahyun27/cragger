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
import { Feather } from '@expo/vector-icons';

import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { Section } from '@/components/ui/section';
import { useCreateCrew } from '@/hooks/use-crews';
import { useGyms } from '@/hooks/use-gyms';
import { useThemeColors } from '@/lib/theme';

const NAME_MAX = 30;
const DESC_MAX = 200;

export default function NewCrewScreen() {

  const c = useThemeColors();  const router = useRouter();
  const createCrew = useCreateCrew();
  const { data: allGyms } = useGyms();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gymId, setGymId] = useState<string | null>(null);
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
      });
      router.replace({ pathname: '/crew/[id]', params: { id } } as never);
    } catch (e) {
      Alert.alert('크루 생성 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
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
        <ScrollView contentContainerClassName="p-5 gap-6 pb-8" keyboardShouldPersistTaps="handled">
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

          <Section title="이름" required>
            <View className="flex-row items-center bg-background-secondary border border-border-subtle rounded-xl px-3.5">
              <TextInput
                placeholder="크루 이름 (최대 30자)"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={(t) => setName(t.slice(0, NAME_MAX))}
                maxLength={NAME_MAX}
                className="flex-1 py-3 text-text-primary text-base"
              />
            </View>
          </Section>

          <Section title="소개">
            <View className="bg-background-secondary border border-border-subtle rounded-xl px-3.5 py-2">
              <TextInput
                placeholder="크루 소개 (최대 200자)"
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={(t) => setDescription(t.slice(0, DESC_MAX))}
                maxLength={DESC_MAX}
                multiline
                textAlignVertical="top"
                className="text-text-primary text-base"
                style={{ minHeight: 80 }}
              />
              <Text className="text-text-tertiary text-xs text-right">
                {description.length} / {DESC_MAX}
              </Text>
            </View>
          </Section>

          <Section title="주 활동 암장">
            <Pressable
              onPress={() => setShowGymModal(true)}
              className="flex-row items-center justify-between bg-background-secondary border border-border-subtle rounded-xl px-3.5 py-3 active:opacity-70"
            >
              <View className="flex-row items-center gap-2 flex-1">
                <Feather name="search" size={16} color={c.text.tertiary} />
                <Text
                  className={`text-base ${
                    selectedGym ? 'text-text-primary font-semibold' : 'text-text-muted'
                  }`}
                  numberOfLines={1}
                >
                  {selectedGym
                    ? `${selectedGym.name}${selectedGym.branch ? ` ${selectedGym.branch}` : ''}`
                    : '암장 선택 (선택)'}
                </Text>
              </View>
              {selectedGym && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setGymId(null);
                  }}
                  hitSlop={6}
                >
                  <Feather name="x" size={16} color={c.text.muted} />
                </Pressable>
              )}
            </Pressable>
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
            {createCrew.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`font-bold text-base ${
                  !canSubmit ? 'text-text-muted' : 'text-background-primary'
                }`}
              >
                크루 만들기
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
