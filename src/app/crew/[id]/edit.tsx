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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { useAuth } from '@/lib/auth-context';
import { useCrewDetail, useUpdateCrew } from '@/hooks/use-crews';
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
  const { session: authSession } = useAuth();
  const { data: crew, isLoading } = useCrewDetail(id);
  const { data: allGyms } = useGyms();
  const updateCrew = useUpdateCrew();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gymId, setGymId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (prefilled || !crew) return;
    setName(crew.name);
    setDescription(crew.description ?? '');
    setGymId(crew.home_gym?.id ?? null);
    setImageUrl(crew.image_url ?? null);
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
      Alert.alert('오류', '로그인이 필요해요');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요해요');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const url = await uploadCrewLogo(result.assets[0], userId);
      setImageUrl(url);
    } catch (e) {
      Alert.alert('업로드 실패', e instanceof Error ? e.message : '오류');
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
      });
      router.back();
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '오류');
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
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          {({ pressed }) => (
            <View style={[s.headerBtn, pressed && { opacity: 0.6 }]}>
              <Feather name="arrow-left" size={22} color={c.text.primary} />
            </View>
          )}
        </Pressable>
        <Text style={s.headerTitle}>크루 정보 수정</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
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

          <Text style={s.label}>
            이름 <Text style={s.required}>*</Text>
          </Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={(t) => setName(t.slice(0, NAME_MAX))}
            placeholder="크루 이름 (최대 30자)"
            placeholderTextColor={c.text.muted}
            maxLength={NAME_MAX}
          />

          <Text style={[s.label, { marginTop: 18 }]}>소개</Text>
          <TextInput
            style={[s.input, s.textArea]}
            value={description}
            onChangeText={(t) => setDescription(t.slice(0, DESC_MAX))}
            placeholder="크루 소개 (최대 200자)"
            placeholderTextColor={c.text.muted}
            multiline
            textAlignVertical="top"
            maxLength={DESC_MAX}
          />
          <Text style={s.charCount}>{description.length} / {DESC_MAX}</Text>

          <Text style={[s.label, { marginTop: 18 }]}>주 활동 암장</Text>
          <Pressable onPress={() => setShowGymModal(true)}>
            {({ pressed }) => (
              <View style={[s.gymBox, pressed && { opacity: 0.7 }]}>
                <View style={s.gymBoxLeft}>
                  <Feather name="search" size={16} color={c.text.tertiary} />
                  <Text
                    style={selectedGym ? s.gymBoxText : s.gymBoxPlaceholder}
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
              </View>
            )}
          </Pressable>
        </ScrollView>

        <View style={s.footer}>
          <Pressable onPress={handleSubmit} disabled={!canSubmit}>
            {({ pressed }) => (
              <View
                style={[
                  s.submitBtn,
                  !canSubmit && s.submitBtnDisabled,
                  pressed && { opacity: 0.85 },
                ]}
              >
                {updateCrew.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text
                    style={[s.submitBtnText, !canSubmit && s.submitBtnTextDisabled]}
                  >
                    저장
                  </Text>
                )}
              </View>
            )}
          </Pressable>
        </View>
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
    borderBottomColor: '#f1f5f9',
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
  scrollContent: { padding: 20, paddingBottom: 40 },
  logoBlock: { alignItems: 'center', gap: 8, marginBottom: 24 },
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
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
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
    borderTopColor: '#e2e8f0',
    backgroundColor: c.bg.card,
  },
  submitBtn: {
    backgroundColor: '#06b6d4',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#cbd5e1' },
  submitBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  submitBtnTextDisabled: { color: c.text.muted },
  });
}