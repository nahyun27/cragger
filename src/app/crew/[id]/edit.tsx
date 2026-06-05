import { customAlert } from '@/components/ui/custom-alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import { FormInput, FormPressable } from '@/components/ui/form';
import { BottomCTA } from '@/components/ui/bottom-cta';
import { useAuth } from '@/lib/auth-context';
import {
  CREW_REGION_OPTIONS,
  useCrewDetail,
  useUpdateCrew,
  type CrewRegion,
} from '@/hooks/use-crews';
import { useGyms } from '@/hooks/use-gyms';
import { uploadCrewLogo } from '@/lib/upload-image';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

const NAME_MAX = 30;
const DESC_MAX = 200;

export default function EditCrewScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session: authSession } = useAuth();
  const { data: crew, isLoading } = useCrewDetail(id);
  const { data: allGyms } = useGyms();
  const updateCrew = useUpdateCrew();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gymId, setGymId] = useState<string | null>(null);
  const [region, setRegion] = useState<CrewRegion | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isRecruiting, setIsRecruiting] = useState(false);
  const [showGymModal, setShowGymModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (prefilled || !crew) return;
    setName(crew.name);
    setDescription(crew.description ?? '');
    setGymId(crew.home_gym?.id ?? null);
    setRegion(crew.region ?? null);
    setImageUrl(crew.image_url ?? null);
    setIsRecruiting(crew.is_recruiting);
    setPrefilled(true);
  }, [crew, prefilled]);

  const selectedGym = useMemo(
    () => allGyms?.find((g) => g.id === gymId) ?? null,
    [allGyms, gymId],
  );

  const canSubmit =
    prefilled && name.trim().length > 0 && !updateCrew.isPending && !uploading;

  async function handlePickImage() {
    if (uploading) return;
    const userId = authSession?.user.id;
    if (!userId) {
      customAlert('오류', '로그인이 필요해요');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      customAlert('권한 필요', '사진 라이브러리 접근 권한이 필요해요');
      return;
    }
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 0.8,
      });
    } catch (e) {
      customAlert('사진을 불러오지 못했어요', e instanceof Error ? e.message : '알 수 없는 오류');
      return;
    }
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const url = await uploadCrewLogo(result.assets[0], userId);
      setImageUrl(url);
    } catch (e) {
      customAlert('업로드 실패', e instanceof Error ? e.message : '오류');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!id || !canSubmit) return;
    try {
      await updateCrew.mutateAsync({
        crewId: id,
        name: name.trim(),
        description: description.trim() || null,
        homeGymId: gymId,
        imageUrl: imageUrl,
        region: region,
        isRecruiting: isRecruiting,
      });
      router.back();
    } catch (e) {
      customAlert('저장 실패', e instanceof Error ? e.message : '오류');
    }
  }

  if (isLoading || !prefilled) {
    return (
      <SafeAreaView style={s.center} edges={['top']}>
        <ActivityIndicator color={c.brand.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader title="크루 정보 수정" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 12 }]}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo picker */}
          <View style={s.logoBlock}>
            <Pressable onPress={handlePickImage} disabled={uploading}>
              {({ pressed }) => (
                <View style={[s.logoRing, pressed && { opacity: 0.85 }]}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={s.logoImage} resizeMode="cover" />
                  ) : (
                    <View style={s.logoPlaceholder}>
                      <Feather name="users" size={28} color={c.text.muted} />
                    </View>
                  )}
                  <View style={s.logoCameraBadge}>
                    {uploading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Feather name="camera" size={14} color="#ffffff" />
                    )}
                  </View>
                </View>
              )}
            </Pressable>
            {imageUrl && !uploading && (
              <Pressable onPress={() => setImageUrl(null)} hitSlop={6}>
                <Text style={s.logoRemoveText}>로고 제거</Text>
              </Pressable>
            )}
          </View>

          <Section title="이름" required icon="users">
            <FormInput
              value={name}
              onChangeText={(t) => setName(t.slice(0, NAME_MAX))}
              placeholder="크루 이름 (최대 30자)"
              maxLength={NAME_MAX}
            />
          </Section>

          <Section title="소개" icon="align-left">
            <FormInput
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, DESC_MAX))}
              placeholder="크루 소개 (최대 200자)"
              multiline
              maxLength={DESC_MAX}
            />
            <Text style={s.charCount}>{description.length} / {DESC_MAX}</Text>
          </Section>

          <Section title="주요 활동지역" icon="map">
            <View style={s.regionGrid}>
              {CREW_REGION_OPTIONS.map((r) => {
                const active = region === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRegion(active ? null : r)}
                  >
                    {({ pressed }) => (
                      <View
                        style={[
                          s.regionChip,
                          active ? s.regionChipActive : s.regionChipInactive,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Text
                          style={[
                            s.regionChipText,
                            active ? s.regionChipTextActive : s.regionChipTextInactive,
                          ]}
                        >
                          {r}
                        </Text>
                      </View>
                    )}
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

          <Section title="공개 모집" icon="radio">
            <Pressable onPress={() => setIsRecruiting((v) => !v)}>
              {({ pressed }) => (
                <View style={[s.recruitToggle, pressed && { opacity: 0.85 }]}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={s.recruitToggleTitle}>
                      {isRecruiting ? '공개 모집 중' : '공개 모집 안 함'}
                    </Text>
                    <Text style={s.recruitToggleSub}>
                      켜면 커뮤니티 / 크루 탐색에 노출되고 누구나 가입 요청을 보낼 수 있어요.
                    </Text>
                  </View>
                  <View style={[s.toggleTrack, isRecruiting && s.toggleTrackOn]}>
                    <View style={[s.toggleThumb, isRecruiting && s.toggleThumbOn]} />
                  </View>
                </View>
              )}
            </Pressable>
          </Section>
        </ScrollView>

        <BottomCTA
          label="저장"
          onPress={handleSubmit}
          loading={updateCrew.isPending}
          disabled={!canSubmit}
        />
      </KeyboardAvoidingView>

      <GymPickerModal
        visible={showGymModal}
        gyms={allGyms ?? []}
        selectedId={gymId}
        onSelect={(gid) => {
          setGymId(gid);
          setShowGymModal(false);
        }}
        onClose={() => setShowGymModal(false)}
      />
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg.primary },
  flex1: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: c.bg.card,
    borderBottomWidth: 1,
    borderBottomColor: c.border.subtle,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg.subtle,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: c.text.primary },
  scrollContent: { padding: 18, paddingBottom: 40, gap: 16 },
  logoBlock: { alignItems: 'center', gap: 8 },
  logoRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: c.bg.subtle,
    borderWidth: 2,
    borderColor: c.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  logoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  logoCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: c.bg.card,
  },
  logoRemoveText: { fontSize: 12, color: c.status.danger, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '700', color: c.text.secondary, marginBottom: 8 },
  required: { color: c.status.danger },
  input: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: c.text.primary,
  },
  textArea: { minHeight: 96, paddingTop: 12 },
  charCount: { fontSize: 11, color: c.text.muted, textAlign: 'right', marginTop: 4 },
  recruitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: c.bg.subtle,
    borderRadius: 12,
    padding: 14,
  },
  recruitToggleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: c.text.primary,
  },
  recruitToggleSub: {
    fontSize: 11,
    color: c.text.tertiary,
    fontWeight: '600',
    lineHeight: 15,
  },
  toggleTrack: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.border.strong,
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: c.brand.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.bg.card,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  regionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  regionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  regionChipActive: { backgroundColor: c.brand.primary, borderColor: c.brand.primary },
  regionChipInactive: { backgroundColor: c.bg.card, borderColor: c.border.subtle },
  regionChipText: { fontSize: 12, fontWeight: '700' },
  regionChipTextActive: { color: c.brand.onPrimary },
  regionChipTextInactive: { color: c.text.secondary },
  gymBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  gymBoxLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  gymBoxText: { fontSize: 15, color: c.text.primary, fontWeight: '700', flex: 1 },
  gymBoxPlaceholder: { fontSize: 15, color: c.text.muted, flex: 1 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: c.border.subtle,
    backgroundColor: c.bg.card,
  },
  submitBtn: {
    backgroundColor: c.brand.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: c.border.strong },
  submitBtnText: { color: c.text.inverse, fontSize: 15, fontWeight: '800' },
  submitBtnTextDisabled: { color: c.text.muted },
  });
}