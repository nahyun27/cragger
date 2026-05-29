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

import { useRecruitingCrews, type CrewSummary } from '@/hooks/use-crews';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

export default function ExploreCrewsScreen() {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { data, isLoading, error } = useRecruitingCrews();

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
        <Text style={s.headerTitle}>공개 모집 크루</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {isLoading && (
          <View style={s.loaderWrap}>
            <ActivityIndicator color={c.brand.primary} />
          </View>
        )}
        {error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error.message}</Text>
          </View>
        )}
        {data && data.length === 0 && (
          <View style={s.emptyBox}>
            <Feather name="users" size={28} color={c.text.muted} />
            <Text style={s.emptyTitle}>지금 모집 중인 크루가 없어요</Text>
            <Text style={s.emptySub}>나중에 다시 확인해보세요</Text>
          </View>
        )}
        {data?.map((crew) => (
          <RecruitingCrewCard key={crew.id} crew={crew} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export function RecruitingCrewCard({ crew }: { crew: CrewSummary }) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const firstChar = crew.name.length > 0 ? crew.name.charAt(0).toUpperCase() : '?';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/crew/[id]', params: { id: crew.id } } as never)}
      style={({ pressed }) => [s.card, pressed && { opacity: 0.92 }]}
    >
      <View style={s.cardAvatar}>
        {crew.image_url ? (
          <Image source={{ uri: crew.image_url }} style={s.cardAvatarImg} />
        ) : (
          <Text style={s.cardAvatarText}>{firstChar}</Text>
        )}
      </View>
      <View style={s.cardBody}>
        <View style={s.cardTitleRow}>
          <Text style={s.cardTitle} numberOfLines={1}>{crew.name}</Text>
          <View style={s.recruitingChip}>
            <Text style={s.recruitingChipText}>모집중</Text>
          </View>
        </View>
        <View style={s.cardMetaRow}>
          {crew.region && (
            <View style={s.cardMetaItem}>
              <Feather name="map-pin" size={10} color={c.text.tertiary} />
              <Text style={s.cardMetaText}>{crew.region}</Text>
            </View>
          )}
          <View style={s.cardMetaItem}>
            <Feather name="users" size={10} color={c.text.tertiary} />
            <Text style={s.cardMetaText}>{crew.member_count}명</Text>
          </View>
        </View>
        {crew.description && (
          <Text style={s.cardDesc} numberOfLines={2}>{crew.description}</Text>
        )}
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
      padding: 20,
      gap: 12,
    },
    loaderWrap: { alignItems: 'center', paddingVertical: 32 },
    errorBox: {
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
      fontWeight: '800',
      color: c.text.secondary,
    },
    emptySub: {
      fontSize: 12,
      color: c.text.muted,
      fontWeight: '600',
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.bg.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      borderRadius: 16,
      padding: 14,
    },
    cardAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.bg.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    cardAvatarImg: { width: '100%', height: '100%' },
    cardAvatarText: {
      fontSize: 20,
      fontWeight: '900',
      color: c.text.secondary,
    },
    cardBody: { flex: 1, gap: 4 },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    cardTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
      color: c.text.primary,
    },
    recruitingChip: {
      backgroundColor: c.status.successBg,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    recruitingChipText: {
      color: c.status.success,
      fontSize: 10,
      fontWeight: '800',
    },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    cardMetaText: {
      fontSize: 11,
      color: c.text.tertiary,
      fontWeight: '700',
    },
    cardDesc: {
      fontSize: 12,
      color: c.text.secondary,
      lineHeight: 17,
      marginTop: 2,
    },
  });
}
