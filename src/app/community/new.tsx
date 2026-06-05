import { customAlert } from '@/components/ui/custom-alert';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { GymPickerModal } from '@/components/session/gym-picker-modal';
import {
  EMPTY_POLL_DRAFT,
  PollComposer,
  type PollDraft,
} from '@/components/community/poll-composer';
import { BottomCTA } from '@/components/ui/bottom-cta';
import { Chip } from '@/components/ui/chip';
import { FormInput, FormPressable } from '@/components/ui/form';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import {
  POST_TYPE_LABEL,
  useCreatePost,
  type PostType,
} from '@/hooks/use-community';
import { useCreatePoll } from '@/hooks/use-polls';
import { useGyms } from '@/hooks/use-gyms';
import { useRecentGyms } from '@/hooks/use-recent-gyms';
import { useAuth } from '@/lib/auth-context';
import { uploadPostImage } from '@/lib/upload-image';
import { useThemeColors } from '@/lib/theme';

const MAX_IMAGES = 4;

const TYPE_OPTIONS: PostType[] = ['general', 'question', 'review', 'meetup'];

const BODY_MAX = 1000;
const TITLE_MAX = 60;
const LOCATION_MAX = 80;

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
function formatMeetupAt(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const w = KO_WEEKDAYS[d.getDay()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}.${mm}.${dd} (${w}) ${hh}:${mi}`;
}

export default function NewPostScreen() {

  const c = useThemeColors();  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { crewId, type } = useLocalSearchParams<{ crewId?: string; type?: string }>();
  const createPost = useCreatePost();
  const createPoll = useCreatePoll();
  const { data: allGyms } = useGyms();
  const { data: recentGyms } = useRecentGyms();
  const { session: authSession } = useAuth();

  // URL ?type=meetup 으로 진입 시 default 모임으로
  const initialType: PostType =
    type === 'meetup' || type === 'question' || type === 'review' || type === 'general'
      ? (type as PostType)
      : 'general';
  const [postType, setPostType] = useState<PostType>(initialType);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [gymId, setGymId] = useState<string | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);
  const [pickedAssets, setPickedAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);

  // 모임 전용 필드
  const [meetupAt, setMeetupAt] = useState<Date | null>(null);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time' | null>(null);
  const [meetupLocation, setMeetupLocation] = useState('');
  const [meetupCapacity, setMeetupCapacity] = useState('');

  // 투표
  const [poll, setPoll] = useState<PollDraft>(EMPTY_POLL_DRAFT);

  const selectedGym = useMemo(
    () => allGyms?.find((g) => g.id === gymId) ?? null,
    [allGyms, gymId],
  );

  const isMeetup = postType === 'meetup';
  const meetupReady =
    !isMeetup ||
    (meetupAt != null && (gymId != null || meetupLocation.trim().length > 0));
  const pollReady =
    !poll.enabled ||
    (poll.question.trim().length > 0 &&
      poll.options.filter((o) => o.trim().length > 0).length >= 2);
  const canSubmit =
    body.trim().length > 0 &&
    meetupReady &&
    pollReady &&
    !createPost.isPending &&
    !uploading &&
    !createPoll.isPending;

  async function handlePickImages() {
    const remaining = MAX_IMAGES - pickedAssets.length;
    if (remaining <= 0) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      customAlert('권한 필요', '갤러리 접근을 허용해주세요');
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
    setPickedAssets((prev) => [...prev, ...res.assets].slice(0, MAX_IMAGES));
  }

  function removeAssetAt(idx: number) {
    setPickedAssets((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    const userId = authSession?.user.id;
    if (!userId) {
      customAlert('로그인 필요');
      return;
    }
    let uploadedUrls: string[] = [];
    if (pickedAssets.length > 0) {
      setUploading(true);
      try {
        uploadedUrls = await Promise.all(
          pickedAssets.map((a) => uploadPostImage(a, userId)),
        );
      } catch (e) {
        setUploading(false);
        customAlert('업로드 실패', e instanceof Error ? e.message : '알 수 없는 오류');
        return;
      }
      setUploading(false);
    }
    try {
      const cap = meetupCapacity.trim() ? parseInt(meetupCapacity, 10) : NaN;
      const { id } = await createPost.mutateAsync({
        postType,
        title: title.trim() || null,
        body: body.trim(),
        gymId,
        imageUrls: uploadedUrls,
        crewId: crewId ?? null,
        meetupAt: isMeetup && meetupAt ? meetupAt.toISOString() : null,
        meetupCapacity: isMeetup && Number.isFinite(cap) && cap > 0 ? cap : null,
        meetupLocation:
          isMeetup && !gymId && meetupLocation.trim() ? meetupLocation.trim() : null,
      });
      if (poll.enabled) {
        try {
          await createPoll.mutateAsync({
            postId: id,
            question: poll.question,
            isMulti: poll.isMulti,
            closesAt: poll.closesAt ? poll.closesAt.toISOString() : null,
            options: poll.options,
          });
        } catch (pe) {
          customAlert(
            '투표 생성 실패',
            pe instanceof Error ? pe.message : '글은 등록됐지만 투표는 실패했어요',
          );
        }
      }
      router.replace({ pathname: '/community/[id]', params: { id } });
    } catch (e) {
      customAlert('등록 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['left', 'right']}>
      <ScreenHeader title="새 글 작성" onBack={() => router.back()} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4 gap-6"
          contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          keyboardShouldPersistTaps="handled"
        >
          <Section title="종류" required>
            <View className="flex-row flex-wrap gap-2">
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

          {isMeetup && (
            <>
              <Section title="모임 일시" required icon="calendar">
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <FormPressable
                      onPress={() => setDatePickerMode('date')}
                      leadingIcon="calendar"
                      value={meetupAt ? formatMeetupAt(meetupAt).slice(0, 16) : null}
                      placeholder="날짜 선택"
                    />
                  </View>
                  <View className="flex-1">
                    <FormPressable
                      onPress={() => setDatePickerMode('time')}
                      disabled={!meetupAt}
                      leadingIcon="clock"
                      value={
                        meetupAt
                          ? `${String(meetupAt.getHours()).padStart(2, '0')}:${String(meetupAt.getMinutes()).padStart(2, '0')}`
                          : null
                      }
                      placeholder="시간 선택"
                    />
                  </View>
                </View>
                {datePickerMode && (
                  <>
                    <DateTimePicker
                      value={meetupAt ?? new Date()}
                      mode={datePickerMode}
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      minimumDate={datePickerMode === 'date' ? new Date() : undefined}
                      onChange={(event, picked) => {
                        if (Platform.OS !== 'ios') setDatePickerMode(null);
                        if (event.type === 'dismissed') return;
                        if (picked) {
                          const base = meetupAt ?? new Date();
                          const next = new Date(base);
                          if (datePickerMode === 'date') {
                            next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
                          } else {
                            next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
                          }
                          setMeetupAt(next);
                        }
                      }}
                    />
                    {Platform.OS === 'ios' && (
                      <Pressable
                        onPress={() => setDatePickerMode(null)}
                        className="self-end px-3 py-1.5 mt-1 active:opacity-60"
                      >
                        <Text className="text-brand-primary text-sm font-semibold">완료</Text>
                      </Pressable>
                    )}
                  </>
                )}
                {meetupAt && (
                  <View className="mt-1 flex-row items-center gap-1.5 px-1">
                    <Feather name="info" size={12} color={c.text.tertiary} />
                    <Text className="text-text-tertiary text-xs font-semibold">
                      {formatMeetupAt(meetupAt)}
                    </Text>
                  </View>
                )}
              </Section>

              <Section
                title="자유 장소"
                icon="map-pin"
                desc='암장 모임이면 아래 "관련 암장"에서 선택, 그 외면 여기에 자유 입력.'
              >
                <FormInput
                  leadingIcon="map-pin"
                  placeholder={gymId ? '암장 선택됨 — 추가 안내 (선택)' : '예: 양재 시민의 숲, OO공원 입구 …'}
                  value={meetupLocation}
                  onChangeText={(t) => setMeetupLocation(t.slice(0, LOCATION_MAX))}
                  maxLength={LOCATION_MAX}
                />
              </Section>

              <Section title="정원 (선택)" icon="users">
                <FormInput
                  leadingIcon="users"
                  placeholder="비워두면 무제한"
                  value={meetupCapacity}
                  onChangeText={(t) => setMeetupCapacity(t.replace(/[^\d]/g, '').slice(0, 3))}
                  keyboardType="number-pad"
                  trailingUnit="명"
                />
              </Section>
            </>
          )}

          <Section title="제목" icon="type">
            <FormInput
              placeholder="제목 (선택, 최대 60자)"
              value={title}
              onChangeText={(t) => setTitle(t.slice(0, TITLE_MAX))}
              maxLength={TITLE_MAX}
            />
          </Section>

          <Section title="본문" required icon="align-left">
            <FormInput
              placeholder="자유롭게 써주세요 (최대 1000자)"
              value={body}
              onChangeText={(t) => setBody(t.slice(0, BODY_MAX))}
              maxLength={BODY_MAX}
              multiline
              inputStyle={{ minHeight: 160 }}
            />
            <Text className="text-text-tertiary text-xs text-right mt-1">
              {body.length} / {BODY_MAX}
            </Text>
          </Section>

          <Section title="관련 암장">
            <View className="flex-row flex-wrap gap-2">
              <Chip
                label="장소 검색"
                icon={<Feather name="search" size={14} color={c.text.tertiary} />}
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

          <PollComposer value={poll} onChange={setPoll} />

          <Section title="사진">
            <View className="flex-row flex-wrap gap-2">
              {pickedAssets.map((a, idx) => (
                <View key={`${a.uri}-${idx}`} className="relative">
                  <Image
                    source={{ uri: a.uri }}
                    className="w-20 h-20 rounded-xl"
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => removeAssetAt(idx)}
                    hitSlop={6}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-background-primary border border-border-default items-center justify-center active:opacity-70"
                  >
                    <Feather name="x" size={12} color={c.text.tertiary} />
                  </Pressable>
                </View>
              ))}
              {pickedAssets.length < MAX_IMAGES && (
                <Pressable
                  onPress={handlePickImages}
                  className="w-20 h-20 rounded-xl border border-dashed border-border-default items-center justify-center bg-background-secondary active:opacity-70"
                >
                  <Feather name="plus" size={18} color={c.text.tertiary} />
                  <Text className="text-text-tertiary text-[10px] mt-1">
                    {pickedAssets.length}/{MAX_IMAGES}
                  </Text>
                </Pressable>
              )}
            </View>
            <Text className="text-text-tertiary text-xs">
              최대 {MAX_IMAGES}장. JPEG로 압축돼 업로드돼요.
            </Text>
          </Section>
        </ScrollView>

        <BottomCTA
          label={uploading ? '업로드 중…' : createPost.isPending ? '등록 중…' : '등록'}
          icon="check"
          onPress={handleSubmit}
          loading={uploading || createPost.isPending}
          disabled={!canSubmit}
        />
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
