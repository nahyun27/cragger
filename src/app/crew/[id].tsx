import { customAlert } from '@/components/ui/custom-alert';
import { useLocalSearchParams, useRouter } from '@/lib/router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  type LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '@/lib/auth-context';
import {
  useCrewDetail,
  useDeleteCrew,
  useKickMember,
  useLeaveCrew,
  useTransferAndLeave,
  type CrewDetail,
  type CrewMember,
} from '@/hooks/use-crews';
import {
  useCrewFeed,
  useCrewMeetups,
  useMyLikes,
  useToggleLike,
  type PostRow,
} from '@/hooks/use-community';
import {
  useCrewAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  type CrewAnnouncement,
} from '@/hooks/use-crew-announcements';
import {
  useCrewActiveMembers,
  useCrewGradeDistribution,
  useCrewHomeStats,
  type CrewActiveMember,
} from '@/hooks/use-crew-stats';
import {
  effectiveStatus,
  resolveTeamConfigs,
  useBattleRanking,
  useBattles,
  type Battle,
  type BattleRanking,
} from '@/hooks/use-battles';
import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import { EmptyState } from '@/components/ui/empty-state';
import {
  useAcceptJoinRequest,
  useCrewJoinRequests,
  useMyJoinRequests,
  useRejectJoinRequest,
  useRequestJoinCrewById,
  type CrewJoinRequest,
} from '@/hooks/use-crew-requests';
import { FeaturedBadgeChip } from '@/components/ui/featured-badge-chip';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Sheet } from '@/components/ui/sheet';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

function getAvatarBg(name: string) {
  const colors = ['#e0f2fe', '#fef3c7', '#dcfce7', '#f3e8ff', '#fee2e2', '#e0e7ff'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}

function getAvatarFg(name: string) {
  const colors = ['#0369a1', '#b45309', '#15803d', '#6b21a8', '#b91c1c', '#4338ca'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
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

export default function CrewDetailScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();

  const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const { session: authSession } = useAuth();
  const meId = authSession?.user.id;
  const { data, isLoading, error } = useCrewDetail(id);
  const leaveCrew = useLeaveCrew();
  const deleteCrew = useDeleteCrew();
  const [transferOpen, setTransferOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);

  type TabState = 'home' | 'news' | 'activity' | 'members';
  const validInitial: TabState =
    initialTab === 'news' || initialTab === 'activity' || initialTab === 'members'
      ? initialTab
      : 'home';
  const [activeTab, setActiveTab] = useState<TabState>(validInitial);
  const tabItemLayouts = useRef<{ x: number; width: number }[]>([]);
  const crewTabX = useSharedValue(0);
  const crewIndicatorStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    bottom: 0,
    height: 3,
    width: 24,
    left: crewTabX.value,
    backgroundColor: '#06b6d4',
    borderRadius: 2,
  }));
  useEffect(() => {
    const idxMap = { home: 0, news: 1, activity: 2, members: 3 } as const;
    const idx = idxMap[activeTab];
    const layout = tabItemLayouts.current[idx];
    if (layout) {
      const center = layout.x + layout.width / 2;
      crewTabX.value = withTiming(center - 12, { duration: 220, easing: Easing.out(Easing.ease) });
    }
  }, [activeTab]);

  if (isLoading) {
    return (
      <SafeAreaView style={s.safeCenter} edges={['top']}>
        <ActivityIndicator color={c.brand.primary} size="large" />
      </SafeAreaView>
    );
  }
  if (error || !data) {
    return (
      <SafeAreaView style={[s.safeCenter, { padding: 24 }]} edges={['top']}>
        <Text style={s.errorText}>
          {error?.message ?? '크루를 찾을 수 없어요'}
        </Text>
        <Pressable onPress={() => router.back()}>
          {({ pressed }) => (
            <View style={[s.backBtn, pressed && s.btnPressed]}>
              <Text style={s.backBtnText}>돌아가기</Text>
            </View>
          )}
        </Pressable>
      </SafeAreaView>
    );
  }

  const isOwner = data.my_role === 'owner';
  const isMember = data.my_role != null;

  async function handleCopyCode() {
    if (!data) return;
    await Clipboard.setStringAsync(data.invite_code);
    // Sheet 닫은 다음 알림 — 모달 스택 충돌 회피.
    setShowInviteCode(false);
    setTimeout(() => {
      customAlert('복사됨', `초대코드 ${data.invite_code} 가 클립보드에 복사됐어요.`);
    }, 250);
  }

  function handleLeave() {
    if (!data) return;
    customAlert('크루를 나갈까요?', '다시 들어오려면 초대코드가 필요해요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveCrew.mutateAsync(data.id);
            router.replace('/(tabs)/profile');
          } catch (e) {
            customAlert('실패', e instanceof Error ? e.message : '알 수 없는 오류');
          }
        },
      },
    ]);
  }

  function handleDelete() {
    if (!data) return;
    customAlert('크루를 삭제할까요?', '모든 멤버가 빠지고 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCrew.mutateAsync(data.id);
            router.replace('/(tabs)/profile');
          } catch (e) {
            customAlert('실패', e instanceof Error ? e.message : '알 수 없는 오류');
          }
        },
      },
    ]);
  }

  function handleOpenMenu() {
    if (!data) return;
    const options: Array<{ text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }> = [];
    if (isMember) {
      options.push({ text: '공지 작성', onPress: () => setComposerOpen(true) });
    }
    if (isOwner) {
      options.push({
        text: '크루 정보 수정',
        onPress: () =>
          router.push({ pathname: '/crew/[id]/edit', params: { id: data.id } } as never),
      });
      options.push({ text: '크루 삭제', style: 'destructive', onPress: handleDelete });
    }
    options.push({ text: '취소', style: 'cancel' });
    customAlert('크루 관리', undefined, options);
  }

  const colors = getCrewAvatarColors(data.name);
  const firstChar = data.name.length > 0 ? data.name.charAt(0).toUpperCase() : '?';

  return (
    <SafeAreaView style={s.safeContainer} edges={['left', 'right']}>
      <ScreenHeader
        title="크루 정보"
        onBack={() => router.back()}
        rightActions={
          isMember
            ? [{ icon: 'more-vertical', onPress: handleOpenMenu }]
            : undefined
        }
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg.primary }}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 12 }]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Area */}
        {/* Hero Area */}
        {/* Horizontal Header (Reference Style) */}
        <View style={s.profileHeaderRow}>
          <View style={[s.profileAvatarRing, { borderColor: colors.border }]}>
            <View style={[s.profileAvatarInner, { backgroundColor: colors.bg }]}>
              {data.image_url ? (
                <Image source={{ uri: data.image_url }} style={s.profileAvatarImage} resizeMode="cover" />
              ) : (
                <Text style={[s.profileAvatarText, { color: colors.text }]}>
                  {firstChar}
                </Text>
              )}
            </View>
          </View>
          
          <View style={s.profileHeaderInfo}>
            <View style={s.profileTitleRow}>
              <Text style={s.profileName} numberOfLines={1}>
                {data.name}
              </Text>
              <View style={s.profileTitleActions}>
                {isMember && (
                  <Pressable onPress={() => setShowInviteCode(true)} hitSlop={8}>
                    {({ pressed }) => (
                      <View style={[s.headerKeyBtn, pressed && { opacity: 0.6 }]}>
                        <Feather name="key" size={16} color={c.brand.primary} />
                      </View>
                    )}
                  </Pressable>
                )}
                {isOwner && (
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: '/crew/[id]/edit', params: { id: data.id } } as never)
                    }
                    hitSlop={8}
                  >
                    {({ pressed }) => (
                      <View style={[s.headerKeyBtn, pressed && { opacity: 0.6 }]}>
                        <Feather name="edit-2" size={14} color={c.brand.primary} />
                      </View>
                    )}
                  </Pressable>
                )}
              </View>
            </View>
            <View style={s.profileSubRow}>
              <Text style={s.profileMemberCount}>회원 {data.member_count}명</Text>
              {data.region && (
                <View style={s.regionChip}>
                  <Feather name="map-pin" size={10} color={c.brand.primary} />
                  <Text style={s.regionChipText}>{data.region}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {(data.description || data.home_gym) && (
          <View style={s.profileDescriptionBox}>
            {data.description && (
              <Text style={s.profileDescriptionText}>
                {data.description}
              </Text>
            )}
            {data.home_gym && (
              <View style={s.profileMetaRow}>
                <Feather name="home" size={12} color={c.text.tertiary} />
                <Text style={s.profileGymText}>
                  {data.home_gym.name} {data.home_gym.branch || ''}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 비멤버 — 공개 프리뷰 + CTA */}
        {!isMember && <PublicCrewPreview crewId={data.id} isRecruiting={data.is_recruiting} />}

        {/* Tab Bar — 멤버 전용 */}
        {isMember && (
          <View style={s.tabBarContainer}>
            {(['home', 'news', 'activity', 'members'] as TabState[]).map((tab, i) => {
               const labels: Record<TabState, string> = { home: '홈', news: '소식', activity: '활동', members: '멤버' };
               const isActive = activeTab === tab;
               return (
                 <Pressable
                   key={tab}
                   style={s.tabItem}
                   onPress={() => setActiveTab(tab)}
                   onLayout={(e: LayoutChangeEvent) => {
                     const { x, width } = e.nativeEvent.layout;
                     tabItemLayouts.current[i] = { x, width };
                     if (activeTab === tab) {
                       crewTabX.value = x + width / 2 - 12;
                     }
                   }}
                 >
                   <Text style={[s.tabText, isActive && s.tabTextActive]}>{labels[tab]}</Text>
                 </Pressable>
               );
            })}
            <Animated.View style={crewIndicatorStyle} />
          </View>
        )}

        {/* Tab Content Area */}
        <View style={s.tabContentArea}>
          
          {/* ---- HOME TAB ---- */}
          {activeTab === 'home' && (
            <View style={s.tabPane}>
              {/* 최근 공지 한 줄 */}
              {isMember && (
                <LatestNoticeStrip crewId={data.id} onPress={() => setActiveTab('news')} />
              )}

              {/* 활동 멤버 가로 스크롤 */}
              {isMember && (
                <ActiveMembersStrip
                  crewId={data.id}
                  ownerId={data.owner_id}
                  onMore={() => setActiveTab('members')}
                />
              )}

              {/* Crew stats strip */}
              {isMember && <CrewStatsStrip crewId={data.id} />}

              {/* Grade distribution chart */}
              {isMember && <CrewGradeChart crewId={data.id} />}
            </View>
          )}

          {/* Invite code sheet — header key icon triggers this */}
          {isMember && (
            <Sheet
              visible={showInviteCode}
              onClose={() => setShowInviteCode(false)}
              variant="center"
              title="멤버십 초대코드"
              subtitle="탭하면 복사돼요"
            >
              <View style={[s.inviteCard, { borderColor: colors.border, marginHorizontal: 0, marginBottom: 0 }]}>
                <View style={[s.inviteBgDeco, { backgroundColor: colors.bg }]} />
                <Pressable onPress={handleCopyCode}>
                  {({ pressed }) => (
                    <View style={[s.inviteCodeBox, pressed && s.btnPressed]}>
                      <Text style={[s.inviteCodeText, { color: colors.text }]}>
                        {data.invite_code}
                      </Text>
                      <View style={[s.copyBadge, { backgroundColor: colors.text, shadowColor: colors.text }]}>
                        <Feather name="copy" size={12} color="#ffffff" />
                        <Text style={s.copyBadgeText}>복사</Text>
                      </View>
                    </View>
                  )}
                </Pressable>
              </View>
            </Sheet>
          )}

          {/* ---- NEWS TAB ---- */}
          {activeTab === 'news' && (
            <View style={s.tabPane}>
              {isMember && (
                <AnnouncementsSection
                  crewId={data.id}
                  meId={meId}
                  onCompose={() => setComposerOpen(true)}
                />
              )}

              {/* Crew Feed */}
              {isMember && <CrewFeedSection crewId={data.id} />}
            </View>
          )}

          {/* ---- ACTIVITY TAB ---- */}
          {activeTab === 'activity' && (
            <View style={s.tabPane}>
              {/* Crew Battles */}
              {isMember && <CrewBattlesSection crewId={data.id} />}

              {/* Crew Gatherings */}
              {isMember && <CrewMeetupsSection crewId={data.id} />}
            </View>
          )}

          {/* ---- MEMBERS TAB ---- */}
          {activeTab === 'members' && (
            <View style={s.tabPane}>
              {/* 가입 요청 (owner only) */}
              {isOwner && <JoinRequestsSection crewId={data.id} />}

              {/* Members List */}
              <View style={s.sectionGap}>
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionTitle}>
                    멤버 <Text style={s.sectionTitleCount}>{data.member_count}</Text>
                  </Text>
                </View>
                <View style={s.memberListCard}>
                  {data.members.map((m, i) => (
                    <MemberRow
                      key={m.user_id}
                      member={m}
                      isOwnerView={isOwner}
                      isMe={m.user_id === meId}
                      crewId={data.id}
                      isLast={i === data.members.length - 1}
                    />
                  ))}
                </View>
              </View>

              {/* Leave/Transfer buttons */}
              {isMember && !isOwner && (
                <Pressable onPress={handleLeave}>
                  {({ pressed }) => (
                    <View style={[s.leaveBtn, pressed && s.btnPressed]}>
                      <Text style={s.leaveBtnText}>크루 나가기</Text>
                    </View>
                  )}
                </Pressable>
              )}
              {isOwner && (
                <Pressable
                  onPress={() => {
                    if (data.members.length <= 1) {
                      customAlert(
                        '혼자 있는 크루',
                        '본인뿐이라 위임할 멤버가 없어요. 크루를 삭제해주세요.',
                      );
                      return;
                    }
                    setTransferOpen(true);
                  }}
                >
                  {({ pressed }) => (
                    <View style={[s.transferBtn, pressed && s.btnPressed]}>
                      <Text style={s.transferBtnText}>
                        크루장 위임 후 나가기
                      </Text>
                    </View>
                  )}
                </Pressable>
              )}
            </View>
          )}

        </View>
      </ScrollView>

      <TransferOwnerModal
        visible={transferOpen}
        crew={data}
        meId={meId}
        onClose={() => setTransferOpen(false)}
        onDone={() => {
          setTransferOpen(false);
          router.replace('/(tabs)/profile');
        }}
      />

      <AnnouncementComposer
        visible={composerOpen}
        crewId={data.id}
        canPin={isOwner}
        onClose={() => setComposerOpen(false)}
      />
    </SafeAreaView>
  );
}

function TransferOwnerModal({
  visible,
  crew,
  meId,
  onClose,
  onDone,
}: {
  visible: boolean;
  crew: CrewDetail;
  meId: string | undefined;
  onClose: () => void;
  onDone: () => void;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const [selected, setSelected] = useState<string | null>(null);
  const [alsoLeave, setAlsoLeave] = useState(true);
  const transfer = useTransferAndLeave();
  const candidates = crew.members.filter((m) => m.user_id !== meId);

  React.useEffect(() => {
    if (!visible) {
      setSelected(null);
      setAlsoLeave(true);
    }
  }, [visible]);

  function handleConfirm() {
    if (!selected) return;
    customAlert(
      alsoLeave ? '위임 + 탈퇴할까요?' : '크루장 위임할까요?',
      alsoLeave
        ? '선택한 멤버가 크루장이 되고, 본인은 크루를 나가요.'
        : '선택한 멤버가 크루장이 되고, 본인은 일반 멤버로 남아요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: async () => {
            try {
              await transfer.mutateAsync({
                crewId: crew.id,
                newOwnerId: selected,
                alsoLeave,
              });
              if (alsoLeave) onDone();
              else onClose();
            } catch (e) {
              customAlert('실패', e instanceof Error ? e.message : '오류');
            }
          },
        },
      ],
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      variant="full"
      title="크루장 위임"
      subtitle="다음 크루장이 될 멤버를 선택하세요"
      footer={
        <Pressable
          onPress={handleConfirm}
          disabled={!selected || transfer.isPending}
        >
          {({ pressed }) => (
            <View style={[
              s.confirmBtn,
              !selected && s.confirmBtnDisabled,
              pressed && s.btnPressed,
            ]}>
              {transfer.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={[s.confirmBtnText, !selected && s.confirmBtnTextDisabled]}>
                  {alsoLeave ? '위임 + 나가기' : '위임'}
                </Text>
              )}
            </View>
          )}
        </Pressable>
      }
    >
      <View style={s.candidateListContainer}>
        {candidates.map((m, i) => {
          const active = selected === m.user_id;
          const name = m.user?.display_name || m.user?.username || '익명';
          return (
            <Pressable
              key={m.user_id}
              onPress={() => setSelected(m.user_id)}
            >
              {({ pressed }) => (
                <View style={[
                  s.candidateRow,
                  active && s.candidateRowActive,
                  i !== candidates.length - 1 && s.candidateRowDivider,
                  pressed && s.btnPressed,
                ]}>
                  <View style={[s.candidateAvatar, { backgroundColor: c.bg.subtle }]}>
                    {m.user?.avatar_url ? (
                      <Image
                        source={{ uri: m.user.avatar_url }}
                        style={s.emblemImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={s.candidateAvatarText}>
                        {(name[0] ?? '?').toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Text style={s.candidateNameText} numberOfLines={1}>
                    {name}
                  </Text>
                  <View style={[
                    s.candidateRadio,
                    active && s.candidateRadioActive,
                  ]}>
                    {active && <Feather name="check" size={11} color="#ffffff" />}
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={() => setAlsoLeave(!alsoLeave)}>
        {({ pressed }) => (
          <View style={[s.checkboxContainer, pressed && s.btnPressed]}>
            <View style={[s.checkbox, alsoLeave && s.checkboxActive]}>
              {alsoLeave && <Feather name="check" size={11} color="#ffffff" />}
            </View>
            <Text style={s.checkboxLabel}>위임 후 크루 나가기</Text>
          </View>
        )}
      </Pressable>
    </Sheet>
  );
}

function CrewBattlesSection({ crewId }: { crewId: string }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const router = useRouter();
  const { data, isLoading, error } = useBattles(crewId);

  const partitioned = React.useMemo(() => {
    if (!data) return { active: [] as Battle[], ended: [] as Battle[], scheduled: [] as Battle[] };
    const active: Battle[] = [];
    const ended: Battle[] = [];
    const scheduled: Battle[] = [];
    for (const b of data) {
      const st = effectiveStatus(b);
      if (st === 'scheduled') scheduled.push(b);
      else if (st === 'ended' || st === 'declined') ended.push(b);
      else active.push(b);
    }
    return { active, ended, scheduled };
  }, [data]);

  return (
    <View style={s.sectionGap}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>크루 대결</Text>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/battle/new', params: { crewId } } as never)
          }
        >
          {({ pressed }) => (
            <View style={[s.actionBtn, s.actionBtnCyan, pressed && s.btnPressed]}>
              <Feather name="zap" size={12} color="#0891b2" />
              <Text style={s.actionBtnTextCyan}>대결 만들기</Text>
            </View>
          )}
        </Pressable>
      </View>

      {isLoading && (
        <View style={s.loaderBox}>
          <ActivityIndicator color={c.brand.primary} />
        </View>
      )}
      {error && (
        <View style={s.errorBox}>
          <Text style={s.errorBoxText}>{error.message}</Text>
        </View>
      )}

      {data && data.length === 0 && (
        <EmptyState compact icon="zap" tone="muted" title="아직 대결이 없어요" />
      )}

      {partitioned.scheduled.length > 0 && (
        <View style={s.cardListGap}>
          {partitioned.scheduled.map((b) => <BattleCard key={b.id} battle={b} crewId={crewId} />)}
        </View>
      )}
      {partitioned.active.length > 0 && (
        <View style={s.cardListGap}>
          {partitioned.active.map((b) => <BattleCard key={b.id} battle={b} crewId={crewId} />)}
        </View>
      )}
      {partitioned.ended.length > 0 && (
        <View style={[s.cardListGap, { marginTop: 8 }]}>
          <Text style={s.pastLabelText}>지난 대결</Text>
          {partitioned.ended.map((b) => <BattleCard key={b.id} battle={b} crewId={crewId} past />)}
        </View>
      )}
    </View>
  );
}

function BattleCard({ battle, crewId, past }: { battle: Battle; crewId: string; past?: boolean }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { session: authSession } = useAuth();
  const meId = authSession?.user.id;

  const router = useRouter();
  const status = effectiveStatus(battle);
  const isCrewVs = battle.battle_type === 'crew_vs_crew';
  const isTeam = battle.battle_type === 'crew_internal_team';
  const isHome = battle.crew_id === crewId;
  const opponent = isHome ? battle.opponent_crew : battle.crew;

  // 종료된 대결만 ranking fetch (다른 페이지와 cache 공유).
  const rankingQ = useBattleRanking(past ? battle.id : undefined);
  const outcome = useMemo(
    () => (past && rankingQ.data && meId ? computeOutcome(battle, rankingQ.data, meId, isHome) : null),
    [past, rankingQ.data, meId, battle, isHome],
  );
  const myEntry = rankingQ.data?.individuals.find((p) => p.user_id === meId) ?? null;

  const typeLabel = isCrewVs ? '크루전' : isTeam ? '팀전' : '개인전';
  const statusMeta = ({
    scheduled: { bg: '#fff7ed', fg: '#c2410c', label: '예정' },
    active: { bg: '#ecfeff', fg: '#0e7490', label: '진행 중' },
    ended: { bg: '#f1f5f9', fg: '#64748b', label: '종료' },
    declined: { bg: '#fef2f2', fg: '#b91c1c', label: '거절됨' },
  } as Record<string, { bg: string; fg: string; label: string }>)[status]
    ?? { bg: '#f1f5f9', fg: '#64748b', label: status };

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/battle/[id]', params: { id: battle.id } } as never)
      }
    >
      {({ pressed }) => (
        <View style={[
          s.battleCard,
          past && s.battleCardPast,
          pressed && s.cardPressed
        ]}>
          {/* 상단 행 — 상태/타입 + (결과칩 우측) + chevron */}
          <View style={s.battleCardHeader}>
            <View style={[s.rowCenterGap, { flex: 1, minWidth: 0 }]}>
              <View style={[s.battleStatusTag, { backgroundColor: statusMeta.bg }]}>
                <Text style={[s.battleStatusText, { color: statusMeta.fg }]}>
                  {statusMeta.label}
                </Text>
              </View>
              <Text style={s.battleTypeText}>{typeLabel}</Text>
            </View>
            {outcome && <OutcomeChip outcome={outcome} c={c} s={s} />}
            <Feather name="chevron-right" size={15} color={c.border.strong} />
          </View>

          {/* 제목 */}
          <Text style={s.battleTitleText} numberOfLines={2}>
            {battle.title}
          </Text>

          {/* 결과 상세 — 승패의 경우 점수 비교 한 줄 */}
          {outcome && outcome.kind === 'win_loss' && (
            <View style={s.outcomeScoreLine}>
              <Text style={s.outcomeScoreName} numberOfLines={1}>
                {outcome.myLabel}
              </Text>
              <Text style={s.outcomeScoreVal}>{outcome.myScore}</Text>
              <Text style={s.outcomeScoreVs}>vs</Text>
              <Text style={s.outcomeScoreValMuted}>{outcome.opponentScore}</Text>
              <Text
                style={[s.outcomeScoreName, { textAlign: 'right', color: c.text.tertiary }]}
                numberOfLines={1}
              >
                {outcome.opponentLabel}
              </Text>
            </View>
          )}

          {/* 상대 크루 (진행/예정 크루전 — 결과 칩 없을 때만) */}
          {isCrewVs && opponent && !outcome && (
            <View style={s.battleVSContainer}>
              <Text style={s.battleVSTag}>VS</Text>
              <Text style={s.battleOpponentText} numberOfLines={1}>
                {opponent.name}
              </Text>
            </View>
          )}

          {/* 날짜 + 암장 */}
          <View style={s.battleDateRow}>
            <Feather name="calendar" size={10} color={c.text.muted} />
            <Text style={s.battleDateText}>
              {battle.battle_date.slice(5, 10).replace('-', '.')}
              {battle.gym ? ` · ${battle.gym.name}${battle.gym.branch ? ` ${battle.gym.branch}` : ''}` : ''}
            </Text>
          </View>

          {/* 내 색깔별 완등 */}
          {past && myEntry && myEntry.send_count > 0 && (
            <View style={s.myResultRow}>
              <Text style={s.myResultLabel}>내 완등</Text>
              <Text style={s.myResultCount}>{myEntry.send_count}</Text>
              {myEntry.color_sends.slice(0, 4).map((entry) => (
                <View key={entry.color} style={s.myResultColorChip}>
                  <View
                    style={[
                      s.myResultDot,
                      { backgroundColor: resolveColorHex(entry.color) },
                    ]}
                  />
                  <Text style={s.myResultColorCount}>×{entry.count}</Text>
                </View>
              ))}
              {myEntry.color_sends.length > 4 && (
                <Text style={s.myResultMore}>+{myEntry.color_sends.length - 4}</Text>
              )}
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

// 결과 칩 — 헤더 우측에 작게 배치.
function OutcomeChip({
  outcome,
  c,
  s,
}: {
  outcome: BattleOutcome;
  c: ThemeColors;
  s: ReturnType<typeof makeStyles>;
}) {
  if (outcome.kind === 'win_loss') {
    const { result } = outcome;
    const iconName =
      result === 'win' ? 'trophy' : result === 'lose' ? 'medal' : 'equal';
    const iconColor =
      result === 'win' ? '#15803d' : result === 'lose' ? '#b91c1c' : '#a16207';
    const label = result === 'win' ? '승' : result === 'lose' ? '패' : '무';
    const bgStyle =
      result === 'win'
        ? s.chipBgWin
        : result === 'lose'
        ? s.chipBgLose
        : s.chipBgDraw;
    return (
      <View style={[s.outcomeChip, bgStyle]}>
        <MaterialCommunityIcons name={iconName} size={11} color={iconColor} />
        <Text style={[s.outcomeChipLabel, { color: iconColor }]}>{label}</Text>
      </View>
    );
  }
  // rank
  const iconName =
    outcome.rank === 1
      ? 'trophy'
      : outcome.rank === 2
      ? 'medal'
      : outcome.rank === 3
      ? 'medal-outline'
      : 'flag-outline';
  return (
    <View style={[s.outcomeChip, s.chipBgRank]}>
      <MaterialCommunityIcons name={iconName as any} size={11} color={c.brand.primaryDeep} />
      <Text style={[s.outcomeChipLabel, { color: c.brand.primaryDeep }]}>
        {outcome.rank}
        <Text style={{ fontSize: 9, fontWeight: '700', color: c.text.tertiary }}>
          /{outcome.total}
        </Text>
      </Text>
    </View>
  );
}

// 지난 대결의 결과 — 크루전 / 2팀전 / 1:1 개인전 → 승패, 그 외 → 등수.
type BattleOutcome =
  | { kind: 'win_loss'; result: 'win' | 'lose' | 'draw'; myLabel: string; opponentLabel: string; myScore: number; opponentScore: number }
  | { kind: 'rank'; rank: number; total: number };

function computeOutcome(
  battle: Battle,
  ranking: BattleRanking,
  meId: string,
  isHome: boolean,
): BattleOutcome | null {
  const isCrewVs = battle.battle_type === 'crew_vs_crew';
  const isTeam = battle.battle_type === 'crew_internal_team';

  // 1) 크루 vs 크루 — 항상 승패
  if (isCrewVs && ranking.crewTotals.length >= 2) {
    const myCrewId = isHome ? battle.crew_id : battle.opponent_crew_id;
    const oppCrewId = isHome ? battle.opponent_crew_id : battle.crew_id;
    if (!myCrewId || !oppCrewId) return null;
    const my = ranking.crewTotals.find((c) => c.crew_id === myCrewId);
    const opp = ranking.crewTotals.find((c) => c.crew_id === oppCrewId);
    if (!my || !opp) return null;
    return {
      kind: 'win_loss',
      result: my.score === opp.score ? 'draw' : my.score > opp.score ? 'win' : 'lose',
      myLabel: my.crew_name || '우리 크루',
      opponentLabel: opp.crew_name || '상대 크루',
      myScore: my.score,
      opponentScore: opp.score,
    };
  }

  // 2) 2팀 팀전 — 승패
  if (isTeam) {
    const configs = resolveTeamConfigs(battle);
    if (configs.length === 2) {
      const me = ranking.individuals.find((p) => p.user_id === meId);
      if (!me || !me.team) return null;
      const myTeam = ranking.teamTotals.find((t) => t.team === me.team);
      const opp = ranking.teamTotals.find((t) => t.team !== me.team);
      if (!myTeam || !opp) return null;
      return {
        kind: 'win_loss',
        result: myTeam.score === opp.score ? 'draw' : myTeam.score > opp.score ? 'win' : 'lose',
        myLabel: myTeam.name,
        opponentLabel: opp.name,
        myScore: myTeam.score,
        opponentScore: opp.score,
      };
    }
  }

  // 3) 1:1 개인전 — 승패
  if (!isCrewVs && !isTeam && ranking.individuals.length === 2) {
    const me = ranking.individuals.find((p) => p.user_id === meId);
    const opp = ranking.individuals.find((p) => p.user_id !== meId);
    if (!me || !opp) return null;
    return {
      kind: 'win_loss',
      result: me.score === opp.score ? 'draw' : me.score > opp.score ? 'win' : 'lose',
      myLabel: '나',
      opponentLabel: opp.display_name || opp.username,
      myScore: me.score,
      opponentScore: opp.score,
    };
  }

  // 4) 그 외 — 등수
  const rank = ranking.individuals.findIndex((p) => p.user_id === meId);
  if (rank < 0) return null;
  return { kind: 'rank', rank: rank + 1, total: ranking.individuals.length };
}

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatMeetupShort(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const w = KO_WEEKDAYS[d.getDay()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${m}.${day}(${w}) ${hh}:${mi}`;
}

function CrewMeetupsSection({ crewId }: { crewId: string }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const router = useRouter();
  const { data, isLoading, error } = useCrewMeetups(crewId);

  return (
    <View style={s.sectionGap}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>크루 모임</Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/community/new',
              params: { crewId, type: 'meetup' },
            } as never)
          }
        >
          {({ pressed }) => (
            <View style={[s.actionBtn, s.actionBtnAmber, pressed && s.btnPressed]}>
              <Feather name="calendar" size={12} color="#b45309" />
              <Text style={s.actionBtnTextAmber}>모임 만들기</Text>
            </View>
          )}
        </Pressable>
      </View>

      {isLoading && (
        <View style={s.loaderBox}>
          <ActivityIndicator color="#d97706" />
        </View>
      )}

      {error && (
        <View style={s.errorBox}>
          <Text style={s.errorBoxText}>{error.message}</Text>
        </View>
      )}

      {data && data.upcoming.length === 0 && data.past.length === 0 && (
        <EmptyState compact icon="calendar" tone="muted" title="예정된 모임이 없어요" />
      )}

      {data && data.upcoming.length > 0 && (
        <View style={s.cardListGap}>
          {data.upcoming.map((m) => (
            <CrewMeetupCard key={m.id} meetup={m} />
          ))}
        </View>
      )}

      {data && data.past.length > 0 && (
        <View style={[s.cardListGap, { marginTop: 8 }]}>
          <Text style={s.pastLabelText}>지난 모임</Text>
          {data.past.map((m) => (
            <CrewMeetupCard key={m.id} meetup={m} past />
          ))}
        </View>
      )}
    </View>
  );
}

function CrewMeetupCard({ meetup, past }: { meetup: PostRow; past?: boolean }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const router = useRouter();
  const cap = meetup.meetup_capacity;
  const full = cap != null && meetup.participant_count >= cap;
  const location = meetup.gym
    ? `${meetup.gym.name}${meetup.gym.branch ? ` ${meetup.gym.branch}` : ''}`
    : meetup.meetup_location;

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/community/[id]', params: { id: meetup.id } })
      }
    >
      {({ pressed }) => (
        <View style={[
          s.meetupCard,
          past ? s.meetupCardPast : s.meetupCardActive,
          pressed && s.cardPressed
        ]}>
          <View style={s.meetupCardHeader}>
            <Text style={s.meetupTitleText} numberOfLines={1}>
              {meetup.title || '크루 모임'}
            </Text>
            <Feather name="chevron-right" size={15} color={c.border.strong} />
          </View>
          
          <View style={s.meetupMetaRow}>
            <Feather name="clock" size={11} color={c.text.tertiary} />
            <Text style={s.meetupMetaText}>
              {meetup.meetup_at ? formatMeetupShort(meetup.meetup_at) : '날짜 미정'}
            </Text>
          </View>
          
          {location && (
            <View style={s.meetupMetaRow}>
              <Feather name="map-pin" size={11} color={c.text.tertiary} />
              <Text style={s.meetupMetaText} numberOfLines={1}>
                {location}
              </Text>
            </View>
          )}
          
          <View style={[s.rowCenterSpace, { marginTop: 2 }]}>
            <View style={s.rowCenterGap}>
              <Feather name="users" size={11} color={c.text.tertiary} />
              <Text style={s.meetupMetaText}>
                {cap != null
                  ? `${meetup.participant_count} / ${cap}명`
                  : `${meetup.participant_count}명 (정원 무제한)`}
              </Text>
            </View>
            
            {full && !past && (
              <View style={s.meetupFullBadge}>
                <Text style={s.meetupFullText}>마감</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

function CrewFeedSection({ crewId }: { crewId: string }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const router = useRouter();
  const feed = useCrewFeed(crewId);
  const { data: likedSet } = useMyLikes();
  const posts = feed.data?.pages.flat() ?? [];

  return (
    <View style={s.sectionGap}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>크루 피드</Text>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/community/new', params: { crewId } } as never)
          }
        >
          {({ pressed }) => (
            <View style={[s.actionBtn, s.actionBtnCyan, pressed && s.btnPressed]}>
              <Feather name="edit-3" size={12} color="#0891b2" />
              <Text style={s.actionBtnTextCyan}>글쓰기</Text>
            </View>
          )}
        </Pressable>
      </View>

      {feed.isLoading && (
        <View style={s.loaderBox}>
          <ActivityIndicator color={c.brand.primary} />
        </View>
      )}

      {feed.error && (
        <View style={s.errorBox}>
          <Text style={s.errorBoxText}>{feed.error.message}</Text>
        </View>
      )}

      {!feed.isLoading && posts.length === 0 && (
        <EmptyState compact icon="message-square" tone="muted" title="크루 첫 글을 남겨보세요" />
      )}

      {posts.length > 0 && (
        <View style={s.cardListGap}>
          {posts.map((p) => (
            <CrewPostCard
              key={p.id}
              post={p}
              liked={likedSet?.has(p.id) ?? false}
              onPress={() =>
                router.push({ pathname: '/community/[id]', params: { id: p.id } })
              }
            />
          ))}
        </View>
      )}
    </View>
  );
}

function CrewPostCard({
  post,
  liked,
  onPress,
}: {
  post: PostRow;
  liked: boolean;
  onPress: () => void;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const toggle = useToggleLike();
  const author = post.author?.display_name || post.author?.username || '익명';
  const initial = (author[0] ?? '?').toUpperCase();
  const avatarBg = getAvatarBg(author);
  const avatarFg = getAvatarFg(author);

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View style={[s.feedCard, pressed && s.cardPressed]}>
          <View style={s.feedCardHeader}>
            <View style={s.feedAuthorContainer}>
              <View style={[s.feedAuthorAvatar, { backgroundColor: avatarBg }]}>
                {post.author?.avatar_url ? (
                  <Image
                    source={{ uri: post.author.avatar_url }}
                    style={s.emblemImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={[s.feedAuthorAvatarText, { color: avatarFg }]}>
                    {initial}
                  </Text>
                )}
              </View>
              <Text style={s.feedAuthorName}>
                {author}
              </Text>
            </View>
            <Feather name="chevron-right" size={15} color={c.border.strong} />
          </View>
          
          <View style={s.feedContent}>
            {post.title && (
              <Text style={s.feedTitle} numberOfLines={1}>
                {post.title}
              </Text>
            )}
            <Text style={s.feedBody} numberOfLines={3}>
              {post.body}
            </Text>
          </View>
          
          <View style={s.feedActionsRow}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                if (toggle.isPending) return;
                toggle.mutate({ postId: post.id, currentlyLiked: liked });
              }}
              hitSlop={6}
            >
              {({ pressed: likePressed }) => (
                <View style={[
                  s.feedActionPill,
                  liked && s.feedActionLiked,
                  likePressed && s.btnPressed
                ]}>
                  <Ionicons name={liked ? 'heart' : 'heart-outline'} size={12} color={liked ? '#ef4444' : '#94a3b8'} />
                  <Text style={[s.feedActionText, liked && s.feedActionTextLiked]}>
                    {post.like_count}
                  </Text>
                </View>
              )}
            </Pressable>
            
            <View style={s.feedActionPill}>
              <Feather name="message-circle" size={11} color={c.text.muted} />
              <Text style={s.feedActionText}>
                {post.comment_count}
              </Text>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

function MemberRow({
  member,
  isOwnerView,
  isMe,
  crewId,
  isLast,
}: {
  member: CrewMember;
  isOwnerView: boolean;
  isMe: boolean;
  crewId: string;
  isLast: boolean;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const router = useRouter();
  const kick = useKickMember();
  const name = member.user?.display_name || member.user?.username || '익명';
  const avatarUrl = member.user?.avatar_url;
  const showKick = isOwnerView && !isMe && member.role !== 'owner';

  function handleKick() {
    customAlert(
      `${name} 님을 추방할까요?`,
      '다시 가입하려면 초대코드가 필요해요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '추방',
          style: 'destructive',
          onPress: () =>
            kick.mutate(
              { crewId, userId: member.user_id },
              { onError: (e) => customAlert('실패', e instanceof Error ? e.message : '오류') },
            ),
        },
      ],
    );
  }

  function goToProfile() {
    if (isMe) {
      router.push({
        pathname: '/(tabs)/profile',
        params: { back: '1', returnTo: `/crew/${crewId}` },
      } as never);
    } else {
      router.push({
        pathname: '/u/[id]',
        params: { id: member.user_id, returnTo: `/crew/${crewId}` },
      } as never);
    }
  }

  return (
    <Pressable onPress={goToProfile}>
      {({ pressed }) => (
        <View style={[s.memberRow, !isLast && s.memberRowBorder, pressed && { opacity: 0.6 }]}>
          <UserAvatar
            userKey={member.user_id}
            username={name}
            avatarUrl={avatarUrl}
            size={40}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
            <Text style={s.memberNameText} numberOfLines={1}>
              {name}
              {isMe && <Text style={s.memberMeTag}> (나)</Text>}
            </Text>
            <FeaturedBadgeChip badgeKey={member.user?.featured_badge_key} size={12} />
          </View>
          {member.role === 'owner' && (
            <View style={s.memberOwnerBadge}>
              <Text style={s.memberOwnerText}>크루장</Text>
            </View>
          )}
          {showKick && (
            <Pressable onPress={handleKick} hitSlop={6}>
              {({ pressed: kpressed }) => (
                <View style={[s.kickBtn, kpressed && s.btnPressed]}>
                  <Feather name="user-x" size={15} color={c.status.danger} />
                </View>
              )}
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ── 공개 프리뷰 (비멤버) ───────────────────────────────────
function PublicCrewPreview({ crewId, isRecruiting }: { crewId: string; isRecruiting: boolean }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [askOpen, setAskOpen] = useState(false);
  const [message, setMessage] = useState('');
  const requestJoin = useRequestJoinCrewById();
  const { data: myRequests = [] } = useMyJoinRequests();
  const alreadyRequested = myRequests.some((r) => r.crew_id === crewId);

  async function handleSendRequest() {
    try {
      await requestJoin.mutateAsync({ crewId, message });
      setAskOpen(false);
      setMessage('');
      customAlert('요청 보냈어요', '크루장이 수락하면 알림이 도착해요.');
    } catch (e) {
      customAlert('요청 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <View style={s.publicPreview}>
      {isRecruiting ? (
        <>
          <View style={s.publicBadgeRow}>
            <View style={s.recruitingBadgePill}>
              <Feather name="user-plus" size={11} color={c.status.success} />
              <Text style={s.recruitingBadgePillText}>공개 모집 중</Text>
            </View>
          </View>
          {alreadyRequested ? (
            <View style={s.publicAlreadyChip}>
              <Feather name="clock" size={12} color={c.text.tertiary} />
              <Text style={s.publicAlreadyText}>요청 보냄 — 크루장 승인 대기</Text>
            </View>
          ) : (
            <Pressable onPress={() => setAskOpen(true)}>
              {({ pressed }) => (
                <View style={[s.publicCtaBtn, pressed && { opacity: 0.85 }]}>
                  <Feather name="user-plus" size={16} color={c.brand.onPrimary} />
                  <Text style={s.publicCtaText}>가입 요청 보내기</Text>
                </View>
              )}
            </Pressable>
          )}
        </>
      ) : (
        <EmptyState
          icon="lock"
          tone="muted"
          title="비공개 크루예요"
          description={'초대 코드를 받은 사람만 가입할 수 있어요.\n크루장에게 코드를 받아 입력해보세요.'}
          action={{
            label: '코드로 가입하기',
            icon: 'key',
            onPress: () => router.push('/crew/join' as never),
          }}
        />
      )}

      <Sheet
        visible={askOpen}
        onClose={() => setAskOpen(false)}
        variant="bottom"
        title="가입 요청"
        subtitle="크루장에게 짧은 인사를 남겨보세요 (선택)"
        footer={
          <Pressable onPress={handleSendRequest} disabled={requestJoin.isPending}>
            {({ pressed }) => (
              <View style={[s.publicCtaBtn, pressed && { opacity: 0.85 }]}>
                {requestJoin.isPending ? (
                  <ActivityIndicator color={c.brand.onPrimary} />
                ) : (
                  <Text style={s.publicCtaText}>요청 보내기</Text>
                )}
              </View>
            )}
          </Pressable>
        }
      >
        <TextInput
          placeholder="간단히 자기소개해보세요 (최대 100자)"
          placeholderTextColor={c.text.muted}
          value={message}
          onChangeText={(t) => setMessage(t.slice(0, 100))}
          multiline
          maxLength={100}
          style={s.publicMessageInput}
        />
      </Sheet>
    </View>
  );
}

// ── 가입 요청 섹션 (크루장 전용) ────────────────────────────
function JoinRequestsSection({ crewId }: { crewId: string }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: requests = [] } = useCrewJoinRequests(crewId);
  if (requests.length === 0) return null;
  return (
    <View style={s.sectionGap}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>
          가입 요청 <Text style={s.sectionTitleCount}>{requests.length}</Text>
        </Text>
      </View>
      <View style={s.memberListCard}>
        {requests.map((r, i) => (
          <JoinRequestRow
            key={r.id}
            request={r}
            isLast={i === requests.length - 1}
            crewId={crewId}
          />
        ))}
      </View>
    </View>
  );
}

function JoinRequestRow({ request, isLast, crewId }: { request: CrewJoinRequest; isLast: boolean; crewId: string }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const accept = useAcceptJoinRequest();
  const reject = useRejectJoinRequest();
  const name = request.user?.display_name || request.user?.username || '알 수 없음';
  const firstChar = name.length > 0 ? name.charAt(0).toUpperCase() : '?';

  function handleAccept() {
    customAlert(`${name} 가입을 수락할까요?`, undefined, [
      { text: '취소', style: 'cancel' },
      {
        text: '수락',
        onPress: () =>
          accept
            .mutateAsync(request.id)
            .catch((e) =>
              customAlert('실패', e instanceof Error ? e.message : '오류'),
            ),
      },
    ]);
  }
  function handleReject() {
    customAlert(`${name} 가입을 거절할까요?`, '거절은 즉시 적용돼요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '거절',
        style: 'destructive',
        onPress: () =>
          reject
            .mutateAsync(request.id)
            .catch((e) =>
              customAlert('실패', e instanceof Error ? e.message : '오류'),
            ),
      },
    ]);
  }

  return (
    <View
      style={[
        s.memberRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border.subtle },
      ]}
    >
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/u/[id]',
            params: { id: request.user_id, returnTo: `/crew/${crewId}` },
          } as never)
        }
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
      >
        <UserAvatar
          userKey={request.user_id}
          username={name}
          avatarUrl={request.user?.avatar_url}
          size={40}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.memberName} numberOfLines={1}>{name}</Text>
          {request.message ? (
            <Text style={s.memberSubtext} numberOfLines={2}>{request.message}</Text>
          ) : (
            <Text style={s.memberSubtext}>가입 인사 없음</Text>
          )}
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Pressable onPress={handleReject} hitSlop={4}>
          {({ pressed }) => (
            <View style={[s.reqRejectBtn, pressed && s.btnPressed]}>
              <Feather name="x" size={16} color={c.status.danger} />
            </View>
          )}
        </Pressable>
        <Pressable onPress={handleAccept} hitSlop={4}>
          {({ pressed }) => (
            <View style={[s.reqAcceptBtn, pressed && s.btnPressed]}>
              <Feather name="check" size={16} color={c.brand.onPrimary} />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ── 최근 공지 한 줄 ────────────────────────────────────────
function LatestNoticeStrip({ crewId, onPress }: { crewId: string; onPress: () => void }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data } = useCrewAnnouncements(crewId);
  const latest = data?.[0]; // 핀 + 최신순 정렬돼있음 — 첫 항목
  if (!latest) return null;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
      <View style={s.latestNoticeStrip}>
        <View style={s.latestNoticeIcon}>
          <Feather name="bookmark" size={12} color={c.brand.primary} />
        </View>
        <Text style={s.latestNoticeText} numberOfLines={1}>
          {latest.title}
        </Text>
        <Feather name="chevron-right" size={16} color={c.text.tertiary} />
      </View>
    </Pressable>
  );
}

// ── 활동 멤버 가로 스크롤 ──────────────────────────────────────
function ActiveMembersStrip({
  crewId,
  onMore,
}: {
  crewId: string;
  ownerId: string;
  onMore: () => void;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data } = useCrewActiveMembers(crewId);

  const top = (data ?? []).slice(0, 10);
  const total = (data ?? []).length;
  if (top.length === 0) return null;

  return (
    <View style={s.sectionGap}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>활동 멤버</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.activeMembersScroll}
      >
        {top.map((m) => (
          <ActiveMemberChip key={m.user_id} member={m} crewId={crewId} />
        ))}
        {total > top.length && (
          <Pressable
            onPress={onMore}
            style={({ pressed }) => [pressed && { opacity: 0.65 }]}
          >
            <View style={s.activeMembersMore}>
              <View style={s.activeMembersMoreCircle}>
                <Feather name="chevron-right" size={18} color={c.text.secondary} />
              </View>
              <Text style={s.activeMemberName} numberOfLines={1}>더보기</Text>
            </View>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function ActiveMemberChip({ member, crewId }: { member: CrewActiveMember; crewId: string }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const name = member.display_name || member.username;
  const isOwner = member.role === 'owner';

  return (
    <Pressable
      onPress={() => router.push({
        pathname: '/u/[id]',
        params: { id: member.user_id, returnTo: `/crew/${crewId}` },
      } as never)}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
    >
      <View style={s.activeMembersMore}>
        <View style={s.activeMemberAvatarContainer}>
          <View style={isOwner ? s.activeMemberAvatarOwnerRing : undefined}>
            <UserAvatar
              userKey={member.user_id}
              username={name}
              avatarUrl={member.avatar_url}
              size={56}
            />
          </View>
          {isOwner && (
            <View style={s.activeMemberOwnerBadge}>
              <Feather name="star" size={11} color={c.brand.onPrimary} />
            </View>
          )}
        </View>
        <Text style={s.activeMemberName} numberOfLines={1}>{name}</Text>
      </View>
    </Pressable>
  );
}

function CrewStatsStrip({ crewId }: { crewId: string }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data, isLoading } = useCrewHomeStats(crewId);
  if (isLoading || !data) return null;
  return (
    <View style={s.statsStripCard}>
      <View style={s.statsStripItem}>
        <Text style={s.statsStripValue}>
          {data.activityRate}<Text style={s.statsStripUnit}>%</Text>
        </Text>
        <Text style={s.statsStripLabel}>활동률</Text>
      </View>
      <View style={s.statsStripDivider} />
      <View style={s.statsStripItem}>
        <Text style={s.statsStripValue}>
          {data.avgVGrade ?? '-'}
        </Text>
        <Text style={s.statsStripLabel}>평균 실력</Text>
      </View>
      <View style={s.statsStripDivider} />
      <View style={s.statsStripItem}>
        <Text style={s.statsStripValue}>
          {data.meetupCountLastMonth}<Text style={s.statsStripUnit}>회</Text>
        </Text>
        <Text style={s.statsStripLabel}>지난달 모임</Text>
      </View>
    </View>
  );
}

const GRADE_AXIS = Array.from({ length: 11 }, (_, i) => ({ vGrade: `V${i}`, vNum: i }));

function CrewGradeChart({ crewId }: { crewId: string }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data, isLoading } = useCrewGradeDistribution(crewId);
  if (isLoading || !data) return null;

  const countMap = new Map(data.buckets.map((b) => [b.vNum, b.count]));
  const maxCount = Math.max(...data.buckets.map((b) => b.count), 1);
  const hasAny = data.buckets.length > 0;

  if (!hasAny) return null;

  return (
    <View style={s.sectionGap}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>실력 분포</Text>
      </View>
      <View style={s.gradeChartCard}>
        <View style={s.gradeChartRow}>
          {GRADE_AXIS.map((g) => {
            const count = countMap.get(g.vNum) ?? 0;
            const pct = count > 0 ? (count / maxCount) * 100 : 0;
            const isMe = data.myVNum === g.vNum;
            return (
              <View key={g.vGrade} style={s.gradeBarCol}>
                <Text style={s.gradeBarCount}>{count > 0 ? count : ''}</Text>
                <View style={s.gradeBarTrack}>
                  {count > 0 && (
                    <View
                      style={[
                        s.gradeBarFill,
                        isMe && s.gradeBarFillMe,
                        { height: `${Math.max(pct, 10)}%` },
                      ]}
                    />
                  )}
                </View>
                <Text style={[s.gradeBarLabel, isMe && s.gradeBarLabelMe]}>
                  {g.vGrade}
                </Text>
                {isMe && (
                  <View style={s.gradeMyMarker}>
                    <Text style={s.gradeMyMarkerText}>나</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function AnnouncementsSection({
  crewId,
  meId,
  onCompose,
}: {
  crewId: string;
  meId: string | undefined;
  onCompose: () => void;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data, isLoading, error } = useCrewAnnouncements(crewId);
  const items = data ?? [];

  return (
    <View style={s.sectionGap}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>
          공지 {items.length > 0 && <Text style={s.sectionTitleCount}>{items.length}</Text>}
        </Text>
        <Pressable onPress={onCompose}>
          {({ pressed }) => (
            <View style={[s.actionBtn, s.actionBtnCyan, pressed && s.btnPressed]}>
              <Feather name="edit-3" size={12} color="#0891b2" />
              <Text style={s.actionBtnTextCyan}>작성</Text>
            </View>
          )}
        </Pressable>
      </View>

      {isLoading && (
        <View style={s.loaderBox}>
          <ActivityIndicator color={c.brand.primary} />
        </View>
      )}

      {error && (
        <View style={s.errorBox}>
          <Text style={s.errorBoxText}>{error.message}</Text>
        </View>
      )}

      {!isLoading && items.length === 0 && (
        <EmptyState compact icon="volume-2" tone="muted" title="아직 공지가 없어요" />
      )}

      {items.length > 0 && (
        <View style={s.cardListGap}>
          {items.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} meId={meId} />
          ))}
        </View>
      )}
    </View>
  );
}

function AnnouncementCard({
  announcement,
  meId,
}: {
  announcement: CrewAnnouncement;
  meId: string | undefined;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const [expanded, setExpanded] = useState(false);
  const del = useDeleteAnnouncement();
  const author = announcement.author?.display_name || announcement.author?.username || '익명';
  const initial = (author[0] ?? '?').toUpperCase();
  const avatarBg = getAvatarBg(author);
  const avatarFg = getAvatarFg(author);
  const isMine = meId != null && announcement.author_id === meId;
  const date = new Date(announcement.created_at);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

  function handleDelete() {
    customAlert('공지를 삭제할까요?', '되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => del.mutate(announcement.id),
      },
    ]);
  }

  return (
    <Pressable onPress={() => setExpanded((v) => !v)}>
      {({ pressed }) => (
        <View style={[s.announceCard, pressed && s.cardPressed]}>
          <View style={s.announceHeader}>
            {announcement.pinned && (
              <View style={s.pinBadge}>
                <Feather name="bookmark" size={10} color="#ffffff" />
              </View>
            )}
            <Text style={s.announceTitle} numberOfLines={expanded ? undefined : 1}>
              {announcement.title}
            </Text>
          </View>

          <Text
            style={s.announceBody}
            numberOfLines={expanded ? undefined : 2}
          >
            {announcement.body}
          </Text>

          <View style={s.announceFooter}>
            <View style={s.announceAuthorRow}>
              <View style={[s.announceAuthorAvatar, { backgroundColor: avatarBg }]}>
                {announcement.author?.avatar_url ? (
                  <Image
                    source={{ uri: announcement.author.avatar_url }}
                    style={s.emblemImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={[s.announceAuthorInitial, { color: avatarFg }]}>{initial}</Text>
                )}
              </View>
              <Text style={s.announceMeta}>
                {author} · {dateStr}
              </Text>
            </View>
            {isMine && (
              <Pressable onPress={handleDelete} hitSlop={8}>
                {({ pressed }) => (
                  <View style={[s.announceDeleteBtn, pressed && s.btnPressed]}>
                    <Feather name="trash-2" size={13} color={c.text.muted} />
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

function AnnouncementComposer({
  visible,
  crewId,
  canPin,
  onClose,
}: {
  visible: boolean;
  crewId: string;
  canPin: boolean;
  onClose: () => void;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const create = useCreateAnnouncement();

  React.useEffect(() => {
    if (!visible) {
      setTitle('');
      setBody('');
      setPinned(false);
    }
  }, [visible]);

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !create.isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      await create.mutateAsync({ crewId, title, body, pinned: canPin ? pinned : false });
      onClose();
    } catch (e) {
      customAlert('실패', e instanceof Error ? e.message : '오류');
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      variant="full"
      title="공지 작성"
      footer={
        <Pressable onPress={handleSubmit} disabled={!canSubmit}>
          {({ pressed }) => (
            <View
              style={[
                s.confirmBtn,
                !canSubmit && s.confirmBtnDisabled,
                pressed && s.btnPressed,
              ]}
            >
              {create.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={[s.confirmBtnText, !canSubmit && s.confirmBtnTextDisabled]}>
                  공지 올리기
                </Text>
              )}
            </View>
          )}
        </Pressable>
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.composerInputWrap}>
          <Text style={s.composerLabel}>제목</Text>
          <TextInput
            style={s.composerInput}
            value={title}
            onChangeText={setTitle}
            placeholder="공지 제목"
            placeholderTextColor={c.text.muted}
            maxLength={80}
          />
        </View>

        <View style={s.composerInputWrap}>
          <Text style={s.composerLabel}>내용</Text>
          <TextInput
            style={[s.composerInput, s.composerTextArea]}
            value={body}
            onChangeText={setBody}
            placeholder="크루원에게 알릴 중요한 내용을 적어주세요"
            placeholderTextColor={c.text.muted}
            multiline
            textAlignVertical="top"
            maxLength={2000}
          />
        </View>

        {canPin && (
          <Pressable onPress={() => setPinned((v) => !v)} style={s.pinToggleBtn}>
            {({ pressed }) => (
              <View style={[s.checkboxContainer, pressed && s.btnPressed]}>
                <View style={[s.checkbox, pinned && s.checkboxActive]}>
                  {pinned && <Feather name="check" size={12} color="#ffffff" />}
                </View>
                <Text style={s.checkboxLabel}>이 공지를 상단에 고정하기</Text>
              </View>
            )}
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </Sheet>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: c.bg.card, // Trendy light slate bg
  },
  safeCenter: {
    flex: 1,
    backgroundColor: c.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border.subtle,
    backgroundColor: c.bg.card,
  },
  headerTitle: {
    color: c.text.primary,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg.card,
  },
  btnPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.96 }],
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  errorText: {
    color: c.status.danger,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  backBtn: {
    borderWidth: 1,
    borderColor: c.border.strong,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: c.bg.card,
  },
  backBtnText: {
    color: c.text.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    marginHorizontal: -20,
    backgroundColor: c.bg.card,
  },
  profileAvatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg.card,
    padding: 2,
  },
  profileAvatarInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '900',
  },
  emblemImage: {
    width: '100%',
    height: '100%',
  },
  profileHeaderInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileTitleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    color: c.text.primary,
    fontSize: 20,
    fontWeight: '900',
    flex: 1,
    letterSpacing: -0.5,
  },
  headerKeyBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg.accent,
    borderWidth: 1,
    borderColor: c.brand.primary + '33',
  },
  profileSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  profileMemberCount: {
    fontSize: 13,
    color: c.text.tertiary,
    fontWeight: '700',
  },
  publicPreview: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  publicBadgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  recruitingBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.status.successBg,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recruitingBadgePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: c.status.success,
  },
  publicCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.brand.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  publicCtaText: {
    color: c.brand.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  publicAlreadyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.bg.subtle,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  publicAlreadyText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text.secondary,
  },
  publicMessageInput: {
    backgroundColor: c.bg.subtle,
    borderRadius: 12,
    padding: 14,
    color: c.text.primary,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  regionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bg.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  regionChipText: {
    fontSize: 11,
    color: c.brand.primary,
    fontWeight: '800',
  },
  recruitingBadge: {
    backgroundColor: c.status.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recruitingBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  profileDescriptionBox: {
    backgroundColor: c.bg.card,
    paddingBottom: 16,
    paddingHorizontal: 20,
    marginHorizontal: -20,
  },
  profileDescriptionText: {
    color: c.text.primary,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  profileGymText: {
    color: c.text.tertiary,
    fontSize: 12,
    fontWeight: '700',
  },

  /* Tab Bar Styles */
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: c.bg.card,
    borderBottomWidth: 1,
    borderBottomColor: c.border.subtle,
    marginHorizontal: -20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.text.muted,
  },
  tabTextActive: {
    color: c.text.primary,
    fontWeight: '800',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 3,
    backgroundColor: '#06b6d4',
    borderRadius: 2,
  },
  tabContentArea: {
    flex: 1,
    paddingTop: 16,
  },
  tabPane: {
    flex: 1,
  },
  inviteContainer: {
    marginHorizontal: 16,
    marginBottom: 26,
  },
  inviteToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: c.bg.accent,
    borderWidth: 1,
    borderColor: c.brand.primary + '33',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  inviteToggleBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: c.brand.primaryDeep,
  },
  inviteCard: {
    backgroundColor: c.bg.card,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: c.shadow.color,
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    borderWidth: 1,
  },
  inviteBgDeco: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  inviteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteCardLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  inviteCardSublabel: {
    color: c.text.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  inviteDivider: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: c.border.subtle,
    marginVertical: 12,
  },
  inviteCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.bg.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inviteCodeText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 6,
  },
  copyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#06b6d4',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#06b6d4',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  copyBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  sectionGap: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: c.text.primary,
    letterSpacing: -0.5,
  },
  sectionTitleCount: {
    color: c.brand.primary,
    fontSize: 14,
    marginLeft: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  actionBtnCyan: {
    backgroundColor: c.bg.accent,
    borderWidth: 1,
    borderColor: c.brand.primary + '33',
  },
  actionBtnAmber: {
    backgroundColor: c.status.warningBg,
    borderWidth: 1,
    borderColor: c.status.warning + '33',
  },
  actionBtnTextCyan: {
    color: c.brand.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  actionBtnTextAmber: {
    color: c.status.warning,
    fontSize: 11,
    fontWeight: '900',
  },
  memberListCard: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: c.shadow.color,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: c.bg.card,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.border.subtle,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '900',
    color: c.text.secondary,
  },
  memberAvatarImg: {
    width: '100%',
    height: '100%',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '800',
    color: c.text.primary,
  },
  memberSubtext: {
    fontSize: 12,
    color: c.text.tertiary,
    fontWeight: '600',
  },
  reqAcceptBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqRejectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.status.dangerBg,
    borderWidth: 1,
    borderColor: c.status.danger + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberNameText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: c.text.primary,
  },
  memberMeTag: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text.tertiary,
    backgroundColor: c.bg.subtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  memberOwnerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: c.status.warningBg,
    borderWidth: 1,
    borderColor: c.status.warning + '33',
  },
  memberOwnerText: {
    fontSize: 10,
    fontWeight: '800',
    color: c.status.warning,
  },
  kickBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.status.dangerBg,
    borderWidth: 1,
    borderColor: c.status.danger + '33',
  },
  loaderBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorBox: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: c.status.dangerBg,
    borderWidth: 1,
    borderColor: c.status.danger + '33',
  },
  errorBoxText: {
    color: c.status.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  cardListGap: {
    gap: 10,
  },
  pastLabelText: {
    fontSize: 11,
    fontWeight: '800',
    color: c.text.tertiary,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  rowCenterGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowCenterSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  battleCard: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    shadowColor: c.shadow.color,
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  battleCardPast: {
    // 배경은 그대로 유지 (가독성). '종료' 뱃지 + 결과 칩으로 충분히 구분됨.
    borderColor: c.border.subtle,
  },
  battleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  battleStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  battleStatusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  battleTypeText: {
    color: c.text.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  battleTitleText: {
    fontSize: 15,
    fontWeight: '900',
    color: c.text.primary,
    letterSpacing: -0.3,
    lineHeight: 20,
  },

  // 결과 칩 (헤더 우측)
  outcomeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    marginRight: 4,
  },
  outcomeChipLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  chipBgWin: { backgroundColor: '#dcfce7' },
  chipBgLose: { backgroundColor: '#fee2e2' },
  chipBgDraw: { backgroundColor: '#fef3c7' },
  chipBgRank: { backgroundColor: c.bg.accent },

  // 결과 점수 라인 (제목 아래 한 줄, 승패만)
  outcomeScoreLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  outcomeScoreName: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: c.text.secondary,
    letterSpacing: -0.2,
  },
  outcomeScoreVal: {
    fontSize: 13,
    fontWeight: '900',
    color: c.text.primary,
  },
  outcomeScoreValMuted: {
    fontSize: 13,
    fontWeight: '800',
    color: c.text.tertiary,
  },
  outcomeScoreVs: {
    fontSize: 10,
    fontWeight: '800',
    color: c.text.muted,
    letterSpacing: 0.5,
  },
  battleVSContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.bg.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  battleVSTag: {
    color: c.brand.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  battleOpponentText: {
    color: c.text.secondary,
    fontSize: 11,
    fontWeight: '700',
  },
  battleDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  battleDateText: {
    color: c.text.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  myResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border.subtle,
  },
  myResultLabel: {
    fontSize: 10.5,
    fontWeight: '900',
    color: c.text.tertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  myResultCount: {
    fontSize: 12,
    fontWeight: '900',
    color: c.brand.primaryDeep,
    letterSpacing: -0.2,
  },
  myResultColorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: c.bg.subtle,
  },
  myResultDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
  },
  myResultColorCount: {
    fontSize: 10.5,
    fontWeight: '800',
    color: c.text.secondary,
  },
  myResultMore: {
    fontSize: 10.5,
    fontWeight: '700',
    color: c.text.muted,
  },
  battleEmptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    shadowColor: c.shadow.color,
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  battleEmptyText: {
    color: c.text.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  meetupCard: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    padding: 16,
    gap: 8,
    borderLeftWidth: 5,
    shadowColor: c.shadow.color,
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  meetupCardActive: {
    borderLeftColor: c.status.warning,
  },
  meetupCardPast: {
    borderLeftColor: c.border.strong,
    opacity: 0.65,
  },
  meetupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meetupTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.2,
  },
  meetupMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meetupMetaText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text.secondary,
  },
  meetupFullBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
    backgroundColor: c.status.dangerBg,
    borderWidth: 1,
    borderColor: c.status.danger + '33',
  },
  meetupFullText: {
    fontSize: 9,
    fontWeight: '800',
    color: c.status.danger,
  },
  feedCard: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: c.shadow.color,
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedAuthorAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  feedAuthorAvatarText: {
    fontSize: 10,
    fontWeight: '900',
  },
  feedAuthorName: {
    fontSize: 12,
    fontWeight: '800',
    color: c.text.primary,
  },
  feedContent: {
    gap: 5,
  },
  feedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: c.text.primary,
  },
  feedBody: {
    fontSize: 12,
    lineHeight: 18,
    color: c.text.secondary,
  },
  feedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  feedActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.bg.primary,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  feedActionLiked: {
    backgroundColor: c.status.dangerBg,
    borderColor: c.status.danger + '22',
  },
  feedActionText: {
    fontSize: 10,
    fontWeight: '900',
    color: c.text.tertiary,
  },
  feedActionTextLiked: {
    color: c.status.danger,
  },
  leaveBtn: {
    backgroundColor: c.status.dangerBg,
    borderWidth: 1,
    borderColor: c.status.danger + '33',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginHorizontal: 16,
  },
  leaveBtnText: {
    color: c.status.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  transferBtn: {
    backgroundColor: c.bg.accent,
    borderWidth: 1,
    borderColor: c.brand.primary + '33',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginHorizontal: 16,
  },
  transferBtnText: {
    color: c.brand.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border.subtle,
    backgroundColor: c.bg.card,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: c.text.primary,
  },
  modalScrollContent: {
    padding: 20,
    gap: 16,
  },
  modalHelpText: {
    fontSize: 13,
    color: c.text.tertiary,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  candidateListContainer: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: c.shadow.color,
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: c.bg.card,
  },
  candidateRowActive: {
    backgroundColor: c.bg.accent,
  },
  candidateRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: c.border.subtle,
  },
  candidateAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  candidateAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: c.text.tertiary,
  },
  candidateNameText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: c.text.primary,
  },
  candidateRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: c.border.strong,
    backgroundColor: c.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candidateRadioActive: {
    borderColor: '#06b6d4',
    backgroundColor: '#06b6d4',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: c.border.strong,
    backgroundColor: c.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: '#06b6d4',
    backgroundColor: '#06b6d4',
  },
  checkboxLabel: {
    color: c.text.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: c.border.subtle,
    backgroundColor: c.bg.card,
  },
  confirmBtn: {
    backgroundColor: c.brand.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: c.border.strong,
  },
  confirmBtnText: {
    color: c.text.inverse,
    fontSize: 14,
    fontWeight: '800',
  },
  // 최근 공지 한 줄
  latestNoticeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.bg.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border.subtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 18,
  },
  latestNoticeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: c.brand.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  latestNoticeText: {
    flex: 1,
    color: c.text.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  // 활동 멤버 스트립
  activeMembersScroll: {
    paddingRight: 4,
    gap: 14,
  },
  activeMembersMore: {
    alignItems: 'center',
    gap: 6,
    width: 56,
  },
  activeMembersMoreCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: c.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeMemberAvatarContainer: {
    position: 'relative',
    width: 56,
    height: 56,
  },
  activeMemberAvatarOwnerRing: {
    borderRadius: 999,
    padding: 2,
    backgroundColor: c.brand.primary,
  },
  activeMemberOwnerBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: c.bg.card,
  },
  activeMemberOwnerBadgeText: {
    color: c.brand.onPrimary,
    fontSize: 9,
    fontWeight: '900',
  },
  activeMemberName: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text.secondary,
    textAlign: 'center',
    maxWidth: 60,
  },

  // Crew stats strip
  statsStripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bg.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border.subtle,
    padding: 16,
    marginBottom: 24,
    shadowColor: c.shadow.color,
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  statsStripItem: { flex: 1, alignItems: 'center', gap: 4 },
  statsStripValue: { fontSize: 22, fontWeight: '900', color: c.text.primary },
  statsStripUnit: { fontSize: 14, fontWeight: '700', color: c.text.tertiary },
  statsStripLabel: { fontSize: 11, fontWeight: '700', color: c.text.muted },
  statsStripDivider: {
    width: 1,
    height: 36,
    backgroundColor: c.border.subtle,
  },

  // Grade distribution chart
  gradeChartCard: {
    backgroundColor: c.bg.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border.subtle,
    padding: 16,
    paddingBottom: 12,
  },
  gradeChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 140,
  },
  gradeBarCol: { flex: 1, alignItems: 'center', gap: 4 },
  gradeBarCount: { fontSize: 10, fontWeight: '800', color: c.text.tertiary },
  gradeBarTrack: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
  },
  gradeBarFill: {
    width: '100%',
    backgroundColor: '#94a3b8',
    borderRadius: 4,
    minHeight: 4,
  },
  gradeBarFillMe: { backgroundColor: '#06b6d4' },
  gradeBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: c.text.tertiary,
  },
  gradeBarLabelMe: { color: c.brand.primary, fontWeight: '900' },
  gradeMyMarker: {
    backgroundColor: '#06b6d4',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    position: 'absolute',
    bottom: -14,
  },
  gradeMyMarkerText: { fontSize: 8, fontWeight: '800', color: '#ffffff' },

  announceCard: {
    backgroundColor: c.bg.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.border.subtle,
    shadowColor: c.shadow.color,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  announceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  inviteModalHeaderCloseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inviteModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: c.text.primary,
  },
  inviteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inviteModalContentWrapper: {
    backgroundColor: c.bg.card,
    borderRadius: 28,
    padding: 24,
    width: '100%',
    shadowColor: c.shadow.color,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  pinBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  announceTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: c.text.primary,
  },
  announceBody: {
    fontSize: 13,
    color: c.text.secondary,
    lineHeight: 19,
  },
  announceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  announceAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  announceAuthorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  announceAuthorInitial: {
    fontSize: 10,
    fontWeight: '700',
  },
  announceMeta: {
    fontSize: 11,
    color: c.text.muted,
    fontWeight: '500',
  },
  announceDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg.subtle,
  },
  composerInputWrap: {
    marginBottom: 20,
  },
  composerLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: c.text.primary,
    marginBottom: 8,
    marginLeft: 4,
  },
  composerInput: {
    backgroundColor: c.bg.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border.subtle,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: c.text.primary,
    shadowColor: c.shadow.color,
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  composerTextArea: {
    minHeight: 200,
    paddingTop: 16,
  },
  pinToggleBtn: {
    marginTop: 8,
    backgroundColor: c.bg.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: c.border.subtle,
    shadowColor: c.shadow.color,
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  confirmBtnTextDisabled: {
    color: '#94a3b8',
  },
  });
}