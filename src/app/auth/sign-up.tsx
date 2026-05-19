import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Image,
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

export default function SignUpScreen() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);

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
    setInfoMessage(null);
    setIsSubmitting(true);
    const { data, error } = await supabase.auth.signUp(values);
    setIsSubmitting(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    if (!data.session) {
      setInfoMessage('확인 이메일을 보냈어요. 메일을 열어 인증한 뒤 로그인해주세요.');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-8 justify-center pb-8">
          {/* Logo & Header */}
          <View className="items-center mb-10">
            <Image
              source={require('../../../assets/logo.png')}
              style={{ width: 80, height: 80, borderRadius: 20 }}
              resizeMode="cover"
            />
            <Text className="text-text-primary text-3xl font-bold mt-6 tracking-tight">
              Creagger 시작하기
            </Text>
            <Text className="text-text-muted text-base mt-2">
              지금 가입하고 첫 등반을 기록해보세요
            </Text>
          </View>

          {submitError && (
            <View className="border border-status-danger/30 rounded-xl p-4 bg-status-danger/10 mb-6 flex-row items-center">
              <Text className="text-status-danger font-medium flex-1">{submitError}</Text>
            </View>
          )}

          {infoMessage && (
            <View className="border border-status-info/30 rounded-xl p-4 bg-status-info/10 mb-6 flex-row items-center">
              <Text className="text-status-info font-medium flex-1">{infoMessage}</Text>
            </View>
          )}

          <View className="gap-5">
            {/* Email Input */}
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <View>
                  <TextInput
                    placeholder="이메일"
                    placeholderTextColor="#A1A1AA"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    className={`border-2 rounded-xl p-4 text-text-primary text-base bg-background-secondary transition-colors ${
                      focusedInput === 'email' ? 'border-brand-primary' : 'border-transparent'
                    }`}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    onChangeText={onChange}
                    value={value}
                    editable={!isSubmitting}
                  />
                  {errors.email && (
                    <Text className="text-status-danger text-sm mt-1.5 ml-1">{errors.email.message}</Text>
                  )}
                </View>
              )}
            />

            {/* Password Input */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <View>
                  <TextInput
                    placeholder="비밀번호 (6자 이상)"
                    placeholderTextColor="#A1A1AA"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    autoComplete="new-password"
                    className={`border-2 rounded-xl p-4 text-text-primary text-base bg-background-secondary transition-colors ${
                      focusedInput === 'password' ? 'border-brand-primary' : 'border-transparent'
                    }`}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    onChangeText={onChange}
                    value={value}
                    editable={!isSubmitting}
                  />
                  {errors.password && (
                    <Text className="text-status-danger text-sm mt-1.5 ml-1">
                      {errors.password.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Main Sign Up Button */}
            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className={`rounded-xl p-4 items-center mt-2 ${
                isSubmitting ? 'bg-brand-primary/70' : 'bg-brand-primary active:bg-brand-accent'
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-bold">이메일로 가입하기</Text>
              )}
            </Pressable>
          </View>

          {/* Divider */}
          <View className="flex-row items-center my-8">
            <View className="flex-1 h-[1px] bg-border-subtle" />
            <Text className="px-4 text-text-muted text-sm font-medium">소셜 계정으로 1초만에 가입</Text>
            <View className="flex-1 h-[1px] bg-border-subtle" />
          </View>

          {/* Social Logins */}
          <View className="gap-3">
            <Pressable className="flex-row items-center justify-center bg-[#FEE500] p-4 rounded-xl active:opacity-80">
              <Text className="text-[#000000] text-base font-bold ml-2">카카오로 시작하기</Text>
            </Pressable>
            
            <Pressable className="flex-row items-center justify-center bg-[#000000] dark:bg-white p-4 rounded-xl active:opacity-80">
              <Text className="text-white dark:text-black text-base font-bold ml-2">Apple로 시작하기</Text>
            </Pressable>
          </View>

          {/* Sign In Link */}
          <View className="flex-row justify-center mt-10">
            <Text className="text-text-secondary text-base">이미 계정이 있으신가요? </Text>
            <Link href="/auth/sign-in" className="text-brand-primary text-base font-bold">
              로그인
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
