import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
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
import { Feather } from '@expo/vector-icons';

import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { Chip } from '@/components/ui/chip';
import { Section } from '@/components/ui/section';
import {
  POST_TYPE_LABEL,
  useCreatePost,
  type PostType,
} from '@/hooks/use-community';
import { useGyms } from '@/hooks/use-gyms';
import { useRecentGyms } from '@/hooks/use-recent-gyms';

const TYPE_OPTIONS: Exclude<PostType, 'meetup'>[] = ['general', 'question', 'review'];

const BODY_MAX = 1000;
const TITLE_MAX = 60;

export default function NewPostScreen() {
  const router = useRouter();
  const createPost = useCreatePost();
  const { data: allGyms } = useGyms();
  const { data: recentGyms } = useRecentGyms();

  const [postType, setPostType] = useState<Exclude<PostType, 'meetup'>>('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [gymId, setGymId] = useState<string | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);

  const selectedGym = useMemo(
    () => allGyms?.find((g) => g.id === gymId) ?? null,
    [allGyms, gymId],
  );

  const canSubmit = body.trim().length > 0 && !createPost.isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      const { id } = await createPost.mutateAsync({
        postType,
        title: title.trim() || null,
        body: body.trim(),
        gymId,
      });
      router.replace({ pathname: '/community/[id]', params: { id } });
    } catch (e) {
      Alert.alert('등록 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold mr-6">
          새 글 작성
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
                icon={<Feather name="search" size={14} color="#71717a" />}
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
            <View className="flex-row items-center gap-2 px-3 py-3 rounded-md bg-background-secondary border border-border-subtle">
              <Feather name="image" size={16} color="#a1a1aa" />
              <Text className="text-text-tertiary text-xs">사진 첨부는 준비 중이에요</Text>
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
            {createPost.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`font-semibold ${
                  !canSubmit ? 'text-text-muted' : 'text-background-primary'
                }`}
              >
                등록
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
