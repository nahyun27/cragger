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
  const router = useRouter();
  const followersQ = useFollowers(mode === 'followers' ? userId : undefined);
  const followingQ = useFollowing(mode === 'following' ? userId : undefined);
  const query = mode === 'followers' ? followersQ : followingQ;
  const title = mode === 'followers' ? '팔로워' : '팔로잉';

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle bg-background-primary">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          {({ pressed }) => (
            <View className={`w-10 h-10 rounded-xl items-center justify-center ${pressed ? 'opacity-60' : ''}`}>
              <Feather name="arrow-left" size={22} color={c.text.primary} />
            </View>
          )}
        </Pressable>
        <Text className="text-text-primary text-base font-black tracking-tight">{title}</Text>
        <View className="w-10" />
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
        {query.isLoading && (
          <View className="items-center py-8">
            <ActivityIndicator color={c.brand.primary} />
          </View>
        )}
        {query.error && (
          <View className="m-4 bg-status-dangerBg rounded-xl p-4">
            <Text className="text-status-danger text-sm">{query.error.message}</Text>
          </View>
        )}
        {query.data && query.data.length === 0 && (
          <View className="items-center py-12 gap-2">
            <Feather name="users" size={28} color={c.text.muted} />
            <Text className="text-text-tertiary text-sm font-bold">
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
  const router = useRouter();
  const name = user.display_name || user.username;
  const firstChar = name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/u/[id]', params: { id: user.id } } as never)}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <View className="flex-row items-center px-5 py-3 bg-background-primary">
        <View className="w-11 h-11 rounded-full bg-background-subtle items-center justify-center overflow-hidden mr-3">
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} className="w-full h-full" />
          ) : (
            <Text className="text-text-secondary text-base font-black text-center">{firstChar}</Text>
          )}
        </View>
        <View className="flex-1 justify-center gap-1">
          <Text className="text-text-primary text-sm font-extrabold">{name}</Text>
          <Text className="text-text-tertiary text-xs font-semibold">@{user.username}</Text>
        </View>
        <Feather name="chevron-right" size={16} color={c.text.muted} />
      </View>
    </Pressable>
  );
}
