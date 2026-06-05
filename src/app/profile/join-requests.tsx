import { customAlert } from '@/components/ui/custom-alert';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
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

import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  useCancelJoinRequest,
  useMyJoinRequests,
  type CrewJoinRequest,
} from '@/hooks/use-crew-requests';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

function relativeDate(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  const d = new Date(iso);
  return `${d.getFullYear().toString().slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function MyJoinRequestsScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error } = useMyJoinRequests();

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader title="가입 요청" onBack={() => router.back()} count={data?.length} />

      <ScrollView
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 12 }]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && <ActivityIndicator color={c.brand.primary} style={{ marginTop: 32 }} />}
        {error && <Text style={s.error}>{error.message}</Text>}
        {data && data.length === 0 && !isLoading && (
          <EmptyState
            icon="send"
            title="보낸 요청이 없어요"
            description={'크루 검색에서 마음에 드는 크루를 찾아\n가입 요청을 보내 보세요'}
          />
        )}
        {data?.map((r) => (
          <RequestRow key={r.id} request={r} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function RequestRow({ request }: { request: CrewJoinRequest }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const cancel = useCancelJoinRequest();
  const crewName = request.crew?.name ?? '크루';
  const firstChar = crewName.length > 0 ? crewName.charAt(0).toUpperCase() : '?';
  const time = relativeDate(request.created_at);

  function handleCancel() {
    customAlert(`${crewName} 가입 요청을 취소할까요?`, undefined, [
      { text: '계속 대기', style: 'cancel' },
      {
        text: '요청 취소',
        style: 'destructive',
        onPress: () =>
          cancel
            .mutateAsync(request.id)
            .catch((e) => customAlert('실패', e instanceof Error ? e.message : '오류')),
      },
    ]);
  }

  return (
    <View style={s.row}>
      <Pressable
        onPress={() =>
          router.push({ pathname: '/crew/[id]', params: { id: request.crew_id } } as never)
        }
      >
        {({ pressed }) => (
          <View style={[s.rowMain, pressed && { opacity: 0.7 }]}>
        <View style={s.avatar}>
          {request.crew?.image_url ? (
            <Image source={{ uri: request.crew.image_url }} style={s.avatarImg} />
          ) : (
            <Text style={s.avatarText}>{firstChar}</Text>
          )}
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={s.title} numberOfLines={1}>{crewName}</Text>
          <View style={s.statusPill}>
            <Feather name="clock" size={10} color={c.status.warning} />
            <Text style={s.statusPillText}>크루장 승인 대기</Text>
          </View>
          {request.message && (
            <View style={s.messageBox}>
              <Text style={s.messageLabel}>내가 남긴 메시지</Text>
              <Text style={s.message} numberOfLines={3}>"{request.message}"</Text>
            </View>
          )}
          <Text style={s.meta}>{time}</Text>
        </View>
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={handleCancel}
        disabled={cancel.isPending}
        hitSlop={6}
      >
        {({ pressed }) => (
          <View style={[s.cancelBtn, pressed && { opacity: 0.7 }, cancel.isPending && { opacity: 0.5 }]}>
            <Feather name="x" size={13} color={c.text.secondary} />
            <Text style={s.cancelText}>취소</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    list: { padding: 18, gap: 12, paddingBottom: 12 },
    error: { color: c.status.danger, textAlign: 'center', marginTop: 16 },
    emptyBox: { alignItems: 'center', paddingVertical: 56, gap: 10 },
    emptyIcon: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.brand.primaryLight,
      alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: { fontSize: 15, fontWeight: '900', color: c.text.primary },
    emptySub: { fontSize: 12, color: c.text.tertiary, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: c.bg.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      borderRadius: 14,
      padding: 14,
    },
    rowMain: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
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
    title: { fontSize: 14.5, fontWeight: '900', color: c.text.primary, letterSpacing: -0.2 },
    statusPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      alignSelf: 'flex-start',
      paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999,
      backgroundColor: c.status.warningBg,
    },
    statusPillText: { fontSize: 10.5, fontWeight: '800', color: c.status.warning, letterSpacing: 0.2 },
    messageBox: {
      backgroundColor: c.bg.subtle,
      borderRadius: 8,
      paddingHorizontal: 9,
      paddingVertical: 7,
      gap: 2,
      marginTop: 2,
    },
    messageLabel: {
      fontSize: 9.5, fontWeight: '800', color: c.text.tertiary,
      letterSpacing: 0.3, textTransform: 'uppercase',
    },
    message: { fontSize: 12, color: c.text.secondary, fontWeight: '600', lineHeight: 17 },
    meta: { fontSize: 11, color: c.text.muted, fontWeight: '700' },
    cancelBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: c.bg.subtle,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
    },
    cancelText: { fontSize: 12, fontWeight: '800', color: c.text.secondary },
  });
}
