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
import { Feather } from '@expo/vector-icons';

import { ShoeSizeGuide } from '@/components/shoes/shoe-size-guide';
import { GymStatsCard } from '@/components/stats/gym-stats-card';
import { useProfile } from '@/hooks/use-profile';
import {
  SHOE_STATUS_LABEL,
  useShoes,
  type ClimbingShoe,
  type ShoeStatus,
} from '@/hooks/use-shoes';
import { useUserStats } from '@/hooks/use-user-stats';
import {
  daysFromTodayTo,
  isExpiringSoon,
  isMembershipExpired,
  useMemberships,
  useUsePass,
  type MembershipRow,
} from '@/hooks/use-memberships';
import { useAuth } from '@/lib/auth-context';
import { currentMonth, monthRange } from '@/lib/date-ranges';
import { supabase } from '@/lib/supabase';

const DEFAULT_EXPANDED_COUNT = 2;

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { data: profile } = useProfile();
  // 마페이지 카드는 "이번 달" 스코프. 전체 통계는 /stats 라우트로 이동.
  const monthAnchor = React.useMemo(() => currentMonth(), []);
  const thisMonthRange = React.useMemo(
    () => monthRange(monthAnchor.year, monthAnchor.month),
    [monthAnchor],
  );
  const { data: stats, isLoading, error } = useUserStats(thisMonthRange);
  const [menuVisible, setMenuVisible] = useState(false);

  const email = session?.user.email ?? '';
  const username = profile?.username ?? '...';
  const firstChar = username && username.length > 0 ? username.charAt(0).toUpperCase() : '?';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header bar */}
      <View style={s.header}>
        <Text style={s.headerTitle}>마이페이지</Text>
        <View style={s.headerActions}>
          <Pressable
            onPress={() => setMenuVisible(true)}
            style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.6 }]}
            hitSlop={6}
          >
            <Feather name="menu" size={20} color="#0f172a" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>
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
            <Text style={s.profileEmail} numberOfLines={1}>
              {email}
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

              {/* Gym list */}
              {stats.gyms.length === 0 ? (
                <View style={s.emptyStatsCard}>
                  <Feather name="activity" size={24} color="#94a3b8" />
                  <Text style={s.emptyStatsTitle}>아직 운동 기록이 없어요</Text>
                  <Text style={s.emptyStatsSubtitle}>기록 탭에서 첫 세션을 추가해보세요</Text>
                </View>
              ) : (
                <View style={s.gymListContainer}>
                  {stats.gyms.map((gym, i) => (
                    <GymStatsCard
                      key={gym.gymId}
                      gym={gym}
                      defaultExpanded={i < DEFAULT_EXPANDED_COUNT}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>

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

function SummaryMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: 'calendar' | 'check-circle' | 'award';
}) {
  return (
    <View style={s.metricCard}>
      <Feather name={icon} size={14} color="#475569" />
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
  climbingStartDate,
  onEdit,
}: {
  heightCm: number | null;
  reachCm: number | null;
  climbingStartDate: string | null;
  onEdit: () => void;
}) {
  const hasAny = heightCm != null || reachCm != null || climbingStartDate != null;
  if (!hasAny) {
    return (
      <View style={s.bodyStripWrap}>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [s.bodyStripEmptyBtn, pressed && { opacity: 0.7 }]}
        >
          <Feather name="plus" size={14} color="#94a3b8" />
          <Text style={s.bodyStripEmptyText}>
            키 · 리치 · 클라이밍 시작일 추가
          </Text>
        </Pressable>
      </View>
    );
  }

  const apeIndex =
    heightCm != null && reachCm != null ? reachCm - heightCm : null;

  return (
    <View style={s.bodyStripWrap}>
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [
          { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }
        ]}
      >
        <View style={s.bodyStripCard}>
          <BodyMetric label="키" value={heightCm != null ? `${heightCm}cm` : '-'} />
          <BodyDivider />
          <BodyMetric
            label="리치"
            value={reachCm != null ? `${reachCm}cm` : '-'}
            sub={apeIndex != null ? `${apeIndex > 0 ? '+' : ''}${apeIndex}` : null}
          />
          <BodyDivider />
          <BodyMetric
            label="클라이밍"
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

function BodyMetric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string | null;
}) {
  return (
    <View style={s.bodyMetricCol}>
      <Text style={s.bodyMetricLabel}>{label}</Text>
      <Text style={s.bodyMetricVal}>{value}</Text>
      {sub ? <Text style={s.bodyMetricSub}>{sub}</Text> : null}
    </View>
  );
}

function BodyDivider() {
  return <View style={s.bodyDivider} />;
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

  const isPasses = membership.membership_type === 'passes';
  const iconName = isPasses ? 'layers' : 'calendar';

  const cardStyle = [
    s.mCard,
    expired && s.mCardExpired,
    expSoon && s.mCardUrgent,
  ];

  const badgeStyle = expired
    ? s.mBadgeExpired
    : expSoon
    ? s.mBadgeUrgent
    : s.mBadge;

  const badgeTextStyle = expired
    ? s.mBadgeTextExpired
    : expSoon
    ? s.mBadgeTextUrgent
    : s.mBadgeText;

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
          <View style={[s.mIconBox, expired && s.mIconBoxMuted]}>
            <Feather
              name={iconName}
              size={20}
              color={expired ? '#94a3b8' : '#475569'}
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

          {/* Right: stat + use-pass button */}
          <View style={s.mRightCol}>
            <Text style={[s.mRightStatText, expSoon && s.mSubtitleTextUrgent]}>
              {formatMembershipRightStat(membership, expired)}
            </Text>

            {!expired && isPasses && (
              <Pressable
                onPress={handleUsePass}
                disabled={
                  usePass.isPending ||
                  (membership.total_passes != null &&
                    membership.used_passes >= membership.total_passes)
                }
                hitSlop={4}
              >
                {({ pressed: btnPressed }) => (
                  <View
                    style={[
                      s.usePassBtn,
                      membership.total_passes != null &&
                        membership.used_passes >= membership.total_passes &&
                        s.usePassBtnDisabled,
                      btnPressed && { opacity: 0.8 },
                    ]}
                  >
                    {usePass.isPending ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Feather name="check" size={12} color="white" />
                        <Text style={s.usePassBtnText}>사용</Text>
                      </>
                    )}
                  </View>
                )}
              </Pressable>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

function formatMembershipRightStat(m: MembershipRow, expired?: boolean): string {
  if (m.membership_type === 'passes') {
    const total = m.total_passes ?? 0;
    const remaining = Math.max(0, total - m.used_passes);
    if (expired) return '소진됨';
    return `${remaining}회 남음`;
  }
  if (!m.end_date) return '';
  if (expired) return '만료됨';
  const d = daysFromTodayTo(m.end_date);
  return d === 0 ? 'D-Day' : `D-${d}`;
}

// ─── Shoes section ───────────────────────────────────────────
function ShoesSection() {
  const router = useRouter();
  const { data, isLoading, error } = useShoes();
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <View style={s.sectionContainer}>
      <View style={s.sectionHeaderRow}>
        <View style={s.shoesTitleRow}>
          <Text style={s.sectionTitle}>내 암벽화</Text>
          <Pressable
            onPress={() => setGuideOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
          >
            <Feather name="info" size={14} color="#64748b" />
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
        <View style={s.emptyStatsCard}>
          <Feather name="package" size={24} color="#94a3b8" />
          <Text style={s.emptyStatsTitle}>등록된 암벽화가 없어요</Text>
          <Text style={s.emptyStatsSubtitle}>
            우측 상단 + 추가 버튼으로 등록하세요
          </Text>
        </View>
      )}

      {data && data.length > 0 && (
        <View style={s.shoeList}>
          {data.map((shoe) => (
            <ShoeCard key={shoe.id} shoe={shoe} />
          ))}
        </View>
      )}
    </View>
  );
}

function ShoeCard({ shoe }: { shoe: ClimbingShoe }) {
  const router = useRouter();
  const palette = STATUS_PALETTE[shoe.status];
  const title = [shoe.brand, shoe.model].filter(Boolean).join(' ') || shoe.model;
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/shoes/[id]', params: { id: shoe.id } })
      }
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
    >
      <View style={s.shoeCard}>
        <View style={s.shoeIcon}>
          <Feather name="package" size={18} color="#475569" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.shoeTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={s.shoeMetaRow}>
            {shoe.size ? (
              <Text style={s.shoeMetaText}>{shoe.size}</Text>
            ) : (
              <Text style={s.shoeMetaText}>사이즈 미입력</Text>
            )}
            <View
              style={[
                s.shoeStatusBadge,
                { backgroundColor: palette.bg, borderColor: palette.border },
              ]}
            >
              <Text style={[s.shoeStatusText, { color: palette.text }]}>
                {SHOE_STATUS_LABEL[shoe.status]}
              </Text>
            </View>
          </View>
        </View>
        <Feather name="chevron-right" size={16} color="#cbd5e1" />
      </View>
    </Pressable>
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
    backgroundColor: '#f8fafc',
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
  scrollContent: {
    paddingBottom: 40,
  },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  avatarContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: '#06b6d4',
    backgroundColor: '#ffffff',
    padding: 3,
    shadowColor: '#06b6d4',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
    backgroundColor: '#ecfeff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#06b6d4',
    fontSize: 28,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 20,
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
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#cffafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  instaTagText: {
    color: '#06b6d4',
    fontSize: 12,
    fontWeight: '700',
  },
  instaConnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
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
    borderRadius: 16,
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingVertical: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  bodyMetricCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  bodyMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  bodyMetricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  bodyMetricSub: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  bodyDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#f1f5f9',
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  summaryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
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
  },
  mCardUrgent: {
    borderColor: '#fecaca',
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
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    flexShrink: 0,
  },
  mRightStatText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  usePassBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#06b6d4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#06b6d4',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minWidth: 60,
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
  shoeList: { gap: 8 },
  shoeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#ffffff',
  },
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
  shoeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  shoeMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  shoeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  shoeStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  
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
});
