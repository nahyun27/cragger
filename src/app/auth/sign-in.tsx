import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { supabase } from '@/lib/supabase';

const schema = z.object({
  email: z.string().email('올바른 이메일 형식이 아니에요'),
  password: z.string().min(6, '비밀번호는 6자 이상이에요'),
});

type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    setIsSubmitting(false);
    if (error) setSubmitError(error.message);
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center gap-6">
          <Text className="text-text-primary text-3xl font-bold">로그인</Text>

          {submitError && (
            <View className="border border-status-danger rounded-md p-3 bg-background-secondary">
              <Text className="text-status-danger">{submitError}</Text>
            </View>
          )}

          <View className="gap-4">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <View>
                  <TextInput
                    placeholder="이메일"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    className="border border-border-default rounded-md p-4 text-text-primary text-base"
                    onChangeText={onChange}
                    value={value}
                    editable={!isSubmitting}
                  />
                  {errors.email && (
                    <Text className="text-status-danger text-sm mt-1">{errors.email.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <View>
                  <TextInput
                    placeholder="비밀번호"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    autoComplete="password"
                    className="border border-border-default rounded-md p-4 text-text-primary text-base"
                    onChangeText={onChange}
                    value={value}
                    editable={!isSubmitting}
                  />
                  {errors.password && (
                    <Text className="text-status-danger text-sm mt-1">
                      {errors.password.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>

          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="bg-brand-primary rounded-md p-4 items-center"
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-background-primary text-base font-semibold">로그인</Text>
            )}
          </Pressable>

          <View className="flex-row justify-center gap-2">
            <Text className="text-text-secondary">계정이 없으신가요?</Text>
            <Link href="/auth/sign-up" className="text-brand-primary font-semibold">
              가입하기
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
