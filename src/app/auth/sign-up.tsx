import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
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

export default function SignUpScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleKakao() {
    setSubmitError(null);
    setInfoMessage(null);
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
    setInfoMessage(null);
    setIsSubmitting(true);
    const { data, error } = await supabase.auth.signUp(values);
    setIsSubmitting(false);
    if (error) {
      setSubmitError(translateAuthError(error.message));
      return;
    }
    if (!data.session) {
      setInfoMessage('확인 이메일을 보냈어요. 메일을 열어 인증한 뒤 로그인해주세요.');
    }
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
                source={require('../../../assets/logo.png')}
                style={{ width: 80, height: 80, borderRadius: 20 }}
                resizeMode="cover"
              />
            </View>
            <Text style={s.heroTitle}>크래거 시작하기</Text>
            <Text style={s.heroDesc}>
              지금 가입하고 첫 등반을 기록해보세요
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

            {infoMessage ? (
              <View style={s.infoBox}>
                <Feather name="mail" size={14} color={c.brand.primaryDeep} />
                <Text style={s.infoText}>{infoMessage}</Text>
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
                <FormField
                  label="비밀번호"
                  error={errors.password?.message}
                  hint={!errors.password ? '6자 이상, 영문·숫자·특수문자 조합 권장' : undefined}
                >
                  <FormInput
                    leadingIcon="lock"
                    placeholder="6자 이상"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
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
                    <Feather name="user-plus" size={16} color={c.brand.onPrimary} />
                    <Text style={s.primaryBtnText}>가입하기</Text>
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

          {/* 카카오로 시작하기 */}
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

          {/* Terms note */}
          <Text style={s.terms}>
            가입 시 크래거의 이용약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다.
          </Text>

          {/* Sign in link */}
          <View style={s.bottomRow}>
            <Text style={s.bottomText}>이미 계정이 있으신가요?</Text>
            <Link href="/auth/sign-in" asChild>
              <Pressable hitSlop={6}>
                {({ pressed }) => (
                  <Text style={[s.bottomLink, pressed && { opacity: 0.6 }]}>로그인</Text>
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
  if (/user already registered/i.test(msg)) return '이미 가입된 이메일이에요. 로그인을 시도해주세요';
  if (/password should be at least/i.test(msg)) return '비밀번호는 6자 이상이어야 해요';
  if (/invalid email/i.test(msg)) return '올바른 이메일 형식이 아니에요';
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
    infoBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 8,
      padding: 12, borderRadius: 12,
      backgroundColor: c.brand.primaryLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.brand.primary + '33',
    },
    infoText: {
      flex: 1, fontSize: 12.5, fontWeight: '700', color: c.brand.primaryDeep,
      letterSpacing: -0.2, lineHeight: 18,
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

    terms: {
      fontSize: 11, color: c.text.muted, fontWeight: '600',
      textAlign: 'center', lineHeight: 16, paddingHorizontal: 12,
    },

    bottomRow: {
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      gap: 6,
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
