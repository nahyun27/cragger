import { customAlert } from '@/components/ui/custom-alert';
import { BadgeIcon } from '@/components/ui/badge-icon';
import { InstagramIcon } from '@/components/ui/instagram-icon';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '@/lib/auth-context';
import { useUserCrews, type CrewSummary } from '@/hooks/use-crews';
import {
  usePublicProfile,
  type ArchType,
  type FootShape,
  type FootWidth,
  type InstepHeight,
  type Profile,
} from '@/hooks/use-profile';
import {
  SHOE_STATUS_LABEL,
  useShoes,
  type ClimbingShoe,
  type ShoeStatus,
} from '@/hooks/use-shoes';
import { useUnreadCount } from '@/hooks/use-notifications';
import { useUserBadges } from '@/hooks/use-badges';
import {
  useFollow,
  useFollowCounts,
  useIsFollowing,
  useUnfollow,
} from '@/hooks/use-follows';
import { useUserStats } from '@/hooks/use-user-stats';
import {
  BADGES,
  BADGES_BY_KEY,
  BADGE_CATEGORY_LABEL,
  type BadgeCategory,
  type BadgeDef,
} from '@/constants/badges';
import {
  daysFromTodayTo,
  isExpiringSoon,
  isMembershipExpired,
  useMemberships,
  useUsePass,
  type MembershipRow,
} from '@/hooks/use-memberships';
import { currentMonth, monthRange } from '@/lib/date-ranges';
import { supabase } from '@/lib/supabase';
import { useThemeColors, useThemePref, useEffectiveScheme, type ThemeColors, type ThemePref } from '@/lib/theme';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session: authSession } = useAuth();
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const { data: profile } = usePublicProfile(id);
  const isMe = authSession?.user.id === id;

  // 마페이지 카드는 "이번 달" 스코프. 전체 통계는 /stats 라우트로 이동.
  const monthAnchor = React.useMemo(() => currentMonth(), []);
  const thisMonthRange = React.useMemo(
    () => monthRange(monthAnchor.year, monthAnchor.month),
    [monthAnchor],
  );
  const { data: stats, isLoading, error } = useUserStats(thisMonthRange, id);
  const { data: counts } = useFollowCounts(id);
  const { data: isFollowing } = useIsFollowing(id);
  const followMut = useFollow();
  const unfollowMut = useUnfollow();

  // 본인 프로필이면 마이페이지로 redirect — setTimeout 으로 render cycle 밖에서 실행
  React.useEffect(() => {
    if (!isMe) return;
    const t = setTimeout(() => router.replace('/(tabs)/profile'), 0);
    return () => clearTimeout(t);
  }, [isMe, router]);
  if (isMe) return null;

  const isPrivate = profile?.is_private ?? false;
  // 비공개 + 비팔로워 + (본인 아님) → 콘텐츠 가림
  const canSeeContent = !isPrivate || isFollowing === true;

  const username = profile?.username ?? '...';
  const firstChar = username && username.length > 0 ? username.charAt(0).toUpperCase() : '?';

  function handleFollowToggle() {
    if (!id) return;
    if (isFollowing) {
      unfollowMut.mutate(id);
    } else {
      followMut.mutate(id);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header bar */}
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

      <ScrollView style={{ flex: 1, backgroundColor: c.bg.primary }} contentContainerStyle={s.scrollContent}>
        {/* Profile card — 가로 레이아웃 (사진 좌 / 정보 우) */}
        <View style={s.profileCardH}>
          <View style={s.avatarContainerH}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatarImageH} resizeMode="cover" />
            ) : (
              <View style={s.avatarFallbackH}>
                <Text style={s.avatarFallbackTextH}>{firstChar}</Text>
              </View>
            )}
          </View>
          <View style={s.profileInfoH}>
            <View style={s.profileNameRowH}>
              <Text style={s.profileNameH} numberOfLines={1}>{username}</Text>
              {isPrivate && (
                <View style={s.privateChip}>
                  <Feather name="lock" size={10} color={c.text.secondary} />
                  <Text style={s.privateChipText}>비공개</Text>
                </View>
              )}
            </View>
            {profile?.instagram_handle && (
              <Pressable
                onPress={() =>
                  Linking.openURL(`https://instagram.com/${profile.instagram_handle}`).catch(() =>
                    customAlert('열기 실패', 'Instagram 앱/브라우저를 찾을 수 없어요'),
                  )
                }
                hitSlop={6}
              >
                <View style={s.instaTagH}>
                  <InstagramIcon size={12} />
                  <Text style={s.instaTagTextH}>@{profile.instagram_handle}</Text>
                </View>
              </Pressable>
            )}
            {/* 팔로워/팔로잉 가로 — 정보 영역 내 */}
            <View style={s.followStatsRowH}>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/u/[id]/followers', params: { id: id! } } as never)
                }
                hitSlop={4}
              >
                <Text style={s.followStatLineH}>
                  <Text style={s.followStatNumH}>{counts?.followers ?? 0} </Text>
                  <Text style={s.followStatLabelH}>팔로워</Text>
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/u/[id]/following', params: { id: id! } } as never)
                }
                hitSlop={4}
              >
                <Text style={s.followStatLineH}>
                  <Text style={s.followStatNumH}>{counts?.following ?? 0} </Text>
                  <Text style={s.followStatLabelH}>팔로잉</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* 팔로우 버튼 — 카드 아래 full-width */}
        <View style={s.ctaRow}>
          <TouchableOpacity
            onPress={handleFollowToggle}
            disabled={followMut.isPending || unfollowMut.isPending}
            activeOpacity={0.7}
            style={[
              s.ctaBtnBase,
              isFollowing ? s.ctaBtnFollowing : s.ctaBtnFollow,
            ]}
          >
            {(followMut.isPending || unfollowMut.isPending) ? (
              <ActivityIndicator color={isFollowing ? c.brand.primary : c.brand.onPrimary} size="small" />
            ) : (
              <>
                <Feather
                  name={isFollowing ? 'user-check' : 'user-plus'}
                  size={16}
                  color={isFollowing ? c.brand.primary : c.brand.onPrimary}
                />
                <Text style={[
                  s.ctaBtnText,
                  { color: isFollowing ? c.brand.primary : c.brand.onPrimary },
                ]}>
                  {isFollowing ? '팔로잉' : '팔로우'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {canSeeContent && (
          <BodyInfoStrip
            heightCm={profile?.height_cm ?? null}
            reachCm={profile?.reach_cm ?? null}
            weightKg={profile?.weight_visible ? (profile?.weight_kg ?? null) : null}
            climbingStartDate={profile?.climbing_start_date ?? null}
          />
        )}

        {!canSeeContent && (
          <View style={s.privateBox}>
            <Feather name="lock" size={24} color={c.text.muted} />
            <Text style={s.privateBoxTitle}>비공개 계정이에요</Text>
            <Text style={s.privateBoxSub}>
              팔로우 요청을 보내고 수락되면 활동을 볼 수 있어요.
            </Text>
          </View>
        )}

        {/* Stats section — scoped to this month */}
        {canSeeContent && (
        <View style={s.sectionContainer}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>{monthAnchor.month}월 운동 통계</Text>
          </View>

          {isLoading && (
            <View style={s.loaderWrap}>
              <ActivityIndicator color={c.brand.primary} />
            </View>
          )}

          {error && (
            <View style={s.errorCard}>
              <Text style={s.errorText}>{error.message}</Text>
            </View>
          )}

          {stats && (
            <>
              {/* Summary card: 3 metrics */}
              <View style={s.summaryCard}>
                <View style={s.summaryMetricsRow}>
                  <SummaryMetric
                    label="세션"
                    value={stats.totalSessions}
                    icon="calendar"
                  />
                  <View style={s.metricDivider} />
                  <SummaryMetric
                    label="완등"
                    value={stats.totalSends}
                    icon="check-circle"
                  />
                  <View style={s.metricDivider} />
                  <SummaryMetric
                    label="활동 일수"
                    value={stats.activityDays}
                    icon="award"
                  />
                </View>
              </View>

              {/* 암장별 통계는 전체 통계 화면(/stats)에서만. 마이페이지는
                  요약 카드까지만 — 본인 빠른 확인용. 빈 상태만 안내. */}
              {stats.gyms.length === 0 && (
                <View style={s.emptyStatsCard}>
                  <Feather name="activity" size={24} color={c.text.muted} />
                  <Text style={s.emptyStatsTitle}>이 달은 운동 기록이 없어요</Text>
                </View>
              )}
            </>
          )}
        </View>

        )}

        {canSeeContent && (
          <>
            <CrewsSection userId={id} />
            <BadgesSection userId={id} />
            <ShoesSection userId={id} />
          </>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

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

function FootProfileCard({
  profile,
}: {
  profile: Profile | undefined;
}) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const chips = profile
    ? ([
        profile.foot_length_mm != null ? `${profile.foot_length_mm}mm` : null,
        profile.shoe_size_mm != null ? `운동화 ${profile.shoe_size_mm}mm` : null,
        profile.foot_shape ? FOOT_SHAPE_LABEL[profile.foot_shape] : null,
        profile.foot_width ? `${FOOT_WIDTH_LABEL[profile.foot_width]} 폭` : null,
        profile.instep_height ? INSTEP_LABEL[profile.instep_height] : null,
        profile.arch_type ? ARCH_LABEL[profile.arch_type] : null,
      ].filter(Boolean) as string[])
    : [];
  const empty = chips.length === 0;

  return (
    <View style={s.footCard}>
          <View style={s.footCardLeft}>
            <Text style={s.footEmoji}>🦶</Text>
          </View>
          <View style={s.footCardBody}>
            <View style={s.footCardHeaderRow}>
              <Text style={s.footCardTitle}>발 프로필</Text>
            </View>
            {empty ? (
              <Text style={s.footEmptyText}>
                아직 등록한 발 정보가 없어요
              </Text>
            ) : (
              <View style={s.footChipsRow}>
                {chips.map((c) => (
                  <View key={c} style={s.footMiniChip}>
                    <Text style={s.footMiniChipText}>{c}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
  );
}

function NotificationBell() {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { data: count = 0 } = useUnreadCount();
  return (
    <Pressable
      onPress={() => router.push('/notifications' as never)}
      style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.6 }]}
      hitSlop={6}
    >
      <Feather name="bell" size={20} color={c.text.primary} />
      {count > 0 && (
        <View style={s.bellBadge}>
          <Text style={s.bellBadgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </Pressable>
  );
}

const METRIC_ACCENT: Record<string, string> = {
  calendar: '#2563eb',       // 세션 — 파랑
  'check-circle': '#16a34a', // 완등 — 초록
  award: '#d97706',          // 활동 일수 — 앰버
};

function SummaryMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: 'calendar' | 'check-circle' | 'award';
}) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const accent = METRIC_ACCENT[icon] ?? '#475569';
  return (
    <View style={s.metricCard}>
      <View style={[s.metricIconBox, { backgroundColor: `${accent}15` }]}>
        <Feather name={icon} size={16} color={accent} />
      </View>
      <Text style={s.metricVal}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

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

function formatStartDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}.${m}`;
}

function BodyInfoStrip({
  heightCm,
  reachCm,
  weightKg,
  climbingStartDate,
}: {
  heightCm: number | null;
  reachCm: number | null;
  weightKg: number | null;
  climbingStartDate: string | null;
}) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const hasAny =
    heightCm != null ||
    reachCm != null ||
    weightKg != null ||
    climbingStartDate != null;
  if (!hasAny) {
    return null;
  }

  return (
    <View style={s.bodyStripWrap}>
      <View style={s.bodyStripCard}>
          <BodyMetricPill
            icon={<MaterialCommunityIcons name="arrow-up-down" size={15} color={c.text.secondary} />}
            value={heightCm != null ? String(heightCm) : '-'}
            unit={heightCm != null ? 'cm' : ''}
          />
          <BodyMetricPill
            icon={<MaterialCommunityIcons name="arrow-left-right" size={15} color={c.text.secondary} />}
            value={reachCm != null ? String(reachCm) : '-'}
            unit={reachCm != null ? 'cm' : ''}
          />
          <BodyMetricPill
            icon={<MaterialCommunityIcons name="weight" size={15} color={c.text.secondary} />}
            value={weightKg != null ? String(weightKg) : '-'}
            unit={weightKg != null ? 'kg' : ''}
          />
          <BodyMetricPill
            icon={<MaterialCommunityIcons name="trending-up" size={15} color={c.text.secondary} />}
            value={
              climbingStartDate
                ? formatClimbingDuration(climbingStartDate)
                : '-'
            }
            sub={climbingStartDate ? `${formatStartDate(climbingStartDate)} 시작` : null}
          />
        </View>
    </View>
  );
}

function BodyMetricPill({
  icon,
  value,
  unit,
  sub,
}: {
  icon: React.ReactNode;
  value: string;
  unit?: string;
  sub?: string | null;
}) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  return (
    <View style={[s.bodyPill, sub && { flexDirection: 'row', justifyContent: 'space-between', width: '100%' }]}>
      <View style={s.bodyPillRow}>
        {icon}
        <Text style={s.bodyPillVal}>{value}</Text>
        {unit ? <Text style={s.bodyPillUnit}>{unit}</Text> : null}
      </View>
      {sub ? <Text style={s.bodyPillSub}>{sub}</Text> : null}
    </View>
  );
}

function BadgesSection({ userId }: { userId: string }) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const { data: rows = [], isLoading } = useUserBadges(userId);

  // earned_at 매핑
  const earnedMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) m.set(r.badge_key, r.earned_at);
    return m;
  }, [rows]);

  // 획득한 뱃지만 — 카테고리별 그룹
  const groupedByCategory = React.useMemo(() => {
    const order: BadgeCategory[] = ['record', 'grade', 'streak', 'social'];
    const groups = new Map<BadgeCategory, BadgeDef[]>();
    for (const cat of order) groups.set(cat, []);
    for (const b of BADGES) {
      if (earnedMap.has(b.key)) {
        groups.get(b.category)!.push(b);
      }
    }
    return order
      .map((cat) => ({ cat, list: groups.get(cat)! }))
      .filter((g) => g.list.length > 0);
  }, [earnedMap]);

  const earnedCount = rows.length;

  function handleBadgePress(badge: BadgeDef) {
    const earnedAt = earnedMap.get(badge.key);
    if (!earnedAt) return;
    const dateStr = new Date(earnedAt).toLocaleDateString('ko-KR');
    customAlert(
      badge.name,
      `달성일: ${dateStr}\n\n${badge.hint}`,
      [{ text: '닫기', style: 'cancel' }],
      undefined,
      <BadgeIcon icon={badge.icon} color={badge.color} size={36} />,
    );
  }

  return (
    <View style={s.sectionContainer}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>배지 진열장</Text>
      </View>

      <View style={s.collectionCard}>
        <View style={s.collectionHeaderRow}>
          <Text style={s.collectionLabel}>획득한 배지</Text>
          <Text style={s.collectionCount}>
            <Text style={s.collectionCountStrong}>{earnedCount}</Text>
            <Text style={s.collectionCountMuted}>개</Text>
          </Text>
        </View>

        {isLoading && (
          <View style={s.loaderWrap}>
            <ActivityIndicator color={c.brand.primary} />
          </View>
        )}

        {!isLoading && earnedCount === 0 && (
          <View style={s.badgesEmptyState}>
            <Feather name="award" size={28} color={c.text.muted} />
            <Text style={s.badgesEmptyText}>아직 획득한 배지가 없어요</Text>
          </View>
        )}

        {groupedByCategory.map(({ cat, list }, idx) => (
          <View key={cat} style={[s.groupSection, idx > 0 && s.groupSectionDivider]}>
            <View style={s.groupHeader}>
              <View style={[s.groupDot, { backgroundColor: list[0].color }]} />
              <Text style={s.groupTitle}>{BADGE_CATEGORY_LABEL[cat]}</Text>
              <Text style={s.groupCount}>{list.length}</Text>
            </View>
            <View style={s.badgesGrid}>
              {list.map((badge) => (
                <Pressable
                  key={badge.key}
                  style={s.badgeItem}
                  onPress={() => handleBadgePress(badge)}
                >
                  {({ pressed }) => (
                    <View style={[s.badgeItemInner, pressed && { opacity: 0.6 }]}>
                      <View style={[s.badgeIconWrap, {
                        shadowColor: badge.color,
                        shadowOpacity: 0.45,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 5 },
                        elevation: 6,
                      }]}>
                        <BadgeIcon icon={badge.icon} color={badge.color} size={22} />
                      </View>
                      <Text style={s.badgeTitle} numberOfLines={2}>
                        {badge.name}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function CrewsSection({ userId }: { userId: string }) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { data, isLoading, error } = useUserCrews(userId);

  return (
    <View style={s.sectionContainer}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>참여 중인 크루</Text>
      </View>

      {isLoading && (
        <View style={s.loaderWrap}>
          <ActivityIndicator color={c.brand.primary} />
        </View>
      )}

      {error && (
        <View style={s.errorCard}>
          <Text style={s.errorText}>{error.message}</Text>
        </View>
      )}

      {data && data.length === 0 && (
        <View style={s.emptyStatsCard}>
          <Feather name="users" size={24} color={c.text.muted} />
          <Text style={s.emptyStatsTitle}>참여 중인 크루가 없어요</Text>
        </View>
      )}

      {data && data.length > 0 && (
        <View style={s.crewList}>
          {data.map((c) => (
            <CrewCard key={c.id} crew={c} />
          ))}
        </View>
      )}
    </View>
  );
}

function getCrewAvatarColors(name: string, c: ThemeColors) {
  const bgColors = [c.bg.subtle, c.bg.card, c.bg.accent, c.bg.subtle, c.bg.card, c.bg.accent];
  const textColors = [c.text.primary, c.brand.primary, c.status.success, c.status.warning, c.status.danger, c.brand.primaryDeep];
  const borderColors = [c.border.subtle, c.border.subtle, c.border.strong, c.border.subtle, c.border.subtle, c.border.subtle];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  const idx = sum % bgColors.length;
  return {
    bg: bgColors[idx],
    text: textColors[idx],
    border: borderColors[idx],
  };
}

function CrewCard({ crew }: { crew: CrewSummary }) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const name = crew.name ?? '크루';
  const firstChar = name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  const colors = getCrewAvatarColors(name, c);

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/crew/[id]', params: { id: crew.id } } as never)
      }
    >
      {({ pressed }) => (
        <View
          style={[
            s.crewCard,
            pressed && { transform: [{ scale: 0.985 }], opacity: 0.95 }
          ]}
        >
          <View style={[s.crewEmblem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[s.crewEmblemText, { color: colors.text }]}>{firstChar}</Text>
          </View>
          
          <View style={s.crewContent}>
            <Text style={s.crewTitle} numberOfLines={1}>
              {name}
            </Text>
            
            <View style={s.crewMetaRow}>
              <View style={[s.crewMemberBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <Feather name="users" size={10} color={colors.text} />
                <Text style={[s.crewMemberText, { color: colors.text }]}>멤버 {crew.member_count}명</Text>
              </View>
              {crew.home_gym && (
                <View style={s.crewGymBadge}>
                  <Feather name="map-pin" size={10} color={c.text.tertiary} />
                  <Text style={s.crewGymText} numberOfLines={1}>
                    {crew.home_gym.name}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <Feather name="chevron-right" size={18} color={c.border.strong} />
        </View>
      )}
    </Pressable>
  );
}

function MembershipsSection() {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { data, isLoading, error } = useMemberships();

  const { active, expired } = React.useMemo(() => {
    if (!data) return { active: [] as MembershipRow[], expired: [] as MembershipRow[] };
    const a: MembershipRow[] = [];
    const e: MembershipRow[] = [];
    for (const m of data) {
      (isMembershipExpired(m) ? e : a).push(m);
    }
    // 활성: 만료 임박 먼저
    a.sort((m1, m2) => urgencyScore(m1) - urgencyScore(m2));
    // 만료: 최근 종료 먼저
    e.sort((m1, m2) =>
      (m2.end_date ?? m2.start_date).localeCompare(m1.end_date ?? m1.start_date),
    );
    return { active: a, expired: e };
  }, [data]);

  return (
    <View style={s.membershipSection}>
      <View style={s.membershipHeader}>
        <Text style={s.membershipTitle}>내 회원권</Text>
        <Pressable
          onPress={() => router.push('/membership/new')}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
        >
          <View style={s.addMembershipBtn}>
            <Feather name="plus" size={14} color={c.text.secondary} />
            <Text style={s.addMembershipText}>추가</Text>
          </View>
        </Pressable>
      </View>

      {isLoading && (
        <View style={s.loaderWrap}>
          <ActivityIndicator color={c.brand.primary} />
        </View>
      )}

      {error && (
        <View style={s.errorCard}>
          <Text style={s.errorText}>{error.message}</Text>
        </View>
      )}

      {data && active.length === 0 && expired.length === 0 && (
        <View style={s.emptyMembershipCard}>
          <Feather name="credit-card" size={24} color={c.text.muted} />
          <Text style={s.emptyMembershipTitle}>등록된 회원권이 없어요</Text>
          <Text style={s.emptyMembershipSubtitle}>
            우측 상단 + 추가 버튼으로 등록하세요
          </Text>
        </View>
      )}

      {active.length > 0 && (
        <View style={s.membershipList}>
          {active.map((m) => (
            <MembershipCard key={m.id} membership={m} />
          ))}
        </View>
      )}

      {expired.length > 0 && (
        <View style={s.expiredSection}>
          <Text style={s.expiredLabel}>지난 회원권</Text>
          <View style={s.membershipList}>
            {expired.map((m) => (
              <MembershipCard key={m.id} membership={m} expired />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function urgencyScore(m: MembershipRow): number {
  if (m.membership_type === 'passes' && m.total_passes != null) {
    return Math.max(0, m.total_passes - m.used_passes);
  }
  if (m.end_date) return Math.max(0, daysFromTodayTo(m.end_date));
  return 9999;
}

function resolveTypeLabel(type: string): string {
  // monthly·single 은 레거시 — UI상 '기간권'으로 통합 표시
  switch (type) {
    case 'passes': return '다회권';
    case 'period':
    case 'monthly':
    case 'single':
      return '기간권';
    default: return '회원권';
  }
}

function MembershipCard({
  membership,
  expired,
}: {
  membership: MembershipRow;
  expired?: boolean;
}) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const isDark = useEffectiveScheme() === 'dark';
  const router = useRouter();
  const usePass = useUsePass();
  const gymLabel = membership.gym
    ? `${membership.gym.name}${membership.gym.branch ? ` ${membership.gym.branch}` : ''}`
    : '암장 미선택';
  const expSoon = !expired && isExpiringSoon(membership);

  function handleUsePass() {
    customAlert(
      '1회 사용',
      `1회 차감할까요? ${membership.used_passes} → ${membership.used_passes + 1}회`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차감',
          onPress: () => {
            usePass
              .mutateAsync({ id: membership.id, current: membership.used_passes })
              .catch((e) =>
                customAlert('차감 실패', e instanceof Error ? e.message : '오류'),
              );
          },
        },
      ],
    );
  }

  const total = membership.total_passes ?? 0;
  const remaining = Math.max(0, total - membership.used_passes);

  const isPasses = membership.membership_type === 'passes';
  const iconName = isPasses ? 'layers' : 'calendar';

  const cardStyle = [
    s.mCard,
    expired
      ? s.mCardExpired
      : expSoon
      ? s.mCardUrgent
      : isPasses
      ? s.mCardPasses
      : s.mCardPeriod,
  ];

  const badgeStyle = expired
    ? s.mBadgeExpired
    : expSoon
    ? s.mBadgeUrgent
    : isPasses
    ? s.mBadge
    : s.mBadgePeriod;

  const badgeTextStyle = expired
    ? s.mBadgeTextExpired
    : expSoon
    ? s.mBadgeTextUrgent
    : isPasses
    ? s.mBadgeText
    : s.mBadgeTextPeriod;

  const iconBoxStyle = [
    s.mIconBox,
    expired
      ? s.mIconBoxMuted
      : expSoon
      ? s.mIconBoxUrgent
      : isPasses
      ? s.mIconBoxPasses
      : s.mIconBoxPeriod,
  ];

  const iconColor = expired
    ? c.text.muted
    : expSoon
    ? c.status.danger
    : isPasses
    ? c.brand.primaryDeep
    : isDark ? '#818cf8' : '#4f46e5';

  const dividerColor = expired
    ? c.border.strong
    : expSoon
    ? c.status.dangerBg
    : isPasses
    ? c.brand.primaryLight
    : isDark ? '#3730a3' : '#c7d2fe';

  const cutoutBorderColor = expSoon ? c.status.dangerBg : c.border.subtle;

  // 카드 전체를 Pressable로 — Pressable의 함수형 style 배열이 내부 row
  // layout을 자꾸 무너뜨려서 children-as-function 패턴으로 옮김.
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/membership/[id]', params: { id: membership.id } })
      }
      style={cardStyle}
    >
      {({ pressed }) => (
        <View style={[s.mCardRow, pressed && { opacity: 0.85 }]}>
          {/* Left: icon */}
          <View style={iconBoxStyle}>
            <Feather
              name={iconName}
              size={20}
              color={iconColor}
            />
          </View>

          {/* Middle: badge + gym name */}
          <View style={s.mCardBody}>
            <View style={s.mBadgeRow}>
              <View style={badgeStyle}>
                <Text style={badgeTextStyle}>
                  {resolveTypeLabel(membership.membership_type)}
                </Text>
              </View>
              {isPasses && (
                <View style={expired ? s.mCountBadgeExpired : s.mCountBadge}>
                  <Text style={expired ? s.mCountBadgeTextExpired : s.mCountBadgeText}>
                    {remaining}/{total}회
                  </Text>
                </View>
              )}
              {expSoon && (
                <View style={s.mBadgeUrgent}>
                  <Text style={s.mBadgeTextUrgent}>만료 임박</Text>
                </View>
              )}
            </View>

            <Text
              style={expired ? s.mGymTextExpired : s.mGymText}
              numberOfLines={1}
            >
              {gymLabel}
            </Text>
          </View>

          {/* Dashed divider */}
          <View style={[s.ticketDivider, { borderColor: dividerColor }]} />

          {/* Right: stat / use-pass button */}
          {!expired && isPasses ? (
            <View style={s.mRightCol}>
              <Pressable
                onPress={handleUsePass}
                disabled={usePass.isPending || remaining <= 0}
                hitSlop={8}
              >
                {({ pressed: btnPressed }) => (
                  <View
                    style={[
                      s.usePassBtn,
                      remaining <= 0 && s.usePassBtnDisabled,
                      btnPressed && { opacity: 0.8 },
                    ]}
                  >
                    {usePass.isPending ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Feather name="check" size={13} color="white" />
                        <Text style={s.usePassBtnText}>사용</Text>
                      </>
                    )}
                  </View>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={s.mRightCol}>
              <Text style={[s.mRightStatText, expSoon && s.mSubtitleTextUrgent]}>
                {formatMembershipRightStat(membership, expired)}
              </Text>
            </View>
          )}

          {/* Ticket Cutouts */}
          <View style={[s.ticketCutoutTop, { borderColor: cutoutBorderColor }]} />
          <View style={[s.ticketCutoutBottom, { borderColor: cutoutBorderColor }]} />
        </View>
      )}
    </Pressable>
  );
}

function formatMembershipRightStat(m: MembershipRow, expired?: boolean): string {
  if (m.membership_type === 'passes') {
    return expired ? '소진됨' : '';
  }
  if (!m.end_date) return '';
  if (expired) return '만료됨';
  const d = daysFromTodayTo(m.end_date);
  return d === 0 ? 'D-Day' : `D-${d}`;
}


// ─── Shoes section ───────────────────────────────────────────
function ShoesSection({ userId }: { userId: string }) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const { data: profile } = usePublicProfile(userId);
  const { data, isLoading, error } = useShoes(userId);
  const count = data?.length ?? 0;

  return (
    <View style={s.sectionContainer}>
      <View style={s.sectionHeaderRow}>
        <View style={s.shoesTitleRow}>
          <Text style={s.sectionTitle}>
            신발장 {count > 0 && <Text style={s.sectionTitleCount}>{count}</Text>}
          </Text>
        </View>
      </View>

      <FootProfileCard profile={profile} />

      {isLoading && (
        <View style={s.loaderWrap}>
          <ActivityIndicator color={c.brand.primary} />
        </View>
      )}

      {error && (
        <View style={s.errorCard}>
          <Text style={s.errorText}>{error.message}</Text>
        </View>
      )}

      {data && data.length === 0 && (
        <View style={s.shoeRackContainer}>
          <View style={s.emptyShelfSlot}>
            <Feather name="package" size={28} color={c.border.strong} />
            <Text style={s.emptyShelfText}>아직 등록한 암벽화가 없어요</Text>
          </View>
        </View>
      )}

      {data && data.length > 0 && (
        <View style={s.shoeRackContainer}>
          {data.map((shoe) => (
            <ShoeCard key={shoe.id} shoe={shoe} />
          ))}
        </View>
      )}
    </View>
  );
}

const MINI_BAR_KEYS: Array<{
  field: keyof Pick<
    ClimbingShoe,
    | 'rating_edging'
    | 'rating_smearing'
    | 'rating_toehook'
    | 'rating_heelhook'
    | 'rating_sensitivity'
    | 'rating_comfort'
  >;
  label: string;
}> = [
  { field: 'rating_edging', label: '에징' },
  { field: 'rating_smearing', label: '스미어링' },
  { field: 'rating_sensitivity', label: '감도' },
  { field: 'rating_toehook', label: '토훅' },
  { field: 'rating_comfort', label: '편안함' },
  { field: 'rating_heelhook', label: '힐훅' },
];

const WANTED_FIT_SHORT: Record<string, string> = {
  performance: '퍼포먼스',
  comfort: '컴포트',
};
const FIT_PERCEPTION_SHORT_LOCAL: Record<string, string> = {
  much_smaller: '훨씬 작음',
  slightly_smaller: '약간 작음',
  perfect: '딱 맞음',
  slightly_larger: '약간 큼',
  much_larger: '훨씬 큼',
};
const STATUS_LABEL_LOCAL: Record<ShoeStatus, string> = {
  active: '사용 중',
  resole_pending: '창갈이 대기',
  retired: '은퇴',
};

function ShoeCard({ shoe }: { shoe: ClimbingShoe }) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const hasRatings = MINI_BAR_KEYS.some((k) => shoe[k.field] != null);
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/shoes/[id]', params: { id: shoe.id } })
      }
      style={({ pressed }) => ({ opacity: pressed ? 0.94 : 1 })}
    >
      <View style={s.shoeCard}>
        <View style={s.shoeCardTop}>
          <View style={s.shoeThumb}>
            <Feather name="package" size={20} color={c.text.muted} />
          </View>
          <View style={s.shoeCardBody}>
            {shoe.brand && <Text style={s.shoeBrand}>{shoe.brand}</Text>}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={[s.shoeModelName, { flexShrink: 1 }]} numberOfLines={1}>
                {shoe.model}
              </Text>
              {shoe.is_primary && (
                <View style={s.primaryChip}>
                  <Text style={s.primaryChipText}>🌟 주력</Text>
                </View>
              )}
            </View>
            <View style={s.shoeMetaRow}>
              {shoe.status !== 'active' && (
                <View
                  style={[
                    s.shoeStatusBadge,
                    {
                      backgroundColor: STATUS_PALETTE[shoe.status].bg,
                      borderColor: STATUS_PALETTE[shoe.status].border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.shoeStatusText,
                      { color: STATUS_PALETTE[shoe.status].text },
                    ]}
                  >
                    {STATUS_LABEL_LOCAL[shoe.status]}
                  </Text>
                </View>
              )}
              {shoe.size && (
                <View style={s.sizePill}>
                  <Text style={s.sizePillText}>{shoe.size.replace(/^EU\s*/i, '')} EU</Text>
                </View>
              )}
              {shoe.wanted_fit && (
                <View style={s.tagChipActive}>
                  <Text style={s.tagChipActiveText}>{WANTED_FIT_SHORT[shoe.wanted_fit]}</Text>
                </View>
              )}
              {shoe.fit_perception && (
                <View style={s.tagChip}>
                  <Text style={s.tagChipText}>
                    {FIT_PERCEPTION_SHORT_LOCAL[shoe.fit_perception]}
                  </Text>
                </View>
              )}
              {shoe.rating_overall != null && (
                <View style={s.overallRow}>
                  <Text style={s.overallStar}>★</Text>
                  <Text style={s.overallNum}>{shoe.rating_overall}</Text>
                </View>
              )}
            </View>

          </View>
          <View style={s.shoeActionsCol}>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/shoes/[id]', params: { id: shoe.id } })
              }
              hitSlop={6}
            >
              {({ pressed }) => (
                <View style={[s.shoeActionBtn, pressed && { opacity: 0.6 }]}>
                  <Feather name="edit-2" size={14} color={c.text.secondary} />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {hasRatings && (
          <View style={s.miniBarGrid}>
            <View style={s.miniBarRow}>
              <MiniBar item={MINI_BAR_KEYS[0]} shoe={shoe} />
              <MiniBar item={MINI_BAR_KEYS[1]} shoe={shoe} />
              <MiniBar item={MINI_BAR_KEYS[2]} shoe={shoe} />
            </View>
            <View style={s.miniBarRow}>
              <MiniBar item={MINI_BAR_KEYS[3]} shoe={shoe} />
              <MiniBar item={MINI_BAR_KEYS[4]} shoe={shoe} />
              <MiniBar item={MINI_BAR_KEYS[5]} shoe={shoe} />
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function MiniBar({ item, shoe }: { item: typeof MINI_BAR_KEYS[0]; shoe: ClimbingShoe }) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const v = shoe[item.field];
  if (v == null) return <View style={s.miniBarCol} />; // empty placeholder to keep layout
  return (
    <View style={s.miniBarCol}>
      <Text style={s.miniBarLabel}>{item.label}</Text>
      <View style={s.miniBarTrack}>
        <View style={[s.miniBarFill, { width: `${(v / 5) * 100}%` }]} />
      </View>
      <Text style={s.miniBarValue}>{v}</Text>
    </View>
  );
}

const STATUS_PALETTE: Record<
  ShoeStatus,
  { bg: string; border: string; text: string }
> = {
  active: { bg: '#ecfeff', border: '#a5f3fc', text: '#0e7490' },
  resole_pending: { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
  retired: { bg: '#f1f5f9', border: '#e2e8f0', text: '#64748b' },
};

const THEME_PREF_LABEL: Record<ThemePref, string> = {
  auto: '시스템 따라가기',
  light: '라이트',
  dark: '다크',
};

function ProfileMenuModal({
  visible,
  onClose,
  onLogout,
  onEditProfile,
}: {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  onEditProfile: () => void;
}) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const themePref = useThemePref((s) => s.pref);
  const setThemePref = useThemePref((s) => s.setPref);

  function handleTheme() {
    customAlert('테마', '화면 색깔 모드를 선택하세요', [
      { text: '시스템 따라가기', onPress: () => setThemePref('auto') },
      { text: '라이트', onPress: () => setThemePref('light') },
      { text: '다크', onPress: () => setThemePref('dark') },
      { text: '취소', style: 'cancel' },
    ]);
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.modalOverlay}>
        <Pressable style={s.modalBackdrop} onPress={onClose} />
        <View style={s.modalContent}>
          <View style={s.modalDragHandle} />

          <Text style={s.modalTitle}>설정 및 메뉴</Text>

          <MenuButton
            icon="edit-3"
            label="프로필 편집"
            onPress={() => { onClose(); onEditProfile(); }}
          />
          <MenuButton
            icon="moon"
            label={`테마 · ${THEME_PREF_LABEL[themePref]}`}
            onPress={() => { onClose(); handleTheme(); }}
          />
          <MenuButton
            icon="bell"
            label="알림 설정"
            onPress={() => { onClose(); customAlert('알림 설정', '준비 중인 기능입니다.'); }}
          />
          <MenuButton
            icon="lock"
            label="개인정보 처리방침"
            onPress={() => { onClose(); customAlert('안내', '준비 중인 기능입니다.'); }}
          />
          <MenuButton
            icon="help-circle"
            label="고객센터 / 문의하기"
            onPress={() => { onClose(); customAlert('고객센터', '준비 중인 기능입니다.'); }}
          />

          <View style={s.modalDivider} />

          <MenuButton
            icon="log-out"
            label="로그아웃"
            color={c.status.danger}
            onPress={() => { onClose(); onLogout(); }}
          />
        </View>
      </View>
    </Modal>
  );
}

function MenuButton({ icon, label, color, onPress }: { icon: any; label: string; color?: string; onPress: () => void }) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const fg = color ?? c.text.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={s.menuBtn}>
        <Feather name={icon} size={18} color={fg} />
        <Text style={[s.menuBtnText, { color: fg }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────
function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: c.bg.card,
    borderBottomWidth: 1,
    borderColor: c.border.subtle,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: c.text.tertiary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg.subtle,
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  footCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: c.bg.subtle,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border.subtle,
    marginBottom: 12,
  },
  footCardLeft: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footEmoji: { fontSize: 22 },
  footCardBody: { flex: 1, gap: 6 },
  footCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footCardTitle: { fontSize: 14, fontWeight: '900', color: c.text.primary },
  footEditChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  footEditChipText: { fontSize: 12, fontWeight: '800', color: c.text.secondary },
  footEmptyText: { fontSize: 12, color: c.text.tertiary, lineHeight: 17 },
  footChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  footMiniChip: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  footMiniChipText: { fontSize: 11, fontWeight: '700', color: c.text.secondary },

  sectionTitleCount: { color: c.brand.primary },
  flex1: { flex: 1 },
  shoeListGap: { gap: 10 },
  shoeEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: c.bg.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderStyle: 'dashed',
  },
  shoeEmptyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.bg.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoeEmptyTitle: { fontSize: 14, fontWeight: '800', color: c.text.primary },
  shoeEmptySub: { fontSize: 11, color: c.text.muted, marginTop: 2 },

  // Profile Card — 인스타 스타일 (중앙 정렬, 큰 아바타)
  profileCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 12,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: '#06b6d4',
    backgroundColor: c.bg.card,
    padding: 3,
    shadowColor: '#06b6d4',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 42,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 42,
    backgroundColor: c.bg.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: c.brand.primary,
    fontSize: 36,
    fontWeight: '800',
  },
  profileInfo: {
    alignItems: 'center',
    gap: 4,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  privateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: c.bg.subtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  privateChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: c.text.secondary,
  },
  // ── 새 가로 레이아웃 (사진 좌 / 정보 우) ─────────────────
  profileCardH: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 16,
  },
  avatarContainerH: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: c.brand.primary,
    padding: 3,
  },
  avatarImageH: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  avatarFallbackH: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    backgroundColor: c.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackTextH: {
    fontSize: 30,
    fontWeight: '900',
    color: c.brand.primary,
  },
  profileInfoH: {
    flex: 1,
    gap: 6,
  },
  profileNameRowH: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileNameH: {
    fontSize: 19,
    fontWeight: '900',
    color: c.text.primary,
    letterSpacing: -0.4,
    flexShrink: 1,
  },
  instaTagH: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  instaTagTextH: {
    fontSize: 12,
    color: c.text.secondary,
    fontWeight: '700',
  },
  followStatsRowH: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 2,
  },
  followStatLineH: {
    fontSize: 13,
  },
  followStatNumH: {
    fontWeight: '900',
    color: c.text.primary,
  },
  followStatLabelH: {
    fontWeight: '600',
    color: c.text.tertiary,
  },
  // ── 팔로우 CTA ──────────────────────────────────────────
  ctaRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
  },
  ctaBtnBase: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
  },
  ctaBtnFollow: {
    backgroundColor: c.brand.primary,
  },
  ctaBtnFollowing: {
    backgroundColor: c.bg.card,
    borderWidth: 1.5,
    borderColor: c.brand.primary,
  },
  ctaBtnText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },

  // Follow stats — Instagram 식: 큰 숫자 + 라벨 가운데 정렬 (legacy)
  followStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginTop: 18,
    paddingHorizontal: 20,
  },
  followStatBox: {
    alignItems: 'center',
    gap: 2,
    minWidth: 64,
  },
  followStatNum: {
    fontSize: 18,
    fontWeight: '900',
    color: c.text.primary,
    letterSpacing: -0.3,
  },
  followStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text.tertiary,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  followStatDivider: {
    width: StyleSheet.hairlineWidth,
    height: 26,
    backgroundColor: c.border.subtle,
  },
  // Follow CTA — 전체 너비 단독 행, 명시적 너비/높이 강제
  followCtaWrap: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    width: '100%',
  },
  ctaFollow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    minHeight: 46,
    backgroundColor: c.brand.primary,
    borderRadius: 14,
    // 다크모드에서도 확실히 보이게 강한 외곽선 추가
    borderWidth: 2,
    borderColor: c.brand.primaryDeep,
  },
  ctaFollowText: {
    color: c.brand.onPrimary,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  ctaFollowing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    minHeight: 46,
    backgroundColor: c.bg.subtle,
    borderWidth: 2,
    borderColor: c.brand.primary,
    borderRadius: 14,
  },
  ctaFollowingText: {
    color: c.brand.primary,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  privateBox: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 8,
  },
  privateBoxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: c.text.primary,
  },
  privateBoxSub: {
    fontSize: 13,
    color: c.text.tertiary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19,
  },
  selectedBadgeIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeTextIcon: {
    fontSize: 10,
    fontWeight: '900',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.4,
  },
  profileEmail: {
    fontSize: 12,
    color: c.text.muted,
  },
  instaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    backgroundColor: c.bg.accent,
    borderWidth: 1,
    borderColor: '#cffafe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  instaTagText: {
    color: c.brand.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  instaConnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  instaConnectText: {
    color: c.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Body Strip
  bodyStripWrap: {
    paddingHorizontal: 20,
  },
  bodyStripEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cffafe',
    backgroundColor: c.bg.accent,
  },
  bodyStripEmptyText: {
    color: c.brand.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  bodyStripCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bodyPill: {
    flexGrow: 1,
    minWidth: '22%',
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 2,
  },
  bodyPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bodyPillVal: {
    fontSize: 15,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.3,
  },
  bodyPillUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: c.text.muted,
    marginLeft: -2,
  },
  bodyPillSub: {
    fontSize: 10,
    color: c.text.tertiary,
    fontWeight: '600',
  },

  // Stats Section
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: c.text.primary,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  loaderWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: c.status.danger,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 16,
    shadowColor: c.shadow.color,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  summaryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  metricIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#e2e8f0',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text.muted,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '900',
    color: c.text.primary,
    letterSpacing: -0.5,
  },
  emptyStatsCard: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyStatsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: c.text.primary,
  },
  emptyStatsSubtitle: {
    fontSize: 11,
    color: c.text.tertiary,
    fontWeight: '600',
  },
  gymListContainer: {
    gap: 10,
  },

  // Badges Section
  collectionCard: {
    backgroundColor: c.bg.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border.subtle,
    borderRadius: 20,
    padding: 18,
    shadowColor: c.shadow.color,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 18,
  },
  collectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text.tertiary,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  collectionCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  collectionCountStrong: {
    color: c.brand.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  collectionCountMuted: {
    color: c.text.muted,
    fontWeight: '600',
  },
  groupSection: {
    gap: 14,
  },
  groupSectionDivider: {
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border.subtle,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  groupDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: c.brand.primary,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.2,
    flex: 1,
  },
  groupCount: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text.secondary,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    rowGap: 16,
  },
  badgesEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  badgesEmptyText: {
    fontSize: 13,
    color: c.text.muted,
    fontWeight: '600',
  },
  badgeItem: {
    width: '21%',
    alignItems: 'center',
    gap: 6,
  },
  badgeItemInner: {
    alignItems: 'center',
    gap: 6,
  },
  badgeTextIcon: {
    fontSize: 18,
    fontWeight: '900',
  },
  badgeLockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: c.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: c.bg.card,
  },
  badgeIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 22,
  },
  badgeTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: c.text.secondary,
    textAlign: 'center',
    lineHeight: 12,
  },

  // Membership Section
  membershipSection: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  membershipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  membershipTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: c.text.primary,
    paddingHorizontal: 4,
  },
  addMembershipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.bg.card,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border.strong,
  },
  addMembershipText: {
    color: c.text.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyMembershipCard: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyMembershipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: c.text.primary,
  },
  emptyMembershipSubtitle: {
    fontSize: 11,
    color: c.text.tertiary,
    fontWeight: '600',
  },
  membershipList: {
    gap: 10,
  },
  expiredSection: {
    marginTop: 20,
    gap: 8,
  },
  expiredLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text.muted,
    paddingHorizontal: 4,
  },

  // Membership Card Styles
  mCard: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: c.shadow.color,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  mCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  mCardExpired: {
    backgroundColor: c.bg.primary,
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
    borderLeftWidth: 5,
    borderLeftColor: c.border.strong,
  },
  mCardUrgent: {
    borderColor: c.status.dangerBg,
    borderLeftWidth: 5,
    borderLeftColor: c.status.danger,
  },
  mCardPasses: {
    borderLeftWidth: 5,
    borderLeftColor: c.brand.primaryDeep,
  },
  mCardPeriod: {
    borderLeftWidth: 5,
    borderLeftColor: '#6366f1',
  },
  mIconBoxPasses: {
    backgroundColor: c.bg.accent,
  },
  mIconBoxPeriod: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  mIconBoxUrgent: {
    backgroundColor: c.status.dangerBg,
  },
  ticketDivider: {
    width: 0,
    height: 44,
    borderWidth: 0.8,
    borderColor: c.border.subtle,
    borderStyle: 'dashed',
    marginHorizontal: 4,
  },
  ticketCutoutTop: {
    position: 'absolute',
    right: 78,
    top: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.bg.primary,
    borderWidth: 1,
    borderColor: c.border.subtle,
    zIndex: 10,
  },
  ticketCutoutBottom: {
    position: 'absolute',
    right: 78,
    bottom: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.bg.primary,
    borderWidth: 1,
    borderColor: c.border.subtle,
    zIndex: 10,
  },
  mCardContent: {
    flex: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mIconBoxMuted: {
    backgroundColor: c.bg.subtle,
  },
  mCardBody: {
    flex: 1,
    minWidth: 0,
  },
  mBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  mBadge: {
    backgroundColor: c.bg.accent,
    borderWidth: 1,
    borderColor: c.brand.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: c.brand.primaryDeep,
  },
  mBadgePeriod: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mBadgeTextPeriod: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366f1',
  },
  mCountBadge: {
    backgroundColor: c.bg.accent,
    borderWidth: 1,
    borderColor: c.brand.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mCountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: c.brand.primaryDeep,
  },
  mCountBadgeExpired: {
    backgroundColor: c.bg.subtle,
    borderWidth: 1,
    borderColor: c.border.strong,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mCountBadgeTextExpired: {
    fontSize: 10,
    fontWeight: '800',
    color: c.text.tertiary,
  },
  mBadgeExpired: {
    backgroundColor: c.bg.subtle,
    borderWidth: 1,
    borderColor: c.border.strong,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mBadgeTextExpired: {
    fontSize: 10,
    fontWeight: '800',
    color: c.text.tertiary,
  },
  mBadgeUrgent: {
    backgroundColor: c.status.dangerBg,
    borderWidth: 1,
    borderColor: c.status.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mBadgeTextUrgent: {
    fontSize: 10,
    fontWeight: '800',
    color: c.status.danger,
  },
  mGymText: {
    fontSize: 15,
    fontWeight: '800',
    color: c.text.primary,
  },
  mGymTextExpired: {
    fontSize: 15,
    fontWeight: '800',
    color: c.text.tertiary,
  },
  mSubtitleText: {
    fontSize: 12,
    color: c.text.tertiary,
    marginTop: 4,
    fontWeight: '600',
  },
  mSubtitleTextUrgent: {
    color: c.status.danger,
  },
  mRightCol: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mRightStatText: {
    fontSize: 15,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.3,
  },
  usePassBtn: {
    width: 58,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#06b6d4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowColor: '#06b6d4',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  usePassBtnDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  usePassBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },

  // Stats "전체 통계 →" link
  allStatsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  allStatsLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text.secondary,
  },

  // Shoes section
  shoesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.bg.card,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border.strong,
  },
  addBtnText: {
    color: c.text.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  crewOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cffafe',
    backgroundColor: c.bg.accent,
  },
  crewOutlineBtnText: {
    color: c.brand.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  shoeRackContainer: {
    paddingVertical: 12,
    gap: 16,
  },
  emptyShelfSlot: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.shadow.color,
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 4,
  },
  emptyShelfText: {
    fontSize: 15,
    fontWeight: '800',
    color: c.text.primary,
    marginTop: 8,
  },
  emptyShelfSub: {
    fontSize: 12,
    fontWeight: '600',
    color: c.text.muted,
    textAlign: 'center',
  },
  shoeCard: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 24,
    padding: 16,
    shadowColor: c.shadow.color,
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    gap: 12,
  },
  shoeCardTop: { flexDirection: 'row', gap: 12 },
  shoeThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: c.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  shoeCardBody: { flex: 1, minWidth: 0, gap: 4 },
  shoeBrand: { fontSize: 11, fontWeight: '700', color: c.text.muted },
  shoeModelName: {
    fontSize: 15,
    fontWeight: '900',
    color: c.text.primary,
    letterSpacing: -0.3,
  },
  primaryChip: {
    alignSelf: 'flex-start',
    backgroundColor: c.status.warningBg,
    borderWidth: 1,
    borderColor: c.status.warning,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  primaryChipText: { fontSize: 10, fontWeight: '800', color: c.status.warning },
  sizePill: {
    backgroundColor: c.bg.subtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sizePillText: { fontSize: 11, fontWeight: '900', color: c.text.primary },
  overallRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  overallStar: { fontSize: 13, color: c.status.success },
  overallNum: { fontSize: 13, fontWeight: '900', color: c.text.primary },
  shoeChipsRow: { flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  tagChipActive: {
    borderWidth: 1,
    borderColor: c.status.success,
    backgroundColor: c.status.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagChipActiveText: { fontSize: 10, fontWeight: '800', color: c.status.success },
  tagChip: {
    borderWidth: 1,
    borderColor: c.border.subtle,
    backgroundColor: c.bg.card,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagChipText: { fontSize: 10, fontWeight: '700', color: c.text.secondary },
  shoeActionsCol: { gap: 6 },
  shoeActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg.subtle,
  },
  miniBarGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  miniBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniBarCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniBarLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: c.text.secondary,
    width: 32,
  },
  miniBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.bg.subtle,
    overflow: 'hidden',
  },
  miniBarFill: { height: '100%', backgroundColor: c.status.success, borderRadius: 3 },
  miniBarValue: { fontSize: 9, fontWeight: '800', color: c.text.primary, minWidth: 10, textAlign: 'right' },
  shoeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  shoeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.2,
  },
  shoeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  shoeMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.text.muted,
  },
  shoeStatusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  shoeStatusText: { fontSize: 10, fontWeight: '800' },

  // Menu Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  modalContent: {
    backgroundColor: c.bg.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: c.text.primary,
    marginBottom: 16,
  },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  menuBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },

  // Crew Section Styles
  crewList: {
    gap: 12,
  },
  crewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 24,
    padding: 16,
    shadowColor: c.shadow.color,
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  crewEmblem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  crewEmblemText: {
    fontSize: 20,
    fontWeight: '900',
  },
  crewContent: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    paddingLeft: 12,
  },
  crewTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: c.text.primary,
    letterSpacing: -0.3,
  },
  crewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crewMemberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  crewMemberText: {
    fontSize: 11,
    fontWeight: '800',
  },
  crewGymBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.bg.primary,
    borderWidth: 1,
    borderColor: c.border.subtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  crewGymText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text.tertiary,
  }
  });
}
