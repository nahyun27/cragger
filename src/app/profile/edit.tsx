import { customAlert } from '@/components/ui/custom-alert';
import DateTimePicker from '@react-native-community/datetimepicker';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from '@/lib/router';
import React, { useEffect, useMemo, useState } from 'react';
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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { z } from 'zod';

import { ScreenHeader } from '@/components/ui/screen-header';
import { BottomCTA } from '@/components/ui/bottom-cta';
import {
  FormCard,
  FormClearBtn,
  FormField,
  FormInput,
  FormPressable,
} from '@/components/ui/form';
import { useCheckUsername, useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { useAuth } from '@/lib/auth-context';
import { deleteAvatarByUrl, uploadAvatarImage } from '@/lib/upload-image';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

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
    .max(31, '최대 30자')
    .regex(/^@?[a-zA-Z0-9._]*$/, '영문·숫자·_·. 만 가능')
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

  const c = useThemeColors();  const router = useRouter();
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
        instagramHandle: profile.instagram_handle ? `@${profile.instagram_handle}` : '',
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
      customAlert('권한 필요', '갤러리 접근을 허용해주세요');
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
    const cleanedInsta = (values.instagramHandle ?? '').replace(/@/g, '').trim();
    const usernameChanged = values.username.trim() !== profile.username;

    // Resolve avatar update first — upload if pending, clear if removing.
    let avatarUrlArg: string | null | undefined = undefined;
    const oldUrl = profile.avatar_url;
    if (pendingAvatar) {
      const userId = authSession?.user.id;
      if (!userId) {
        customAlert('로그인 필요');
        return;
      }
      setUploadingAvatar(true);
      try {
        avatarUrlArg = await uploadAvatarImage(pendingAvatar, userId);
      } catch (e) {
        setUploadingAvatar(false);
        customAlert('업로드 실패', e instanceof Error ? e.message : '알 수 없는 오류');
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
      customAlert('저장 실패', e instanceof Error ? e.message : '알 수 없는 오류');
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

  const s = makeStyles(c);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary }} edges={['left', 'right']}>
      <ScreenHeader title="프로필 편집" onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 18, gap: 18, paddingBottom: 16 }}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar block — center, big with camera overlay */}
          <View style={{ alignItems: 'center', paddingVertical: 8, gap: 12 }}>
            <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar} hitSlop={4}>
              {({ pressed }) => (
                <View style={[s.avatarWrap, pressed && { opacity: 0.85 }]}>
                  <AvatarBig
                    uri={avatarPreviewUri}
                    fallbackChar={(profile.username[0] ?? '?').toUpperCase()}
                    uploading={uploadingAvatar}
                    c={c}
                  />
                  <View style={s.cameraBtn}>
                    <Feather name="camera" size={15} color={c.brand.onPrimary} />
                  </View>
                </View>
              )}
            </Pressable>
            {avatarPreviewUri ? (
              <Pressable
                onPress={handleRemoveAvatar}
                disabled={uploadingAvatar}
                hitSlop={6}
              >
                {({ pressed }) => (
                  <View style={[s.avatarRemoveBtn, pressed && { opacity: 0.6 }]}>
                    <Feather name="trash-2" size={14} color={c.status.danger} />
                    <Text style={{ color: c.status.danger, fontSize: 13, fontWeight: '800', letterSpacing: -0.2 }}>
                      사진 제거
                    </Text>
                  </View>
                )}
              </Pressable>
            ) : (
              <Text style={{ fontSize: 12, color: c.text.tertiary, fontWeight: '600' }}>
                탭해서 프로필 사진을 추가하세요
              </Text>
            )}
          </View>

          {/* Card: 닉네임 / 인스타 */}
          <FormCard title="기본 정보" icon="user">
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, value } }) => (
                <FormField label="닉네임" error={errors.username?.message} required>
                  <FormInput
                    placeholder="2~30자, 영문·숫자·_·.·한글"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={30}
                    trailingNode={<UsernameStatusIcon status={usernameStatus} />}
                  />
                  {!errors.username && <UsernameStatusText status={usernameStatus} />}
                </FormField>
              )}
            />
            <Controller
              control={control}
              name="instagramHandle"
              render={({ field: { onChange, value } }) => (
                <FormField label="Instagram" error={errors.instagramHandle?.message}>
                  <FormInput
                    placeholder="@your_handle"
                    value={value ?? ''}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={31}
                  />
                </FormField>
              )}
            />
          </FormCard>

          {/* Card: 신체 정보 */}
          <FormCard title="신체 정보" icon="activity" desc="공개 안 함도 OK — 선택 항목">
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Controller
                control={control}
                name="heightCm"
                render={({ field: { onChange, value } }) => (
                  <FormField label="키" error={errors.heightCm?.message} flex>
                    <FormInput
                      placeholder="170"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="number-pad"
                      maxLength={3}
                      trailingUnit="cm"
                    />
                  </FormField>
                )}
              />
              <Controller
                control={control}
                name="reachCm"
                render={({ field: { onChange, value } }) => (
                  <FormField label="리치" error={errors.reachCm?.message} flex>
                    <FormInput
                      placeholder="175"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="number-pad"
                      maxLength={3}
                      trailingUnit="cm"
                    />
                  </FormField>
                )}
              />
            </View>
            <Controller
              control={control}
              name="weightKg"
              render={({ field: { onChange, value } }) => (
                <FormField label="몸무게" error={errors.weightKg?.message}>
                  <FormInput
                    placeholder="60"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="number-pad"
                    maxLength={3}
                    trailingUnit="kg"
                  />
                  <View style={s.toggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.toggleLabel}>마이페이지에서 숨기기</Text>
                      <Text style={s.toggleDesc}>몸무게는 다른 사람에게 보이지 않아요</Text>
                    </View>
                    <Pressable
                      onPress={() => setWeightVisible((v) => !v)}
                      hitSlop={6}
                      style={({ pressed }) => [
                        s.switchTrack,
                        !weightVisible && { backgroundColor: c.brand.primary },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <View
                        style={[
                          s.switchThumb,
                          !weightVisible && { alignSelf: 'flex-end' },
                        ]}
                      />
                    </Pressable>
                  </View>
                </FormField>
              )}
            />
          </FormCard>

          {/* Card: 활동 */}
          <FormCard title="활동" icon="calendar">
            <FormField label="클라이밍 시작일">
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <FormPressable
                    onPress={() => setShowPicker(true)}
                    leadingIcon="calendar"
                    placeholder="날짜를 선택하세요"
                    value={climbingStartDate ? formatLongDate(climbingStartDate) : null}
                  />
                </View>
                {climbingStartDate && (
                  <FormClearBtn
                    onPress={() => { setClimbingStartDate(null); setStartDateDirty(true); }}
                  />
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
                  style={({ pressed }) => [{ alignSelf: 'flex-end', padding: 6 }, pressed && { opacity: 0.6 }]}
                >
                  <Text style={{ color: c.brand.primary, fontSize: 13, fontWeight: '800' }}>완료</Text>
                </Pressable>
              )}
            </FormField>
          </FormCard>
        </ScrollView>

        <BottomCTA
          label="저장하기"
          onPress={handleSubmit(onSubmit)}
          loading={updateProfile.isPending}
          disabled={!canSubmit}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AvatarBig({
  uri, fallbackChar, uploading, c,
}: {
  uri: string | null;
  fallbackChar: string;
  uploading: boolean;
  c: ThemeColors;
}) {
  return (
    <View
      style={{
        width: 110, height: 110, borderRadius: 55,
        backgroundColor: c.brand.primaryLight,
        borderWidth: 3, borderColor: c.brand.primary,
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: c.brand.primary,
        shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
        elevation: 5,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <Text style={{ fontSize: 40, fontWeight: '900', color: c.brand.primaryDeep }}>
          {fallbackChar}
        </Text>
      )}
      {uploading ? (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color="white" />
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    avatarWrap: { position: 'relative' },
    cameraBtn: {
      position: 'absolute',
      bottom: 0, right: 0,
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: c.brand.primary,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 3, borderColor: c.bg.primary,
      shadowColor: c.brand.primary,
      shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    avatarRemoveBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
      backgroundColor: c.status.dangerBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.status.danger + '33',
    },
    toggleRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      marginTop: 8,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border.subtle,
    },
    toggleLabel: { fontSize: 12.5, fontWeight: '800', color: c.text.primary },
    toggleDesc: { fontSize: 11, color: c.text.tertiary, fontWeight: '600', marginTop: 1 },
    switchTrack: {
      width: 42, height: 24, borderRadius: 999,
      backgroundColor: c.border.strong,
      padding: 2,
      justifyContent: 'center',
    },
    switchThumb: {
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: c.bg.card,
      shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
    },
  });
}

function UsernameStatusIcon({
  status,
}: {
  status: 'unchanged' | 'invalid' | 'checking' | 'available' | 'taken' | 'idle';
}) {
  const c = useThemeColors();
  if (status === 'checking') return <ActivityIndicator size="small" />;
  if (status === 'available')
    return <Feather name="check-circle" size={16} color={c.brand.primary} />;
  if (status === 'taken') return <Feather name="x-circle" size={16} color={c.status.danger} />;
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
