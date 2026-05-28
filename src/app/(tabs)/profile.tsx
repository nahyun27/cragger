import { useRouter } from 'expo-router';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { ShoeSizeGuide } from '@/components/shoes/shoe-size-guide';
import { useMyCrews, type CrewSummary } from '@/hooks/use-crews';
import {
  useProfile,
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
import { useUserStats } from '@/hooks/use-user-stats';
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
import { useThemePref, type ThemePref } from '@/lib/theme';


export default function ProfileScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  // 마페이지 카드는 "이번 달" 스코프. 전체 통계는 /stats 라우트로 이동.
  const monthAnchor = React.useMemo(() => currentMonth(), []);
  const thisMonthRange = React.useMemo(
    () => monthRange(monthAnchor.year, monthAnchor.month),
    [monthAnchor],
  );
  const { data: stats, isLoading, error } = useUserStats(thisMonthRange);
  const [menuVisible, setMenuVisible] = useState(false);

  const username = profile?.username ?? '...';
  const firstChar = username && username.length > 0 ? username.charAt(0).toUpperCase() : '?';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header bar */}
      <View style={s.header}>
        <Text style={s.headerTitle}>마이페이지</Text>
        <View style={s.headerActions}>
          <NotificationBell />
          <Pressable
            onPress={() => setMenuVisible(true)}
            style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.6 }]}
            hitSlop={6}
          >
            <Feather name="menu" size={20} color="#0f172a" />
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={s.scrollContent}>
        {/* Profile Card */}
        <View style={s.profileCard}>
          <View style={s.avatarContainer}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={s.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarFallbackText}>{firstChar}</Text>
              </View>
            )}
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName} numberOfLines={1}>
              {username}
            </Text>
            {profile?.instagram_handle ? (
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    `https://instagram.com/${profile.instagram_handle}`,
                  ).catch(() =>
                    Alert.alert('열기 실패', 'Instagram 앱/브라우저를 찾을 수 없어요'),
                  )
                }
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                hitSlop={6}
              >
                <View style={s.instaTag}>
                  <Feather name="instagram" size={12} color="#06b6d4" />
                  <Text style={s.instaTagText}>
                    @{profile.instagram_handle}
                  </Text>
                </View>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push('/profile/edit')}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                hitSlop={6}
              >
                <View style={s.instaConnectBtn}>
                  <Feather name="plus" size={12} color="#94a3b8" />
                  <Text style={s.instaConnectText}>Instagram 연결</Text>
                </View>
              </Pressable>
            )}
          </View>
        </View>

        <BodyInfoStrip
          heightCm={profile?.height_cm ?? null}
          reachCm={profile?.reach_cm ?? null}
          weightKg={profile?.weight_visible ? (profile?.weight_kg ?? null) : null}
          climbingStartDate={profile?.climbing_start_date ?? null}
          onEdit={() => router.push('/profile/edit')}
        />

        {/* Stats section — scoped to this month */}
        <View style={s.sectionContainer}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>{monthAnchor.month}월 운동 통계</Text>
            <Pressable
              onPress={() => router.push('/stats')}
              hitSlop={6}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <View style={s.allStatsLink}>
                <Text style={s.allStatsLinkText}>전체 통계</Text>
                <Feather name="chevron-right" size={14} color="#475569" />
              </View>
            </Pressable>
          </View>

          {isLoading && (
            <View style={s.loaderWrap}>
              <ActivityIndicator color="#06b6d4" />
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
                  <Feather name="activity" size={24} color="#94a3b8" />
                  <Text style={s.emptyStatsTitle}>아직 운동 기록이 없어요</Text>
                  <Text style={s.emptyStatsSubtitle}>기록 탭에서 첫 세션을 추가해보세요</Text>
                </View>
              )}
            </>
          )}
        </View>

        <CrewsSection />

        <MembershipsSection />

        <ShoesSection />
      </ScrollView>

      <ProfileMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onLogout={() => {
          Alert.alert(
            '로그아웃',
            '정말 로그아웃 하시겠습니까?',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '로그아웃',
                style: 'destructive',
                onPress: () => supabase.auth.signOut(),
              },
            ],
          );
        }}
        onEditProfile={() => router.push('/profile/edit')}
      />
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
  onEdit,
}: {
  profile: Profile | undefined;
  onEdit: () => void;
}) {
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
    <Pressable onPress={onEdit}>
      {({ pressed }) => (
        <View style={[s.footCard, pressed && { opacity: 0.92 }]}>
          <View style={s.footCardLeft}>
            <Text style={s.footEmoji}>🦶</Text>
          </View>
          <View style={s.footCardBody}>
            <View style={s.footCardHeaderRow}>
              <Text style={s.footCardTitle}>내 발 프로필</Text>
              <View style={s.footEditChip}>
                <Text style={s.footEditChipText}>{empty ? '등록' : '수정'}</Text>
                <Feather name="chevron-right" size={12} color="#0891b2" />
              </View>
            </View>
            {empty ? (
              <Text style={s.footEmptyText}>
                발 정보를 등록하면 비슷한 발형 추천 사이즈를 볼 수 있어요
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
      )}
    </Pressable>
  );
}

function NotificationBell() {
  const router = useRouter();
  const { data: count = 0 } = useUnreadCount();
  return (
    <Pressable
      onPress={() => router.push('/notifications' as never)}
      style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.6 }]}
      hitSlop={6}
    >
      <Feather name="bell" size={20} color="#0f172a" />
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
  onEdit,
}: {
  heightCm: number | null;
  reachCm: number | null;
  weightKg: number | null;
  climbingStartDate: string | null;
  onEdit: () => void;
}) {
  const hasAny =
    heightCm != null ||
    reachCm != null ||
    weightKg != null ||
    climbingStartDate != null;
  if (!hasAny) {
    return (
      <View style={s.bodyStripWrap}>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [s.bodyStripEmptyBtn, pressed && { opacity: 0.7 }]}
        >
          <Feather name="plus" size={14} color="#94a3b8" />
          <Text style={s.bodyStripEmptyText}>
            키 · 몸무게 · 리치 · 클라이밍 시작일 추가
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.bodyStripWrap}>
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [
          { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }
        ]}
      >
        <View style={s.bodyStripCard}>
          <BodyMetricPill
            icon={<MaterialCommunityIcons name="arrow-up-down" size={15} color="#475569" />}
            value={heightCm != null ? String(heightCm) : '-'}
            unit={heightCm != null ? 'cm' : ''}
          />
          <BodyMetricPill
            icon={<MaterialCommunityIcons name="arrow-left-right" size={15} color="#475569" />}
            value={reachCm != null ? String(reachCm) : '-'}
            unit={reachCm != null ? 'cm' : ''}
          />
          <BodyMetricPill
            icon={<MaterialCommunityIcons name="weight" size={15} color="#475569" />}
            value={weightKg != null ? String(weightKg) : '-'}
            unit={weightKg != null ? 'kg' : ''}
          />
          <BodyMetricPill
            icon={<MaterialCommunityIcons name="trending-up" size={15} color="#475569" />}
            value={
              climbingStartDate
                ? formatClimbingDuration(climbingStartDate)
                : '-'
            }
            sub={climbingStartDate ? `${formatStartDate(climbingStartDate)} 시작` : null}
          />
        </View>
      </Pressable>
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
  return (
    <View style={s.bodyPill}>
      <View style={s.bodyPillRow}>
        {icon}
        <Text style={s.bodyPillVal}>{value}</Text>
        {unit ? <Text style={s.bodyPillUnit}>{unit}</Text> : null}
      </View>
      {sub ? <Text style={s.bodyPillSub}>{sub}</Text> : null}
    </View>
  );
}

function CrewsSection() {
  const router = useRouter();
  const { data, isLoading, error } = useMyCrews();

  return (
    <View style={s.sectionContainer}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>내 크루</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable
            onPress={() => router.push('/crew/join' as never)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            hitSlop={6}
          >
            <View style={s.crewOutlineBtn}>
              <Feather name="key" size={12} color="#06b6d4" />
              <Text style={s.crewOutlineBtnText}>코드 가입</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push('/crew/new' as never)}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            hitSlop={6}
          >
            <View style={s.addBtn}>
              <Feather name="plus" size={14} color="#ffffff" />
              <Text style={s.addBtnText}>만들기</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {isLoading && (
        <View style={s.loaderWrap}>
          <ActivityIndicator color="#06b6d4" />
        </View>
      )}

      {error && (
        <View style={s.errorCard}>
          <Text style={s.errorText}>{error.message}</Text>
        </View>
      )}

      {data && data.length === 0 && (
        <View style={s.emptyStatsCard}>
          <Feather name="users" size={24} color="#94a3b8" />
          <Text style={s.emptyStatsTitle}>아직 크루가 없어요</Text>
          <Text style={s.emptyStatsSubtitle}>
            크루를 만들거나 친구의 초대코드로 가입해보세요
          </Text>
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

function getCrewAvatarColors(name: string) {
  const bgColors = ['#faf5ff', '#eff6ff', '#ecfeff', '#fffbeb', '#fef2f2', '#f0fdf4'];
  const textColors = ['#7c3aed', '#2563eb', '#0891b2', '#d97706', '#dc2626', '#16a34a'];
  const borderColors = ['#e9d5ff', '#bfdbfe', '#cffafe', '#fde68a', '#fee2e2', '#bbf7d0'];
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
  const router = useRouter();
  const name = crew.name ?? '크루';
  const firstChar = name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  const colors = getCrewAvatarColors(name);

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
                  <Feather name="map-pin" size={10} color="#64748b" />
                  <Text style={s.crewGymText} numberOfLines={1}>
                    {crew.home_gym.name}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <Feather name="chevron-right" size={18} color="#cbd5e1" />
        </View>
      )}
    </Pressable>
  );
}

function MembershipsSection() {
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
            <Feather name="plus" size={14} color="white" />
            <Text style={s.addMembershipText}>추가</Text>
          </View>
        </Pressable>
      </View>

      {isLoading && (
        <View style={s.loaderWrap}>
          <ActivityIndicator color="#06b6d4" />
        </View>
      )}

      {error && (
        <View style={s.errorCard}>
          <Text style={s.errorText}>{error.message}</Text>
        </View>
      )}

      {data && active.length === 0 && expired.length === 0 && (
        <View style={s.emptyMembershipCard}>
          <Feather name="credit-card" size={24} color="#94a3b8" />
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
  const router = useRouter();
  const usePass = useUsePass();
  const gymLabel = membership.gym
    ? `${membership.gym.name}${membership.gym.branch ? ` ${membership.gym.branch}` : ''}`
    : '암장 미선택';
  const expSoon = !expired && isExpiringSoon(membership);

  function handleUsePass() {
    Alert.alert(
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
                Alert.alert('차감 실패', e instanceof Error ? e.message : '오류'),
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
    ? '#94a3b8'
    : expSoon
    ? '#ef4444'
    : isPasses
    ? '#0891b2'
    : '#4f46e5';

  const dividerColor = expired
    ? '#cbd5e1'
    : expSoon
    ? '#fca5a5'
    : isPasses
    ? '#a5f3fc'
    : '#c7d2fe';

  const cutoutBorderColor = expired
    ? '#cbd5e1'
    : expSoon
    ? '#fecaca'
    : isPasses
    ? '#cffafe'
    : '#c7d2fe';

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
function ShoesSection() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data, isLoading, error } = useShoes();
  const [guideOpen, setGuideOpen] = useState(false);
  const count = data?.length ?? 0;

  return (
    <View style={s.sectionContainer}>
      <View style={s.sectionHeaderRow}>
        <View style={s.shoesTitleRow}>
          <Text style={s.sectionTitle}>
            내 신발장 {count > 0 && <Text style={s.sectionTitleCount}>{count}</Text>}
          </Text>
          <Pressable
            onPress={() => setGuideOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
          >
            <Feather name="info" size={14} color="#94a3b8" />
          </Pressable>
        </View>
        <Pressable
          onPress={() => router.push('/shoes/new')}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          hitSlop={6}
        >
          <View style={s.addBtn}>
            <Feather name="plus" size={14} color="#ffffff" />
            <Text style={s.addBtnText}>추가</Text>
          </View>
        </Pressable>
      </View>

      <FootProfileCard
        profile={profile}
        onEdit={() => router.push('/profile/foot' as never)}
      />

      <ShoeSizeGuide visible={guideOpen} onClose={() => setGuideOpen(false)} />

      {isLoading && (
        <View style={s.loaderWrap}>
          <ActivityIndicator color="#06b6d4" />
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
            <Feather name="package" size={28} color="#cbd5e1" />
            <Text style={s.emptyShelfText}>첫 암벽화 등록하기</Text>
            <Text style={s.emptyShelfSub}>핏·평점을 남기면 비슷한 발형 사용자와 비교돼요</Text>
            <Pressable onPress={() => router.push('/shoes/new')}>
              {({ pressed }) => (
                <View style={[s.addBtn, { marginTop: 12 }, pressed && { opacity: 0.8 }]}>
                  <Feather name="plus" size={14} color="#ffffff" />
                  <Text style={s.addBtnText}>추가</Text>
                </View>
              )}
            </Pressable>
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
            <Feather name="package" size={20} color="#94a3b8" />
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
                  <Feather name="edit-2" size={14} color="#475569" />
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
  const themePref = useThemePref((s) => s.pref);
  const setThemePref = useThemePref((s) => s.setPref);

  function handleTheme() {
    Alert.alert('테마', '화면 색깔 모드를 선택하세요', [
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
            onPress={() => { onClose(); Alert.alert('알림 설정', '준비 중인 기능입니다.'); }}
          />
          <MenuButton
            icon="lock"
            label="개인정보 처리방침"
            onPress={() => { onClose(); Alert.alert('안내', '준비 중인 기능입니다.'); }}
          />
          <MenuButton
            icon="help-circle"
            label="고객센터 / 문의하기"
            onPress={() => { onClose(); Alert.alert('고객센터', '준비 중인 기능입니다.'); }}
          />

          <View style={s.modalDivider} />

          <MenuButton
            icon="log-out"
            label="로그아웃"
            color="#ef4444"
            onPress={() => { onClose(); onLogout(); }}
          />
        </View>
      </View>
    </Modal>
  );
}

function MenuButton({ icon, label, color = '#0f172a', onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={s.menuBtn}>
        <Feather name={icon} size={18} color={color} />
        <Text style={[s.menuBtnText, { color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
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
    backgroundColor: '#f1f5f9',
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
    backgroundColor: '#f0f9ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 12,
  },
  footCardLeft: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bae6fd',
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
  footCardTitle: { fontSize: 14, fontWeight: '900', color: '#0c4a6e' },
  footEditChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  footEditChipText: { fontSize: 12, fontWeight: '800', color: '#0891b2' },
  footEmptyText: { fontSize: 12, color: '#64748b', lineHeight: 17 },
  footChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  footMiniChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  footMiniChipText: { fontSize: 11, fontWeight: '700', color: '#0c4a6e' },

  sectionTitleCount: { color: '#06b6d4' },
  flex1: { flex: 1 },
  shoeListGap: { gap: 10 },
  shoeEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  shoeEmptyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ecfeff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoeEmptyTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  shoeEmptySub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

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
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ecfeff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#06b6d4',
    fontSize: 36,
    fontWeight: '800',
  },
  profileInfo: {
    alignItems: 'center',
    gap: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  profileEmail: {
    fontSize: 12,
    color: '#94a3b8',
  },
  instaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#cffafe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  instaTagText: {
    color: '#06b6d4',
    fontSize: 12,
    fontWeight: '700',
  },
  instaConnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  instaConnectText: {
    color: '#64748b',
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
    backgroundColor: '#ecfeff',
  },
  bodyStripEmptyText: {
    color: '#06b6d4',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  bodyPillUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: -2,
  },
  bodyPillSub: {
    fontSize: 10,
    color: '#64748b',
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
    color: '#0f172a',
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
    color: '#ef4444',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 16,
    shadowColor: '#0f172a',
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
    color: '#94a3b8',
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  emptyStatsCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyStatsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyStatsSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  gymListContainer: {
    gap: 10,
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
    color: '#0f172a',
    paddingHorizontal: 4,
  },
  addMembershipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#06b6d4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#06b6d4',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addMembershipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyMembershipCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyMembershipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyMembershipSubtitle: {
    fontSize: 11,
    color: '#64748b',
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
    color: '#94a3b8',
    paddingHorizontal: 4,
  },

  // Membership Card Styles
  mCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0f172a',
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
    backgroundColor: '#f8fafc',
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
    borderLeftWidth: 5,
    borderLeftColor: '#cbd5e1',
  },
  mCardUrgent: {
    borderColor: '#fecaca',
    borderLeftWidth: 5,
    borderLeftColor: '#ef4444',
  },
  mCardPasses: {
    borderLeftWidth: 5,
    borderLeftColor: '#06b6d4',
  },
  mCardPeriod: {
    borderLeftWidth: 5,
    borderLeftColor: '#6366f1',
  },
  mIconBoxPasses: {
    backgroundColor: '#ecfeff',
  },
  mIconBoxPeriod: {
    backgroundColor: '#e0e7ff',
  },
  mIconBoxUrgent: {
    backgroundColor: '#ffe4e6',
  },
  ticketDivider: {
    width: 0,
    height: 44,
    borderWidth: 0.8,
    borderColor: '#e2e8f0',
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    zIndex: 10,
  },
  ticketCutoutBottom: {
    position: 'absolute',
    right: 78,
    bottom: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mIconBoxMuted: {
    backgroundColor: '#f1f5f9',
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
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#cffafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#06b6d4',
  },
  mBadgePeriod: {
    backgroundColor: '#e0e7ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mBadgeTextPeriod: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4f46e5',
  },
  mCountBadge: {
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#cffafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mCountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0891b2',
  },
  mCountBadgeExpired: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mCountBadgeTextExpired: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  mBadgeExpired: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mBadgeTextExpired: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  mBadgeUrgent: {
    backgroundColor: '#ffe4e6',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mBadgeTextUrgent: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ef4444',
  },
  mGymText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  mGymTextExpired: {
    fontSize: 15,
    fontWeight: '800',
    color: '#64748b',
  },
  mSubtitleText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
  },
  mSubtitleTextUrgent: {
    color: '#ef4444',
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
    color: '#0f172a',
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
    color: '#475569',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#06b6d4',
    shadowColor: '#06b6d4',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
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
    backgroundColor: '#ecfeff',
  },
  crewOutlineBtnText: {
    color: '#06b6d4',
    fontSize: 12,
    fontWeight: '800',
  },
  shoeRackContainer: {
    paddingVertical: 12,
    gap: 16,
  },
  emptyShelfSlot: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 4,
  },
  emptyShelfText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
  },
  emptyShelfSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  shoeCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#0f172a',
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
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  shoeCardBody: { flex: 1, minWidth: 0, gap: 4 },
  shoeBrand: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  shoeModelName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  primaryChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  primaryChipText: { fontSize: 10, fontWeight: '800', color: '#92400e' },
  sizePill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sizePillText: { fontSize: 11, fontWeight: '900', color: '#0f172a' },
  overallRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  overallStar: { fontSize: 13, color: '#10b981' },
  overallNum: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  shoeChipsRow: { flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  tagChipActive: {
    borderWidth: 1,
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagChipActiveText: { fontSize: 10, fontWeight: '800', color: '#047857' },
  tagChip: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagChipText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  shoeActionsCol: { gap: 6 },
  shoeActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
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
    color: '#475569',
    width: 32,
  },
  miniBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  miniBarFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 3 },
  miniBarValue: { fontSize: 9, fontWeight: '800', color: '#0f172a', minWidth: 10, textAlign: 'right' },
  shoeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  shoeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  shoeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  shoeMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
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
    backgroundColor: '#ffffff',
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
    color: '#0f172a',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#0f172a',
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
    color: '#0f172a',
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  crewGymText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  }
});
