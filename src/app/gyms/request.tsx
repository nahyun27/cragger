import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { z } from 'zod';

import { Section } from '@/components/ui/section';
import { useSubmitGymRequest } from '@/hooks/use-gym-requests';

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '암장 이름은 필수에요')
    .max(100, '암장 이름은 100자 이하로 적어주세요'),
  branch: z.string().trim().max(50, '지점은 50자 이하').optional().or(z.literal('')),
  locationHint: z.string().trim().max(100, '위치는 100자 이하').optional().or(z.literal('')),
  note: z.string().trim().max(300, '메모는 300자 이하').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function GymRequestScreen() {
  const router = useRouter();
  const submit = useSubmitGymRequest();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', branch: '', locationHint: '', note: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await submit.mutateAsync({
        name: values.name,
        branch: values.branch?.trim() || null,
        locationHint: values.locationHint?.trim() || null,
        note: values.note?.trim() || null,
      });
      Alert.alert('요청 보냈어요', '검토 후 암장 목록에 추가됩니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('요청 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-2 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2" hitSlop={8}>
          <Text className="text-text-primary text-2xl">←</Text>
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold">
          암장 추가 요청
        </Text>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="p-4 gap-5">
          <Text className="text-text-tertiary text-sm">
            찾는 암장이 없으면 알려주세요. 검토 후 목록에 추가됩니다.
          </Text>

          <Section title="암장 이름" required>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <View>
                  <TextInput
                    placeholder="예: 더클라임"
                    placeholderTextColor="#9CA3AF"
                    value={value}
                    onChangeText={onChange}
                    autoCorrect={false}
                    className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
                  />
                  {errors.name && (
                    <Text className="text-status-danger text-sm mt-1">
                      {errors.name.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </Section>

          <Section title="지점">
            <Controller
              control={control}
              name="branch"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  placeholder="예: 양재점 (선택)"
                  placeholderTextColor="#9CA3AF"
                  value={value}
                  onChangeText={onChange}
                  autoCorrect={false}
                  className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
                />
              )}
            />
          </Section>

          <Section title="위치">
            <Controller
              control={control}
              name="locationHint"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  placeholder="예: 강남역 근처, 인천 송도 (선택)"
                  placeholderTextColor="#9CA3AF"
                  value={value}
                  onChangeText={onChange}
                  autoCorrect={false}
                  className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
                />
              )}
            />
          </Section>

          <Section title="메모">
            <Controller
              control={control}
              name="note"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  placeholder="시설·운영시간·인스타 핸들 등 (선택, 최대 300자)"
                  placeholderTextColor="#9CA3AF"
                  value={value}
                  onChangeText={onChange}
                  multiline
                  maxLength={300}
                  className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base min-h-[80px]"
                  style={{ textAlignVertical: 'top' }}
                />
              )}
            />
          </Section>
        </ScrollView>

        <View className="px-4 pt-2 pb-2 border-t border-border-subtle">
          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={submit.isPending}
            className="bg-brand-primary rounded-md p-4 items-center"
          >
            {submit.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-background-primary font-semibold">
                요청 보내기
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
