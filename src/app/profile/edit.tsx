import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
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
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';

// Instagram username 규칙: 영문/숫자/_/. 최대 30자. 앞의 @ 들어오면 자동 제거.
const schema = z.object({
  instagramHandle: z
    .string()
    .trim()
    .max(30, '최대 30자')
    .regex(/^[a-zA-Z0-9._]*$/, '영문·숫자·_·. 만 가능 (@ 빼고)')
    .optional()
    .or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function ProfileEditScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { instagramHandle: '' },
  });

  // profile load 완료 시 prefill
  useEffect(() => {
    if (profile) reset({ instagramHandle: profile.instagram_handle ?? '' });
  }, [profile, reset]);

  async function onSubmit(values: FormValues) {
    // 앞의 @ 자동 제거 + 빈 문자열은 null로
    const cleaned = (values.instagramHandle ?? '').replace(/^@/, '').trim();
    try {
      await updateProfile.mutateAsync({
        instagramHandle: cleaned ? cleaned : null,
      });
      router.back();
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center"
        edges={['top', 'bottom']}
      >
        <ActivityIndicator />
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
          프로필 편집
        </Text>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="p-4 gap-5">
          <Section title="Instagram">
            <Controller
              control={control}
              name="instagramHandle"
              render={({ field: { onChange, value } }) => (
                <View>
                  <View className="flex-row items-center border border-border-default rounded-md px-3">
                    <Text className="text-text-tertiary text-base">@</Text>
                    <TextInput
                      placeholder="your_handle"
                      placeholderTextColor="#9CA3AF"
                      value={value ?? ''}
                      onChangeText={(t) => onChange(t.replace(/^@+/, ''))}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={30}
                      className="flex-1 py-2.5 text-text-primary text-base"
                    />
                  </View>
                  {errors.instagramHandle && (
                    <Text className="text-status-danger text-sm mt-1">
                      {errors.instagramHandle.message}
                    </Text>
                  )}
                  <Text className="text-text-tertiary text-xs mt-1">
                    공유 카드에 인스타 핸들이 함께 표시됩니다 (출시 후).
                  </Text>
                </View>
              )}
            />
          </Section>
        </ScrollView>

        <View className="px-4 pt-2 pb-2 border-t border-border-subtle">
          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={updateProfile.isPending || !isDirty}
            className={`rounded-md p-4 items-center ${
              !isDirty ? 'bg-background-tertiary' : 'bg-brand-primary'
            }`}
          >
            {updateProfile.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`font-semibold ${
                  !isDirty ? 'text-text-muted' : 'text-background-primary'
                }`}
              >
                저장
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
