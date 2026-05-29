import { useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useFollowers, useFollowing, type FollowUserMini } from '@/hooks/use-follows';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

type Mode = 'followers' | 'following';

export function FollowListScreen({ userId, mode }: { userId: string | undefined; mode: Mode }) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const followersQ = useFollowers(mode === 'followers' ? userId : undefined);
  const followingQ = useFollowing(mode === 'following' ? userId : undefined);
  const query = mode === 'followers' ? followersQ : followingQ;
  const title = mode === 'followers' ? '팔로워' : '팔로잉';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          {({ pressed }) => (
            <View style={[s.headerBtn, pressed && { opacity: 0.6 }]}>
              <Feather name="arrow-left" size={22} color={c.text.primary} />
            </View>
          )}
        </Pressable>
        <Text style={s.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {query.isLoading && (
          <View style={s.loaderWrap}>
            <ActivityIndicator color={c.brand.primary} />
          </View>
        )}
        {query.error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{query.error.message}</Text>
          </View>
        )}
        {query.data && query.data.length === 0 && (
          <View style={s.emptyBox}>
            <Feather name="users" size={28} color={c.text.muted} />
            <Text style={s.emptyTitle}>
              {mode === 'followers' ? '아직 팔로워가 없어요' : '아직 팔로우한 사용자가 없어요'}
            </Text>
          </View>
        )}
        {query.data?.map((u) => (
          <UserRow key={u.id} user={u} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function UserRow({ user }: { user: FollowUserMini }) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const name = user.display_name || user.username;
  const firstChar = name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/u/[id]', params: { id: user.id } } as never)}
      style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
    >
      <View style={s.avatar}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={s.avatarImg} />
        ) : (
          <Text style={s.avatarText}>{firstChar}</Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.name}>{name}</Text>
        <Text style={s.handle}>@{user.username}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={c.text.muted} />
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.subtle,
      backgroundColor: c.bg.card,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: c.text.primary,
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: -0.3,
    },
    list: {
      paddingVertical: 8,
    },
    loaderWrap: { alignItems: 'center', paddingVertical: 32 },
    errorBox: {
      margin: 16,
      backgroundColor: c.status.dangerBg,
      borderRadius: 12,
      padding: 16,
    },
    errorText: { color: c.status.danger, fontSize: 13 },
    emptyBox: {
      alignItems: 'center',
      paddingVertical: 48,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text.tertiary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: c.bg.card,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.bg.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: {
      fontSize: 16,
      fontWeight: '900',
      color: c.text.secondary,
    },
    name: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text.primary,
    },
    handle: {
      fontSize: 12,
      color: c.text.tertiary,
      fontWeight: '600',
    },
  });
}
