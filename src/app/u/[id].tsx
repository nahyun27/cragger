import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '@/lib/auth-context';
import {
  usePublicProfile,
  type ArchType,
  type FootShape,
  type FootWidth,
  type InstepHeight,
} from '@/hooks/use-profile';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

const FOOT_SHAPE_LABEL: Record<FootShape, string> = {
  egyptian: '이집트형',
  greek: '그리스형',
  roman: '로마형',
  square: '정사각형',
};
const FOOT_WIDTH_LABEL: Record<FootWidth, string> = {
  narrow: '좁음',
  normal: '보통',
  wide: '넓음',
  very_wide: '매우 넓음',
};
const INSTEP_LABEL: Record<InstepHeight, string> = {
  low: '낮은 발등',
  normal: '보통 발등',
  high: '높은 발등',
};
const ARCH_LABEL: Record<ArchType, string> = {
  flat: '평발',
  normal: '보통 아치',
  high: '높은 아치',
};

function formatClimbingDuration(iso: string): string {
  const start = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(start.getTime())) return '';
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 1) return '한 달 미만';
  if (months < 12) return `${months}개월`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${years}년` : `${years}년 ${rem}개월`;
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session: authSession } = useAuth();
  const { data: profile, isLoading, error } = usePublicProfile(id);
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  // 본인 프로필이면 마이페이지로
  if (authSession?.user.id === id) {
    router.replace('/(tabs)/profile');
    return null;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.center} edges={['top']}>
        <ActivityIndicator color={c.brand.primary} />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={s.center} edges={['top']}>
        <Text style={s.errorText}>{error?.message ?? '프로필을 찾을 수 없어요'}</Text>
      </SafeAreaView>
    );
  }

  const username = profile.username;
  const displayName = profile.display_name || username;
  const firstChar = displayName.length > 0 ? displayName.charAt(0).toUpperCase() : '?';

  const footChips = [
    profile.foot_length_mm != null ? `${profile.foot_length_mm}mm` : null,
    profile.shoe_size_mm != null ? `운동화 ${profile.shoe_size_mm}mm` : null,
    profile.foot_shape ? FOOT_SHAPE_LABEL[profile.foot_shape] : null,
    profile.foot_width ? `${FOOT_WIDTH_LABEL[profile.foot_width]} 폭` : null,
    profile.instep_height ? INSTEP_LABEL[profile.instep_height] : null,
    profile.arch_type ? ARCH_LABEL[profile.arch_type] : null,
  ].filter(Boolean) as string[];

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
        <Text style={s.headerTitle}>프로필</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* Hero */}
        <View style={s.heroCard}>
          <View style={s.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatarImage} resizeMode="cover" />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarFallbackText}>{firstChar}</Text>
              </View>
            )}
          </View>
          <Text style={s.profileName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={s.username} numberOfLines={1}>
            @{username}
          </Text>
          {profile.instagram_handle && (
            <Pressable
              onPress={() =>
                Linking.openURL(`https://instagram.com/${profile.instagram_handle}`).catch(() =>
                  Alert.alert('열기 실패', 'Instagram 앱/브라우저를 찾을 수 없어요'),
                )
              }
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              hitSlop={6}
            >
              <View style={s.instaTag}>
                <Feather name="instagram" size={12} color={c.brand.primary} />
                <Text style={s.instaTagText}>@{profile.instagram_handle}</Text>
              </View>
            </Pressable>
          )}
          {profile.bio && (
            <Text style={s.bioText} numberOfLines={4}>
              {profile.bio}
            </Text>
          )}
        </View>

        {/* Body metrics — weight 는 weight_visible 이 true 일 때만 */}
        {(profile.height_cm != null ||
          profile.reach_cm != null ||
          (profile.weight_visible && profile.weight_kg != null) ||
          profile.climbing_start_date) && (
          <View style={s.metricsCard}>
            {profile.height_cm != null && (
              <MetricItem icon="arrow-up-down" label="키" value={`${profile.height_cm} cm`} />
            )}
            {profile.reach_cm != null && (
              <MetricItem icon="arrow-left-right" label="윙스팬" value={`${profile.reach_cm} cm`} />
            )}
            {profile.weight_visible && profile.weight_kg != null && (
              <MetricItem icon="weight" label="몸무게" value={`${profile.weight_kg} kg`} />
            )}
            {profile.climbing_start_date && (
              <MetricItem
                icon="calendar-clock"
                label="클라이밍 경력"
                value={formatClimbingDuration(profile.climbing_start_date)}
              />
            )}
          </View>
        )}

        {/* 발 프로필 */}
        {footChips.length > 0 && (
          <View style={s.sectionCard}>
            <View style={s.sectionTitleRow}>
              <Text style={s.sectionEmoji}>🦶</Text>
              <Text style={s.sectionTitle}>발 프로필</Text>
            </View>
            <View style={s.chipsRow}>
              {footChips.map((c) => (
                <View key={c} style={s.miniChip}>
                  <Text style={s.miniChipText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricItem({
  icon,
  label,
  value,
}: {
  icon: 'arrow-up-down' | 'arrow-left-right' | 'weight' | 'calendar-clock';
  label: string;
  value: string;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.metricRow}>
      <MaterialCommunityIcons name={icon} size={16} color={c.text.secondary} />
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue}>{value}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg.primary },
  errorText: { color: c.status.danger, fontSize: 14 },
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
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },

  heroCard: {
    backgroundColor: c.bg.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: c.border.subtle,
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: c.brand.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: { fontSize: 32, fontWeight: '900', color: c.brand.primaryDeep },
  profileName: {
    fontSize: 18,
    fontWeight: '900',
    color: c.text.primary,
    letterSpacing: -0.3,
  },
  username: { fontSize: 13, color: c.text.tertiary, fontWeight: '600' },
  instaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: c.bg.accent,
    borderWidth: 1,
    borderColor: c.brand.primaryLight,
  },
  instaTagText: { fontSize: 11, fontWeight: '800', color: c.brand.primary },
  bioText: {
    fontSize: 13,
    color: c.text.secondary,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
  },

  metricsCard: {
    backgroundColor: c.bg.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.border.subtle,
    gap: 10,
  },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricLabel: { fontSize: 12, color: c.text.tertiary, fontWeight: '700', flex: 1 },
  metricValue: { fontSize: 13, color: c.text.primary, fontWeight: '800' },

  sectionCard: {
    backgroundColor: c.bg.accent,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.brand.primaryLight,
    gap: 8,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionEmoji: { fontSize: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: c.brand.primaryDeep },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  miniChip: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.brand.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  miniChipText: { fontSize: 11, fontWeight: '700', color: c.brand.primaryDeep },
  });
}
