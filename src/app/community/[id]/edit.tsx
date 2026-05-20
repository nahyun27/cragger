import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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

import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { Chip } from '@/components/ui/chip';
import { Section } from '@/components/ui/section';
import {
  POST_TYPE_LABEL,
  usePost,
  useUpdatePost,
  type PostType,
} from '@/hooks/use-community';
import { useGyms } from '@/hooks/use-gyms';
import { useRecentGyms } from '@/hooks/use-recent-gyms';
import { useAuth } from '@/lib/auth-context';
import { uploadPostImage } from '@/lib/upload-image';

const MAX_IMAGES = 4;
const TYPE_OPTIONS: Exclude<PostType, 'meetup'>[] = ['general', 'question', 'review'];
const BODY_MAX = 1000;
const TITLE_MAX = 60;

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const postQ = usePost(id);
  const updatePost = useUpdatePost();
  const { data: allGyms } = useGyms();
  const { data: recentGyms } = useRecentGyms();
  const { session: authSession } = useAuth();

  const [prefilled, setPrefilled] = useState(false);
  const [postType, setPostType] = useState<Exclude<PostType, 'meetup'>>('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [gymId, setGymId] = useState<string | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);
  // existingUrls = already-uploaded images we keep on save
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  // newAssets = freshly picked from gallery, to be uploaded on save
  const [newAssets, setNewAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (prefilled || !postQ.data) return;
    const p = postQ.data;
    setPostType(
      (['general', 'question', 'review'] as const).includes(
        p.post_type as 'general' | 'question' | 'review',
      )
        ? (p.post_type as 'general' | 'question' | 'review')
        : 'general',
    );
    setTitle(p.title ?? '');
    setBody(p.body);
    setGymId(p.gym_id);
    setExistingUrls(p.image_urls);
    setPrefilled(true);
  }, [postQ.data, prefilled]);

  const selectedGym = useMemo(
    () => allGyms?.find((g) => g.id === gymId) ?? null,
    [allGyms, gymId],
  );

  const totalImages = existingUrls.length + newAssets.length;
  const canSubmit =
    body.trim().length > 0 && !updatePost.isPending && !uploading && prefilled;

  async function handlePickImages() {
    const remaining = MAX_IMAGES - totalImages;
    if (remaining <= 0) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '갤러리 접근을 허용해주세요');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
      base64: true,
    });
    if (res.canceled || !res.assets) return;
    setNewAssets((prev) => [...prev, ...res.assets].slice(0, MAX_IMAGES - existingUrls.length));
  }

  function removeExisting(idx: number) {
    setExistingUrls((prev) => prev.filter((_, i) => i !== idx));
  }
  function removeNewAt(idx: number) {
    setNewAssets((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!id || !canSubmit) return;
    const userId = authSession?.user.id;
    if (!userId) {
      Alert.alert('로그인 필요');
      return;
    }
    let uploadedUrls: string[] = [];
    if (newAssets.length > 0) {
      setUploading(true);
      try {
        uploadedUrls = await Promise.all(
          newAssets.map((a) => uploadPostImage(a, userId)),
        );
      } catch (e) {
        setUploading(false);
        Alert.alert('업로드 실패', e instanceof Error ? e.message : '알 수 없는 오류');
        return;
      }
      setUploading(false);
    }
    try {
      await updatePost.mutateAsync({
        postId: id,
        postType,
        title: title.trim() || null,
        body: body.trim(),
        gymId,
        imageUrls: [...existingUrls, ...uploadedUrls],
      });
      router.back();
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  if (postQ.isLoading || !prefilled) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center"
        edges={['top', 'bottom']}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (postQ.error || !postQ.data) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center p-6"
        edges={['top', 'bottom']}
      >
        <Text className="text-status-danger text-center mb-4">
          {postQ.error?.message ?? '글을 찾을 수 없어요'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="border border-border-default rounded-md px-4 py-2"
        >
          <Text className="text-text-primary">돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold mr-6">
          글 수정
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4 gap-6"
          keyboardShouldPersistTaps="handled"
        >
          <Section title="종류" required>
            <View className="flex-row gap-2">
              {TYPE_OPTIONS.map((t) => (
                <Chip
                  key={t}
                  label={POST_TYPE_LABEL[t]}
                  selected={postType === t}
                  onPress={() => setPostType(t)}
                />
              ))}
            </View>
          </Section>

          <Section title="제목">
            <TextInput
              placeholder="제목 (선택, 최대 60자)"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={(t) => setTitle(t.slice(0, TITLE_MAX))}
              maxLength={TITLE_MAX}
              className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
            />
          </Section>

          <Section title="본문" required>
            <TextInput
              placeholder="자유롭게 써주세요 (최대 1000자)"
              placeholderTextColor="#9CA3AF"
              value={body}
              onChangeText={(t) => setBody(t.slice(0, BODY_MAX))}
              maxLength={BODY_MAX}
              multiline
              textAlignVertical="top"
              className="border border-border-default rounded-md px-3 py-3 text-text-primary text-base min-h-[160px]"
            />
            <Text className="text-text-tertiary text-xs text-right">
              {body.length} / {BODY_MAX}
            </Text>
          </Section>

          <Section title="관련 암장">
            <View className="flex-row flex-wrap gap-2">
              <Chip
                label="장소 검색"
                icon={<Feather name="search" size={14} color="#64748b" />}
                selected={false}
                onPress={() => setShowGymModal(true)}
              />
              {gymId !== null && (
                <Chip
                  label="태그 해제"
                  selected={false}
                  onPress={() => setGymId(null)}
                />
              )}
              {(recentGyms ?? []).map((g) => (
                <Chip
                  key={g.id}
                  label={`${g.name}${g.branch ? ` ${g.branch}` : ''}`}
                  selected={gymId === g.id}
                  onPress={() => setGymId(gymId === g.id ? null : g.id)}
                />
              ))}
            </View>
            {selectedGym && (
              <View className="mt-2 px-3 py-2 rounded-md bg-background-secondary">
                <Text className="text-text-primary text-sm">
                  선택: {selectedGym.name}
                  {selectedGym.branch ? ` ${selectedGym.branch}` : ''}
                  {selectedGym.city ? ` · ${selectedGym.city}` : ''}
                </Text>
              </View>
            )}
          </Section>

          <Section title="사진">
            <View className="flex-row flex-wrap gap-2">
              {existingUrls.map((url, idx) => (
                <View key={`existing-${idx}`} className="relative">
                  <Image
                    source={{ uri: url }}
                    className="w-20 h-20 rounded-xl"
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => removeExisting(idx)}
                    hitSlop={6}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-background-primary border border-border-default items-center justify-center active:opacity-70"
                  >
                    <Feather name="x" size={12} color="#64748b" />
                  </Pressable>
                </View>
              ))}
              {newAssets.map((a, idx) => (
                <View key={`new-${idx}`} className="relative">
                  <Image
                    source={{ uri: a.uri }}
                    className="w-20 h-20 rounded-xl"
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => removeNewAt(idx)}
                    hitSlop={6}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-background-primary border border-border-default items-center justify-center active:opacity-70"
                  >
                    <Feather name="x" size={12} color="#64748b" />
                  </Pressable>
                </View>
              ))}
              {totalImages < MAX_IMAGES && (
                <Pressable
                  onPress={handlePickImages}
                  className="w-20 h-20 rounded-xl border border-dashed border-border-default items-center justify-center bg-background-secondary active:opacity-70"
                >
                  <Feather name="plus" size={18} color="#64748b" />
                  <Text className="text-text-tertiary text-[10px] mt-1">
                    {totalImages}/{MAX_IMAGES}
                  </Text>
                </Pressable>
              )}
            </View>
          </Section>
        </ScrollView>

        <View className="px-4 pt-2 pb-2 border-t border-border-subtle">
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            className={`rounded-md p-4 items-center ${
              !canSubmit ? 'bg-background-tertiary' : 'bg-brand-primary'
            }`}
          >
            {uploading || updatePost.isPending ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="white" />
                <Text className="text-background-primary font-semibold">
                  {uploading ? '업로드 중…' : '저장 중…'}
                </Text>
              </View>
            ) : (
              <Text
                className={`font-semibold ${
                  !canSubmit ? 'text-text-muted' : 'text-background-primary'
                }`}
              >
                저장
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <GymPickerModal
        visible={showGymModal}
        gyms={allGyms ?? []}
        selectedId={gymId}
        onSelect={(pickedId) => {
          setGymId(pickedId);
          setShowGymModal(false);
        }}
        onClose={() => setShowGymModal(false)}
      />
    </SafeAreaView>
  );
}
