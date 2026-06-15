import { useRouter } from '@/lib/router';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { EmptyState } from '@/components/ui/empty-state';
import { FeaturedBadgeChip } from '@/components/ui/featured-badge-chip';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useFollowers, useFollowing, type FollowUserMini } from '@/hooks/use-follows';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

type Tab = 'followers' | 'following';

export function FollowListScreen({ userId, initialTab = 'followers' }: { userId: string | undefined; initialTab?: Tab }) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = React.useState<Tab>(initialTab);

  const followersQ = useFollowers(userId);
  const followingQ = useFollowing(userId);

  const query = tab === 'followers' ? followersQ : followingQ;
  const count = query.data?.length ?? 0;

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader
        title={tab === 'followers' ? '팔로워' : '팔로잉'}
        count={count}
        onBack={() => router.back()}
      />

      {/* Tab bar */}
      <View style={s.segControl}>
        <Pressable
          onPress={() => setTab('followers')}
          style={[s.segItem, tab === 'followers' && s.segItemActive]}
        >
          <Text style={[s.segText, tab === 'followers' && s.segTextActive]}>
            팔로워{followersQ.data != null ? ` ${followersQ.data.length}` : ''}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('following')}
          style={[s.segItem, tab === 'following' && s.segItemActive]}
        >
          <Text style={[s.segText, tab === 'following' && s.segTextActive]}>
            팔로잉{followingQ.data != null ? ` ${followingQ.data.length}` : ''}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        key={tab}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 12 }]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
      >
        {query.isLoading && (
          <View style={s.loaderWrap}>
            <ActivityIndicator color={c.brand.primary} />
          </View>
        )}

        {query.error && (
          <EmptyState
            icon="alert-triangle"
            tone="danger"
            title="목록을 불러오지 못했어요"
            description={query.error.message}
          />
        )}

        {query.data && query.data.length === 0 && (
          <EmptyState
            icon="users"
            tone="muted"
            title={tab === 'followers' ? '아직 팔로워가 없어요' : '아직 팔로우한 사용자가 없어요'}
            description={
              tab === 'followers'
                ? '활동을 꾸준히 올리면 새 팔로워가 생겨요'
                : '관심 있는 클라이머를 팔로우 해보세요'
            }
          />
        )}

        {query.data && query.data.length > 0 && (
          <View style={s.userList}>
            {query.data.map((u, idx) => (
              <UserRow
                key={u.id}
                user={u}
                isLast={idx === query.data!.length - 1}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function UserRow({ user, isLast }: { user: FollowUserMini; isLast: boolean }) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const name = user.display_name || user.username;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/u/[id]', params: { id: user.id } } as never)}
    >
      {({ pressed }) => (
        <View style={[s.row, isLast && s.rowLast, pressed && { opacity: 0.7 }]}>
          <UserAvatar
            userKey={user.id}
            username={name}
            avatarUrl={user.avatar_url}
            size={44}
          />
          <View style={s.userTextCol}>
            <View style={s.userNameRow}>
              <Text style={s.userName} numberOfLines={1}>{name}</Text>
              <FeaturedBadgeChip
                badgeKey={(user as { featured_badge_key?: string | null }).featured_badge_key}
                size={11}
              />
            </View>
            <Text style={s.userHandle} numberOfLines={1}>@{user.username}</Text>
          </View>
          <Feather name="chevron-right" size={16} color={c.text.muted} />
        </View>
      )}
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },

    // 세그먼트 컨트롤
    segControl: {
      flexDirection: 'row',
      marginHorizontal: 18,
      marginTop: 14,
      marginBottom: 10,
      backgroundColor: c.bg.subtle,
      borderRadius: 14,
      padding: 3,
    },
    segItem: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 11,
      alignItems: 'center',
    },
    segItemActive: {
      backgroundColor: c.brand.primary,
    },
    segText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text.tertiary,
      letterSpacing: -0.2,
    },
    segTextActive: {
      color: '#ffffff',
      fontWeight: '900',
    },
    list: { padding: 18, gap: 16 },
    loaderWrap: { paddingVertical: 32, alignItems: 'center' },

    userList: {
      backgroundColor: c.bg.card,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.subtle,
    },
    rowLast: { borderBottomWidth: 0 },
    avatarWrap: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.bg.subtle,
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarFallback: {
      fontSize: 17,
      fontWeight: '900',
      color: c.brand.primary,
    },
    userTextCol: { flex: 1, gap: 3 },
    userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    userName: {
      fontSize: 14,
      fontWeight: '900',
      color: c.text.primary,
      letterSpacing: -0.2,
      flexShrink: 1,
    },
    userHandle: {
      fontSize: 11.5,
      fontWeight: '700',
      color: c.text.tertiary,
    },
  });
}
