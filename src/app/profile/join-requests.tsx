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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import {
  useCancelJoinRequest,
  useMyJoinRequests,
  type CrewJoinRequest,
} from '@/hooks/use-crew-requests';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

export default function MyJoinRequestsScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { data, isLoading, error } = useMyJoinRequests();

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
        <Text style={s.headerTitle}>내가 보낸 가입 요청</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {isLoading && <ActivityIndicator color={c.brand.primary} style={{ marginTop: 32 }} />}
        {error && <Text style={s.error}>{error.message}</Text>}
        {data && data.length === 0 && (
          <View style={s.emptyBox}>
            <Feather name="send" size={28} color={c.text.muted} />
            <Text style={s.emptyTitle}>보낸 가입 요청이 없어요</Text>
            <Text style={s.emptySub}>크루 검색이나 커뮤니티에서 가입할 크루를 찾아보세요</Text>
          </View>
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
        style={({ pressed }) => [s.rowMain, pressed && { opacity: 0.6 }]}
      >
        <View style={s.avatar}>
          {request.crew?.image_url ? (
            <Image source={{ uri: request.crew.image_url }} style={s.avatarImg} />
          ) : (
            <Text style={s.avatarText}>{firstChar}</Text>
          )}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={s.title} numberOfLines={1}>{crewName}</Text>
          {request.message && (
            <Text style={s.message} numberOfLines={2}>"{request.message}"</Text>
          )}
          <View style={s.metaRow}>
            <Feather name="clock" size={11} color={c.text.tertiary} />
            <Text style={s.meta}>
              크루장 승인 대기 · {new Date(request.created_at).toLocaleDateString('ko-KR')}
            </Text>
          </View>
        </View>
      </Pressable>
      <Pressable onPress={handleCancel} hitSlop={6}>
        {({ pressed }) => (
          <View style={[s.cancelBtn, pressed && { opacity: 0.7 }]}>
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
    headerBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: c.text.primary, fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
    list: { padding: 20, gap: 12 },
    error: { color: c.status.danger, textAlign: 'center', marginTop: 16 },
    emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 8 },
    emptyTitle: { fontSize: 14, fontWeight: '800', color: c.text.secondary },
    emptySub: { fontSize: 12, color: c.text.muted, fontWeight: '600', textAlign: 'center' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.bg.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      borderRadius: 14,
      padding: 14,
    },
    rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
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
    title: { fontSize: 14, fontWeight: '800', color: c.text.primary },
    message: { fontSize: 12, color: c.text.secondary, fontStyle: 'italic' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    meta: { fontSize: 11, color: c.text.tertiary, fontWeight: '600' },
    cancelBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: c.bg.subtle,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
    },
    cancelText: { fontSize: 12, fontWeight: '800', color: c.text.secondary },
  });
}
