import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@/lib/router';
import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { z } from 'zod';

import { FormField, FormInput } from '@/components/ui/form';
import { KakaoIcon } from '@/components/ui/kakao-icon';
import { signInWithKakao } from '@/lib/kakao-auth';
import { supabase } from '@/lib/supabase';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

const schema = z.object({
  email: z.string().email('올바른 이메일 형식이 아니에요'),
  password: z.string().min(6, '비밀번호는 6자 이상이에요'),
});

type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleKakao() {
    setSubmitError(null);
    setIsKakaoLoading(true);
    const result = await signInWithKakao();
    setIsKakaoLoading(false);
    if (!result.ok) setSubmitError(result.error);
  }

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
    if (error) setSubmitError(translateAuthError(error.message));
  }

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingTop: Math.max(insets.top, 32) + 24, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={s.hero}>
            <View style={s.logoWrap}>
              <Image
                source={require('../../../assets/images/splash-icon.png')}
                style={{ width: 80, height: 80, borderRadius: 20 }}
                resizeMode="cover"
              />
            </View>
            <Text style={s.heroTitle}>환영합니다</Text>
            <Text style={s.heroDesc}>
              크래거에서 당신의 한계를 넘어보세요
            </Text>
          </View>

          {/* Form Card */}
          <View style={s.card}>
            {submitError ? (
              <View style={s.errorBox}>
                <Feather name="alert-circle" size={14} color={c.status.danger} />
                <Text style={s.errorText}>{submitError}</Text>
              </View>
            ) : null}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <FormField label="이메일" error={errors.email?.message}>
                  <FormInput
                    leadingIcon="mail"
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    onChangeText={onChange}
                    value={value}
                    editable={!isSubmitting}
                  />
                </FormField>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <FormField label="비밀번호" error={errors.password?.message}>
                  <FormInput
                    leadingIcon="lock"
                    placeholder="6자 이상"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    onChangeText={onChange}
                    value={value}
                    editable={!isSubmitting}
                    trailingNode={
                      <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={6}>
                        <Feather
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={15}
                          color={c.text.tertiary}
                        />
                      </Pressable>
                    }
                  />
                </FormField>
              )}
            />

            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: 4 }]}
            >
              <View
                style={[
                  s.primaryBtn,
                  isSubmitting && { opacity: 0.6 },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={c.brand.onPrimary} />
                ) : (
                  <>
                    <Feather name="log-in" size={16} color={c.brand.onPrimary} />
                    <Text style={s.primaryBtnText}>로그인</Text>
                  </>
                )}
              </View>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>또는</Text>
            <View style={s.dividerLine} />
          </View>

          {/* 카카오 로그인 */}
          <Pressable
            onPress={handleKakao}
            disabled={isKakaoLoading || isSubmitting}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={[s.kakaoBtn, isKakaoLoading && { opacity: 0.6 }]}>
              {isKakaoLoading ? (
                <ActivityIndicator color="#3C1E1E" />
              ) : (
                <>
                  <KakaoIcon size={18} color="#3C1E1E" />
                  <Text style={s.kakaoText}>카카오로 시작하기</Text>
                </>
              )}
            </View>
          </Pressable>

          {/* Sign up link */}
          <View style={s.bottomRow}>
            <Text style={s.bottomText}>계정이 없으신가요?</Text>
            <Link href="/auth/sign-up" asChild>
              <Pressable hitSlop={6}>
                {({ pressed }) => (
                  <Text style={[s.bottomLink, pressed && { opacity: 0.6 }]}>회원가입</Text>
                )}
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function translateAuthError(msg: string): string {
  // Supabase 기본 메시지를 한국어로 친절하게 매핑
  if (/invalid login credentials/i.test(msg)) return '이메일 또는 비밀번호가 일치하지 않아요';
  if (/email not confirmed/i.test(msg)) return '이메일 인증을 먼저 완료해주세요';
  if (/network/i.test(msg)) return '네트워크 연결을 확인해주세요';
  return msg;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    scroll: { paddingHorizontal: 20, gap: 20 },

    hero: { alignItems: 'center', gap: 8, paddingVertical: 12 },
    logoWrap: {
      alignItems: 'center', justifyContent: 'center',
      shadowColor: c.brand.primary,
      shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
    heroTitle: {
      fontSize: 24, fontWeight: '900', color: c.text.primary,
      letterSpacing: -0.5, marginTop: 16,
    },
    heroDesc: {
      fontSize: 13.5, color: c.text.tertiary, fontWeight: '600',
      textAlign: 'center', letterSpacing: -0.2,
    },

    card: {
      backgroundColor: c.bg.card,
      borderRadius: 18,
      padding: 18,
      gap: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
    },

    errorBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      padding: 12, borderRadius: 12,
      backgroundColor: c.status.dangerBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.status.danger + '33',
    },
    errorText: {
      flex: 1, fontSize: 12.5, fontWeight: '700', color: c.status.danger,
      letterSpacing: -0.2,
    },

    primaryBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 15, borderRadius: 14,
      backgroundColor: c.brand.primary,
      shadowColor: c.brand.primary,
      shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    primaryBtnText: {
      fontSize: 15, fontWeight: '900', color: c.brand.onPrimary, letterSpacing: -0.3,
    },

    bottomRow: {
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      gap: 6, paddingTop: 4,
    },
    bottomText: { fontSize: 13, fontWeight: '600', color: c.text.tertiary },
    bottomLink: {
      fontSize: 13, fontWeight: '900', color: c.brand.primary, letterSpacing: -0.2,
    },

    dividerRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 4,
    },
    dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c.border.subtle },
    dividerText: { fontSize: 11, fontWeight: '700', color: c.text.muted, letterSpacing: 0.3 },

    kakaoBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 14, borderRadius: 14,
      backgroundColor: '#FEE500',
    },
    kakaoIcon: { fontSize: 16 },
    kakaoText: {
      fontSize: 14.5, fontWeight: '900', color: '#3C1E1E', letterSpacing: -0.3,
    },
  });
}
