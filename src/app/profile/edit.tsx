import DateTimePicker from '@react-native-community/datetimepicker';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { z } from 'zod';

import { Section } from '@/components/ui/section';
import { useCheckUsername, useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { useAuth } from '@/lib/auth-context';
import { deleteAvatarByUrl, uploadAvatarImage } from '@/lib/upload-image';

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(2, '최소 2자')
    .max(30, '최대 30자')
    .regex(/^[a-zA-Z0-9._가-힣]+$/, '영문·숫자·_·.·한글만 가능'),
  instagramHandle: z
    .string()
    .trim()
    .max(30, '최대 30자')
    .regex(/^[a-zA-Z0-9._]*$/, '영문·숫자·_·. 만 가능 (@ 빼고)')
    .optional()
    .or(z.literal('')),
  heightCm: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d+$/.test(v), '숫자만 입력')
    .refine(
      (v) => v === '' || (Number(v) >= 80 && Number(v) <= 250),
      '80~250 사이',
    ),
  reachCm: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d+$/.test(v), '숫자만 입력')
    .refine(
      (v) => v === '' || (Number(v) >= 80 && Number(v) <= 270),
      '80~270 사이',
    ),
  weightKg: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d+$/.test(v), '숫자만 입력')
    .refine(
      (v) => v === '' || (Number(v) >= 30 && Number(v) <= 300),
      '30~300 사이',
    ),
});

type FormValues = z.infer<typeof schema>;

function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYMD(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatLongDate(s: string | null): string {
  const d = parseYMD(s);
  if (!d) return '선택 안 함';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export default function ProfileEditScreen() {
  const router = useRouter();
  const { session: authSession } = useAuth();
  const { data: profile, isLoading, error: profileError } = useProfile();
  const updateProfile = useUpdateProfile();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { username: '', instagramHandle: '', heightCm: '', reachCm: '', weightKg: '' },
  });

  const [climbingStartDate, setClimbingStartDate] = useState<string | null>(null);
  const [startDateDirty, setStartDateDirty] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [weightVisible, setWeightVisible] = useState(true);

  // Avatar: pending = newly picked but not yet uploaded; removeAvatar = user tapped 삭제
  const [pendingAvatar, setPendingAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const avatarPreviewUri = pendingAvatar?.uri ?? (removeAvatar ? null : profile?.avatar_url ?? null);
  const avatarDirty = pendingAvatar !== null || removeAvatar;

  useEffect(() => {
    if (profile) {
      reset({
        username: profile.username,
        instagramHandle: profile.instagram_handle ?? '',
        heightCm: profile.height_cm != null ? String(profile.height_cm) : '',
        reachCm: profile.reach_cm != null ? String(profile.reach_cm) : '',
        weightKg: profile.weight_kg != null ? String(profile.weight_kg) : '',
      });
      setClimbingStartDate(profile.climbing_start_date);
      setStartDateDirty(false);
      setWeightVisible(profile.weight_visible);
      setPendingAvatar(null);
      setRemoveAvatar(false);
    }
  }, [profile, reset]);

  async function handlePickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '갤러리 접근을 허용해주세요');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (res.canceled || !res.assets || res.assets.length === 0) return;
    setPendingAvatar(res.assets[0]);
    setRemoveAvatar(false);
  }

  function handleRemoveAvatar() {
    setPendingAvatar(null);
    setRemoveAvatar(true);
  }

  const usernameRaw = watch('username');
  const usernameDebounced = useDebounced(usernameRaw, 400);
  const usernameCheck = useCheckUsername(usernameDebounced ?? '', profile?.username ?? null);

  const usernameStatus = useMemo<
    'unchanged' | 'invalid' | 'checking' | 'available' | 'taken' | 'idle'
  >(() => {
    if (!profile) return 'idle';
    if (!usernameDebounced || usernameDebounced.trim().length < 2) return 'invalid';
    if (usernameDebounced === profile.username) return 'unchanged';
    if (usernameCheck.isLoading) return 'checking';
    if (usernameCheck.data === true) return 'available';
    if (usernameCheck.data === false) return 'taken';
    return 'idle';
  }, [profile, usernameDebounced, usernameCheck.isLoading, usernameCheck.data]);

  const weightVisibleDirty =
    profile != null && weightVisible !== profile.weight_visible;
  const canSubmit =
    (isDirty || startDateDirty || avatarDirty || weightVisibleDirty) &&
    !updateProfile.isPending &&
    !uploadingAvatar &&
    (usernameStatus === 'unchanged' || usernameStatus === 'available');

  async function onSubmit(values: FormValues) {
    if (!profile) return;
    const cleanedInsta = (values.instagramHandle ?? '').replace(/^@/, '').trim();
    const usernameChanged = values.username.trim() !== profile.username;

    // Resolve avatar update first — upload if pending, clear if removing.
    let avatarUrlArg: string | null | undefined = undefined;
    const oldUrl = profile.avatar_url;
    if (pendingAvatar) {
      const userId = authSession?.user.id;
      if (!userId) {
        Alert.alert('로그인 필요');
        return;
      }
      setUploadingAvatar(true);
      try {
        avatarUrlArg = await uploadAvatarImage(pendingAvatar, userId);
      } catch (e) {
        setUploadingAvatar(false);
        Alert.alert('업로드 실패', e instanceof Error ? e.message : '알 수 없는 오류');
        return;
      }
      setUploadingAvatar(false);
    } else if (removeAvatar) {
      avatarUrlArg = null;
    }

    try {
      await updateProfile.mutateAsync({
        username: usernameChanged ? values.username.trim() : undefined,
        instagramHandle: cleanedInsta ? cleanedInsta : null,
        heightCm: values.heightCm.trim() ? Number(values.heightCm.trim()) : null,
        reachCm: values.reachCm.trim() ? Number(values.reachCm.trim()) : null,
        weightKg: values.weightKg.trim() ? Number(values.weightKg.trim()) : null,
        weightVisible,
        climbingStartDate: startDateDirty ? climbingStartDate : undefined,
        avatarUrl: avatarUrlArg,
      });
      // Best-effort: drop the old avatar object once the row is updated.
      if (avatarUrlArg !== undefined && oldUrl && oldUrl !== avatarUrlArg) {
        deleteAvatarByUrl(oldUrl).catch(() => undefined);
      }
      router.back();
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  if (profileError) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center p-6"
        edges={['top', 'bottom']}
      >
        <Text className="text-status-danger text-center mb-4 text-sm font-semibold">
          프로필을 불러올 수 없어요
        </Text>
        <Text className="text-text-tertiary text-center text-xs mb-4">
          {profileError.message}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="border border-border-default rounded-md px-4 py-2"
        >
          <Text className="text-text-primary text-sm">돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  if (isLoading || !profile) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center"
        edges={['top', 'bottom']}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const startDateValue = parseYMD(climbingStartDate);

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-2 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2" hitSlop={8}>
          <Feather name="arrow-left" size={22} color="#0f172a" />
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
        <ScrollView contentContainerClassName="p-5 gap-6 pb-8" keyboardShouldPersistTaps="handled">
          {/* Avatar — 중앙 정렬, 마이페이지와 동일한 인스타 스타일 */}
          <View className="items-center gap-3 pt-1">
            <AvatarPreview
              uri={avatarPreviewUri}
              fallbackChar={(profile.username[0] ?? '?').toUpperCase()}
              uploading={uploadingAvatar}
            />
            <View className="flex-row gap-2">
              <Pressable
                onPress={handlePickAvatar}
                disabled={uploadingAvatar}
                className="flex-row items-center gap-1.5 px-4 py-2 rounded-full bg-background-secondary border border-border-subtle active:opacity-70"
              >
                <Feather name="image" size={13} color="#06b6d4" />
                <Text className="text-text-primary text-xs font-semibold">
                  {avatarPreviewUri ? '사진 변경' : '사진 선택'}
                </Text>
              </Pressable>
              {avatarPreviewUri && (
                <Pressable
                  onPress={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="flex-row items-center gap-1.5 px-4 py-2 rounded-full bg-background-secondary border border-border-subtle active:opacity-70"
                >
                  <Feather name="trash-2" size={13} color="#ef4444" />
                  <Text className="text-status-danger text-xs font-semibold">삭제</Text>
                </Pressable>
              )}
            </View>
          </View>

          <Section title="닉네임" required>
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, value } }) => (
                <View>
                  <View className="flex-row items-center bg-background-secondary border border-border-subtle rounded-xl px-3.5">
                    <TextInput
                      placeholder="2~30자, 영문·숫자·_·.·한글"
                      placeholderTextColor="#9CA3AF"
                      value={value}
                      onChangeText={onChange}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={30}
                      className="flex-1 py-3 text-text-primary text-base"
                    />
                    <UsernameStatusIcon status={usernameStatus} />
                  </View>
                  {errors.username ? (
                    <Text className="text-status-danger text-xs mt-1">
                      {errors.username.message}
                    </Text>
                  ) : (
                    <UsernameStatusText status={usernameStatus} />
                  )}
                </View>
              )}
            />
          </Section>

          <Section title="키">
            <Controller
              control={control}
              name="heightCm"
              render={({ field: { onChange, value } }) => (
                <View>
                  <View className="flex-row items-center bg-background-secondary border border-border-subtle rounded-xl px-3.5">
                    <TextInput
                      placeholder="예: 170"
                      placeholderTextColor="#9CA3AF"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="number-pad"
                      maxLength={3}
                      className="flex-1 py-3 text-text-primary text-base"
                    />
                    <Text className="text-text-tertiary text-sm">cm</Text>
                  </View>
                  {errors.heightCm && (
                    <Text className="text-status-danger text-xs mt-1">
                      {errors.heightCm.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </Section>

          <Section title="리치">
            <Controller
              control={control}
              name="reachCm"
              render={({ field: { onChange, value } }) => (
                <View>
                  <View className="flex-row items-center bg-background-secondary border border-border-subtle rounded-xl px-3.5">
                    <TextInput
                      placeholder="양팔 벌렸을 때 손끝~손끝"
                      placeholderTextColor="#9CA3AF"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="number-pad"
                      maxLength={3}
                      className="flex-1 py-3 text-text-primary text-base"
                    />
                    <Text className="text-text-tertiary text-sm">cm</Text>
                  </View>
                  {errors.reachCm && (
                    <Text className="text-status-danger text-xs mt-1">
                      {errors.reachCm.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </Section>

          <Section title="몸무게">
            <Controller
              control={control}
              name="weightKg"
              render={({ field: { onChange, value } }) => (
                <View>
                  <View className="flex-row items-center bg-background-secondary border border-border-subtle rounded-xl px-3.5">
                    <TextInput
                      placeholder="예: 60"
                      placeholderTextColor="#9CA3AF"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="number-pad"
                      maxLength={3}
                      className="flex-1 py-3 text-text-primary text-base"
                    />
                    <Text className="text-text-tertiary text-sm">kg</Text>
                  </View>
                  {errors.weightKg && (
                    <Text className="text-status-danger text-xs mt-1">
                      {errors.weightKg.message}
                    </Text>
                  )}
                  <Pressable
                    onPress={() => setWeightVisible((v) => !v)}
                    className="mt-2 flex-row items-center gap-2 active:opacity-70"
                    hitSlop={6}
                  >
                    <View
                      className={`w-5 h-5 rounded border items-center justify-center ${
                        weightVisible
                          ? 'bg-brand-primary border-brand-primary'
                          : 'bg-background-primary border-border-default'
                      }`}
                    >
                      {weightVisible && <Feather name="check" size={12} color="white" />}
                    </View>
                    <Text className="text-text-secondary text-sm">
                      마이페이지에 표시
                    </Text>
                  </Pressable>
                  <Text className="text-text-tertiary text-xs mt-1">
                    숨기면 본인 페이지에도 노출되지 않아요
                  </Text>
                </View>
              )}
            />
          </Section>

          <Section title="클라이밍 시작일">
            <View className="flex-row gap-2 items-center">
              <Pressable
                onPress={() => setShowPicker(true)}
                className="flex-1 flex-row items-center justify-between border border-border-default rounded-md px-3 py-2.5 active:opacity-80"
              >
                <Text
                  className={
                    climbingStartDate ? 'text-text-primary text-base' : 'text-text-tertiary text-base'
                  }
                >
                  {formatLongDate(climbingStartDate)}
                </Text>
                <Feather name="calendar" size={16} color="#64748b" />
              </Pressable>
              {climbingStartDate && (
                <Pressable
                  onPress={() => {
                    setClimbingStartDate(null);
                    setStartDateDirty(true);
                  }}
                  className="px-3 py-2.5 border border-border-default rounded-md active:opacity-80"
                  hitSlop={6}
                >
                  <Text className="text-text-tertiary text-sm">지우기</Text>
                </Pressable>
              )}
            </View>
            {showPicker && (
              <DateTimePicker
                value={startDateValue ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(event, picked) => {
                  if (Platform.OS !== 'ios') setShowPicker(false);
                  if (event.type === 'dismissed') return;
                  if (picked) {
                    setClimbingStartDate(formatYMD(picked));
                    setStartDateDirty(true);
                  }
                }}
              />
            )}
            {Platform.OS === 'ios' && showPicker && (
              <Pressable
                onPress={() => setShowPicker(false)}
                className="self-end px-3 py-1.5 mt-1 active:opacity-60"
              >
                <Text className="text-brand-primary text-sm font-semibold">완료</Text>
              </Pressable>
            )}
          </Section>

          <Section title="Instagram">
            <Controller
              control={control}
              name="instagramHandle"
              render={({ field: { onChange, value } }) => (
                <View>
                  <View className="flex-row items-center bg-background-secondary border border-border-subtle rounded-xl px-3.5">
                    <Text className="text-text-tertiary text-base">@</Text>
                    <TextInput
                      placeholder="your_handle"
                      placeholderTextColor="#9CA3AF"
                      value={value ?? ''}
                      onChangeText={(t) => onChange(t.replace(/^@+/, ''))}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={30}
                      className="flex-1 py-3 text-text-primary text-base"
                    />
                  </View>
                  {errors.instagramHandle && (
                    <Text className="text-status-danger text-xs mt-1">
                      {errors.instagramHandle.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </Section>
        </ScrollView>

        <View className="px-5 pt-3 pb-5 border-t border-border-subtle bg-background-primary">
          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={!canSubmit}
            className={`rounded-xl py-4 items-center ${
              !canSubmit ? 'bg-background-tertiary' : 'bg-brand-primary'
            }`}
            style={canSubmit ? {
              shadowColor: '#06b6d4',
              shadowOpacity: 0.25,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 3,
            } : undefined}
          >
            {updateProfile.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`font-bold text-base ${
                  !canSubmit ? 'text-text-muted' : 'text-background-primary'
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

function AvatarPreview({
  uri,
  fallbackChar,
  uploading,
}: {
  uri: string | null;
  fallbackChar: string;
  uploading: boolean;
}) {
  return (
    <View
      className="w-28 h-28 rounded-full bg-brand-primary/5 border-[2.5px] border-brand-primary items-center justify-center overflow-hidden"
      style={{
        shadowColor: '#06b6d4',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }}
    >
      {uri ? (
        <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
      ) : (
        <Text className="text-brand-primary text-4xl font-extrabold">{fallbackChar}</Text>
      )}
      {uploading && (
        <View className="absolute inset-0 items-center justify-center bg-black/30">
          <ActivityIndicator color="white" />
        </View>
      )}
    </View>
  );
}

function UsernameStatusIcon({
  status,
}: {
  status: 'unchanged' | 'invalid' | 'checking' | 'available' | 'taken' | 'idle';
}) {
  if (status === 'checking') return <ActivityIndicator size="small" />;
  if (status === 'available')
    return <Feather name="check-circle" size={16} color="#06b6d4" />;
  if (status === 'taken') return <Feather name="x-circle" size={16} color="#ef4444" />;
  return null;
}

function UsernameStatusText({
  status,
}: {
  status: 'unchanged' | 'invalid' | 'checking' | 'available' | 'taken' | 'idle';
}) {
  if (status === 'available')
    return <Text className="text-brand-primary text-xs mt-1">사용 가능</Text>;
  if (status === 'taken')
    return <Text className="text-status-danger text-xs mt-1">이미 사용 중</Text>;
  if (status === 'checking')
    return <Text className="text-text-tertiary text-xs mt-1">확인 중…</Text>;
  return null;
}
