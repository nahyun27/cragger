import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '@/lib/auth-context';
import {
  useCrewDetail,
  useDeleteCrew,
  useKickMember,
  useLeaveCrew,
  type CrewMember,
} from '@/hooks/use-crews';
import { useCrewFeed, useMyLikes, useToggleLike, type PostRow } from '@/hooks/use-community';

function getAvatarBg(name: string) {
  const colors = ['#e0f2fe', '#fef3c7', '#dcfce7', '#f3e8ff', '#fee2e2', '#e0e7ff'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}

function getAvatarFg(name: string) {
  const colors = ['#0369a1', '#b45309', '#15803d', '#6b21a8', '#b91c1c', '#4338ca'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}

export default function CrewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session: authSession } = useAuth();
  const meId = authSession?.user.id;
  const { data, isLoading, error } = useCrewDetail(id);
  const leaveCrew = useLeaveCrew();
  const deleteCrew = useDeleteCrew();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center" edges={['top']}>
        <ActivityIndicator color="#06b6d4" />
      </SafeAreaView>
    );
  }
  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center p-6" edges={['top']}>
        <Text className="text-status-danger text-sm font-semibold mb-3">
          {error?.message ?? '크루를 찾을 수 없어요'}
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

  const isOwner = data.my_role === 'owner';
  const isMember = data.my_role != null;

  function handleCopyCode() {
    if (!data) return;
    // expo-clipboard 미설치 — 일단 코드를 다이얼로그로 안내, 길게 눌러 복사.
    Alert.alert('초대코드', data.invite_code, [{ text: '확인' }]);
  }

  function handleLeave() {
    if (!data) return;
    Alert.alert('크루를 나갈까요?', '다시 들어오려면 초대코드가 필요해요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveCrew.mutateAsync(data.id);
            router.replace('/(tabs)/profile');
          } catch (e) {
            Alert.alert('실패', e instanceof Error ? e.message : '알 수 없는 오류');
          }
        },
      },
    ]);
  }

  function handleDelete() {
    if (!data) return;
    Alert.alert('크루를 삭제할까요?', '모든 멤버가 빠지고 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCrew.mutateAsync(data.id);
            router.replace('/(tabs)/profile');
          } catch (e) {
            Alert.alert('실패', e instanceof Error ? e.message : '알 수 없는 오류');
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </Pressable>
        <Text className="text-text-primary text-base font-bold">크루</Text>
        {isOwner ? (
          <Pressable onPress={handleDelete} className="p-2 active:opacity-60" hitSlop={8}>
            <Feather name="trash-2" size={20} color="#ef4444" />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView contentContainerClassName="p-5 gap-6 pb-8">
        {/* Hero — 로고/이름/소개 */}
        <View className="items-center gap-3 pt-1">
          <View
            className="w-24 h-24 rounded-full bg-brand-primary/10 border-2 border-brand-primary items-center justify-center overflow-hidden"
            style={{
              shadowColor: '#06b6d4',
              shadowOpacity: 0.18,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
            }}
          >
            {data.image_url ? (
              <Image source={{ uri: data.image_url }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Feather name="users" size={32} color="#06b6d4" />
            )}
          </View>
          <Text className="text-text-primary text-xl font-extrabold" numberOfLines={2}>
            {data.name}
          </Text>
          {data.home_gym && (
            <View className="flex-row items-center gap-1.5">
              <Feather name="map-pin" size={12} color="#64748b" />
              <Text className="text-text-tertiary text-xs font-semibold">
                {data.home_gym.name}
                {data.home_gym.branch ? ` ${data.home_gym.branch}` : ''}
              </Text>
            </View>
          )}
          {data.description && (
            <Text className="text-text-secondary text-sm leading-5 text-center px-3">
              {data.description}
            </Text>
          )}
        </View>

        {/* 초대코드 (멤버에게만) */}
        {isMember && (
          <View className="bg-brand-primary/5 border border-brand-primary/15 rounded-2xl p-4 gap-2">
            <Text className="text-brand-primary text-xs font-bold">초대코드</Text>
            <Pressable
              onPress={handleCopyCode}
              className="flex-row items-center justify-between bg-white border border-border-subtle rounded-xl px-4 py-3 active:opacity-70"
            >
              <Text
                className="text-text-primary text-xl font-extrabold"
                style={{ letterSpacing: 6 }}
              >
                {data.invite_code}
              </Text>
              <View className="flex-row items-center gap-1.5">
                <Feather name="copy" size={14} color="#06b6d4" />
                <Text className="text-brand-primary text-xs font-bold">복사</Text>
              </View>
            </Pressable>
            <Text className="text-text-tertiary text-xs">
              친구에게 이 코드를 알려주면 크루에 가입할 수 있어요
            </Text>
          </View>
        )}

        {/* 멤버 목록 */}
        <View className="gap-3">
          <View className="flex-row items-baseline justify-between px-1">
            <Text className="text-text-primary text-base font-extrabold">
              멤버 <Text className="text-text-tertiary">{data.member_count}</Text>
            </Text>
          </View>
          <View className="bg-background-secondary border border-border-subtle rounded-2xl divide-y divide-border-subtle overflow-hidden">
            {data.members.map((m, i) => (
              <MemberRow
                key={m.user_id}
                member={m}
                isOwnerView={isOwner}
                isMe={m.user_id === meId}
                crewId={data.id}
                isLast={i === data.members.length - 1}
              />
            ))}
          </View>
        </View>

        {/* 크루 피드 */}
        {isMember && <CrewFeedSection crewId={data.id} />}

        {/* 모임/대결 placeholder */}
        <View className="bg-background-secondary border border-border-subtle rounded-2xl p-4 items-center gap-1">
          <Feather name="info" size={14} color="#94a3b8" />
          <Text className="text-text-tertiary text-xs font-semibold text-center">
            크루 모임·대결 기능은 곧 추가될 예정입니다
          </Text>
        </View>

        {/* 탈퇴 (member 만) */}
        {isMember && !isOwner && (
          <Pressable
            onPress={handleLeave}
            className="border border-status-danger/30 rounded-xl py-3.5 items-center active:opacity-70"
          >
            <Text className="text-status-danger text-sm font-bold">크루 나가기</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CrewFeedSection({ crewId }: { crewId: string }) {
  const router = useRouter();
  const feed = useCrewFeed(crewId);
  const { data: likedSet } = useMyLikes();
  const posts = feed.data?.pages.flat() ?? [];

  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between px-1">
        <Text className="text-text-primary text-base font-extrabold">
          크루 피드
        </Text>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/community/new', params: { crewId } } as never)
          }
          hitSlop={6}
        >
          {({ pressed }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: '#06b6d4',
                opacity: pressed ? 0.85 : 1,
                shadowColor: '#06b6d4',
                shadowOpacity: 0.25,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              <Feather name="edit-3" size={12} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>
                글쓰기
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {feed.isLoading && (
        <View className="py-6 items-center">
          <ActivityIndicator color="#06b6d4" />
        </View>
      )}

      {feed.error && (
        <View className="p-4 rounded-2xl bg-status-danger/10 border border-status-danger/20">
          <Text className="text-status-danger text-xs font-semibold">
            {feed.error.message}
          </Text>
        </View>
      )}

      {!feed.isLoading && posts.length === 0 && (
        <View className="p-6 items-center gap-2 bg-background-secondary border border-border-subtle rounded-2xl">
          <Feather name="message-square" size={20} color="#94a3b8" />
          <Text className="text-text-tertiary text-sm font-semibold">
            크루 첫 글을 남겨보세요
          </Text>
        </View>
      )}

      {posts.length > 0 && (
        <View className="gap-2">
          {posts.map((p) => (
            <CrewPostCard
              key={p.id}
              post={p}
              liked={likedSet?.has(p.id) ?? false}
              onPress={() =>
                router.push({ pathname: '/community/[id]', params: { id: p.id } })
              }
            />
          ))}
        </View>
      )}
    </View>
  );
}

function CrewPostCard({
  post,
  liked,
  onPress,
}: {
  post: PostRow;
  liked: boolean;
  onPress: () => void;
}) {
  const toggle = useToggleLike();
  const author = post.author?.display_name || post.author?.username || '익명';
  const initial = (author[0] ?? '?').toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}
    >
      <View
        style={{
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: '#e2e8f0',
          borderRadius: 16,
          padding: 14,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#e0f2fe',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {post.author?.avatar_url ? (
              <Image
                source={{ uri: post.author.avatar_url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#0369a1' }}>
                {initial}
              </Text>
            )}
          </View>
          <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#0f172a' }}>
            {author}
          </Text>
        </View>
        {post.title && (
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }} numberOfLines={1}>
            {post.title}
          </Text>
        )}
        <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18 }} numberOfLines={3}>
          {post.body}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 2 }}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (toggle.isPending) return;
              toggle.mutate({ postId: post.id, currentlyLiked: liked });
            }}
            hitSlop={6}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Feather name="heart" size={14} color={liked ? '#ef4444' : '#94a3b8'} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: liked ? '#ef4444' : '#64748b' }}>
                {post.like_count}
              </Text>
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Feather name="message-circle" size={14} color="#94a3b8" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>
              {post.comment_count}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function MemberRow({
  member,
  isOwnerView,
  isMe,
  crewId,
  isLast,
}: {
  member: CrewMember;
  isOwnerView: boolean;
  isMe: boolean;
  crewId: string;
  isLast: boolean;
}) {
  const kick = useKickMember();
  const name = member.user?.display_name || member.user?.username || '익명';
  const avatarBg = getAvatarBg(name);
  const avatarFg = getAvatarFg(name);
  const avatarUrl = member.user?.avatar_url;
  const showKick = isOwnerView && !isMe && member.role !== 'owner';

  function handleKick() {
    Alert.alert(
      `${name} 님을 추방할까요?`,
      '다시 가입하려면 초대코드가 필요해요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '추방',
          style: 'destructive',
          onPress: () =>
            kick.mutate(
              { crewId, userId: member.user_id },
              { onError: (e) => Alert.alert('실패', e instanceof Error ? e.message : '오류') },
            ),
        },
      ],
    );
  }

  return (
    <View
      className={`flex-row items-center gap-3 px-4 py-3 bg-white ${isLast ? '' : 'border-b border-border-subtle'}`}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center overflow-hidden"
        style={{ backgroundColor: avatarBg }}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Text style={{ color: avatarFg, fontSize: 14, fontWeight: '800' }}>
            {(name[0] ?? '?').toUpperCase()}
          </Text>
        )}
      </View>
      <Text className="flex-1 text-text-primary text-sm font-bold" numberOfLines={1}>
        {name}
        {isMe && <Text className="text-text-tertiary text-xs font-semibold">  (나)</Text>}
      </Text>
      {member.role === 'owner' && (
        <View className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
          <Text className="text-amber-700 text-[10px] font-extrabold">OWNER</Text>
        </View>
      )}
      {showKick && (
        <Pressable
          onPress={handleKick}
          hitSlop={6}
          className="px-2 py-1 active:opacity-60"
        >
          <Feather name="user-x" size={16} color="#ef4444" />
        </Pressable>
      )}
    </View>
  );
}
