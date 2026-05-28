import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  type Notification,
} from '@/hooks/use-notifications';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

function getTypeIcon(type: string, c: ThemeColors): {
  name: keyof typeof Feather.glyphMap;
  color: string;
  bg: string;
} {
  if (type === 'crew_announcement') {
    return { name: 'volume-2', color: c.brand.primaryDeep, bg: c.brand.primaryLight };
  }
  return { name: 'bell', color: c.text.secondary, bg: c.bg.subtle };
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data, isLoading, error } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const hasUnread = (data ?? []).some((n) => !n.read_at);

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
        <Text style={s.headerTitle}>알림</Text>
        {hasUnread ? (
          <Pressable onPress={() => markAll.mutate()} hitSlop={8}>
            {({ pressed }) => (
              <View style={[s.allReadBtn, pressed && { opacity: 0.6 }]}>
                <Text style={s.allReadText}>모두 읽음</Text>
              </View>
            )}
          </Pressable>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {isLoading && (
        <View style={s.center}>
          <ActivityIndicator color={c.brand.primary} />
        </View>
      )}

      {error && (
        <View style={s.center}>
          <Text style={s.errorText}>{error.message}</Text>
        </View>
      )}

      {data && data.length === 0 && (
        <View style={s.center}>
          <Feather name="bell-off" size={32} color={c.border.strong} />
          <Text style={s.emptyTitle}>알림이 없어요</Text>
          <Text style={s.emptySubtitle}>크루 공지가 올라오면 여기로 알려드릴게요</Text>
        </View>
      )}

      {data && data.length > 0 && (
        <ScrollView contentContainerStyle={s.list}>
          {data.map((n) => (
            <NotificationRow
              key={n.id}
              n={n}
              onPress={() => {
                if (!n.read_at) markRead.mutate(n.id);
                if (n.link) router.push(n.link as never);
              }}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function NotificationRow({ n, onPress }: { n: Notification; onPress: () => void }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const icon = getTypeIcon(n.type, c);
  const unread = !n.read_at;
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View style={[s.row, pressed && { opacity: 0.7 }]}>
          <View style={[s.iconBox, { backgroundColor: icon.bg }]}>
            <Feather name={icon.name} size={16} color={icon.color} />
          </View>
          <View style={s.rowContent}>
            <View style={s.rowHeader}>
              <Text style={[s.title, unread && s.titleUnread]} numberOfLines={2}>
                {n.title}
              </Text>
              {unread && <View style={s.unreadDot} />}
            </View>
            {n.body && (
              <Text style={s.body} numberOfLines={2}>
                {n.body}
              </Text>
            )}
            <Text style={s.time}>{formatRelative(n.created_at)}</Text>
          </View>
        </View>
      )}
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
      paddingVertical: 8,
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
    allReadBtn: {
      paddingHorizontal: 10,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bg.subtle,
    },
    allReadText: { fontSize: 12, fontWeight: '600', color: c.text.secondary },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
    errorText: { fontSize: 14, color: c.status.danger },
    emptyTitle: { fontSize: 15, fontWeight: '600', color: c.text.primary, marginTop: 8 },
    emptySubtitle: { fontSize: 13, color: c.text.tertiary, textAlign: 'center' },
    list: { padding: 16, gap: 8 },
    row: {
      flexDirection: 'row',
      gap: 12,
      padding: 14,
      backgroundColor: c.bg.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border.subtle,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowContent: { flex: 1, gap: 4 },
    rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { flex: 1, fontSize: 14, fontWeight: '500', color: c.text.secondary },
    titleUnread: { color: c.text.primary, fontWeight: '700' },
    body: { fontSize: 13, color: c.text.tertiary, lineHeight: 18 },
    time: { fontSize: 11, color: c.text.muted, marginTop: 2 },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.status.danger,
    },
  });
}
