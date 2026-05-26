import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

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
import { effectiveStatus, useBattles, type Battle } from '@/hooks/use-battles';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session: authSession } = useAuth();
  const meId = authSession?.user.id;
  const { data, isLoading, error } = useCrewDetail(id);
  const leaveCrew = useLeaveCrew();
  const deleteCrew = useDeleteCrew();
  const [transferOpen, setTransferOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  if (isLoading) {
    return (
      <SafeAreaView style={s.safeCenter} edges={['top']}>
        <ActivityIndicator color="#06b6d4" size="large" />
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

  function handleCopyCode() {
    if (!data) return;
    Alert.alert('초대코드', data.invite_code, [{ text: '확인' }]);
  }

  function handleLeave() {
    if (!data) return;
    Alert.alert('크루를 나갈까요?', '다시 들어오려면 초대코드가 필요해요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveCrew.mutateAsync(data.id);
            router.replace('/(tabs)/profile');
          } catch (e) {
            Alert.alert('실패', e instanceof Error ? e.message : '알 수 없는 오류');
          }
        },
      },
    ]);
  }

  function handleDelete() {
    if (!data) return;
    Alert.alert('크루를 삭제할까요?', '모든 멤버가 빠지고 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCrew.mutateAsync(data.id);
            router.replace('/(tabs)/profile');
          } catch (e) {
            Alert.alert('실패', e instanceof Error ? e.message : '알 수 없는 오류');
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
      options.push({ text: '크루 삭제', style: 'destructive', onPress: handleDelete });
    }
    options.push({ text: '취소', style: 'cancel' });
    Alert.alert('크루 관리', undefined, options);
  }

  const colors = getCrewAvatarColors(data.name);
  const firstChar = data.name.length > 0 ? data.name.charAt(0).toUpperCase() : '?';

  return (
    <SafeAreaView style={s.safeContainer} edges={['top']}>
      {/* Header */}
      <View style={s.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          {({ pressed }) => (
            <View style={[s.headerIconBtn, pressed && s.btnPressed]}>
              <Feather name="arrow-left" size={22} color="#0f172a" />
            </View>
          )}
        </Pressable>
        <Text style={s.headerTitle}>크루 정보</Text>
        {isMember ? (
          <Pressable onPress={handleOpenMenu} hitSlop={8}>
            {({ pressed }) => (
              <View style={[s.headerIconBtn, pressed && s.btnPressed]}>
                <Feather name="more-vertical" size={20} color="#0f172a" />
              </View>
            )}
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Area */}
        <View style={s.heroContainer}>
          <View style={[s.emblemRing, { borderColor: colors.border }]}>
            <View style={[s.emblemInner, { backgroundColor: colors.bg }]}>
              {data.image_url ? (
                <Image source={{ uri: data.image_url }} style={s.emblemImage} resizeMode="cover" />
              ) : (
                <Text style={[s.emblemText, { color: colors.text }]}>
                  {firstChar}
                </Text>
              )}
            </View>
          </View>
          
          <Text style={s.heroName} numberOfLines={2}>
            {data.name}
          </Text>

          {data.home_gym && (
            <View style={s.gymPill}>
              <Feather name="map-pin" size={10} color="#1d4ed8" />
              <Text style={s.gymPillText}>
                {data.home_gym.name}
                {data.home_gym.branch ? ` ${data.home_gym.branch}` : ''}
              </Text>
            </View>
          )}
          
          {data.description && (
            <View style={s.descriptionBox}>
              <Text style={s.descriptionText}>
                "{data.description}"
              </Text>
            </View>
          )}
        </View>

        {/* Invitation key pass (Members only) */}
        {isMember && (
          <View style={s.inviteCard}>
            {/* Ambient Background decoration */}
            <View style={s.inviteBgDeco} />
            <View style={s.inviteCardHeader}>
              <Text style={s.inviteCardLabel}>MEMBERSHIP KEY</Text>
              <Text style={s.inviteCardSublabel}>초대코드를 탭하여 공유해보세요</Text>
            </View>
            <View style={s.inviteDivider} />
            <Pressable onPress={handleCopyCode}>
              {({ pressed }) => (
                <View style={[s.inviteCodeBox, pressed && s.btnPressed]}>
                  <Text style={s.inviteCodeText}>
                    {data.invite_code}
                  </Text>
                  <View style={s.copyBadge}>
                    <Feather name="copy" size={12} color="#ffffff" />
                    <Text style={s.copyBadgeText}>복사</Text>
                  </View>
                </View>
              )}
            </Pressable>
          </View>
        )}

        {/* Announcements */}
        {isMember && (
          <AnnouncementsSection
            crewId={data.id}
            meId={meId}
            onCompose={() => setComposerOpen(true)}
          />
        )}

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

        {/* Crew Battles */}
        {isMember && <CrewBattlesSection crewId={data.id} />}

        {/* Crew Gatherings */}
        {isMember && <CrewMeetupsSection crewId={data.id} />}

        {/* Crew Feed */}
        {isMember && <CrewFeedSection crewId={data.id} />}

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
                Alert.alert(
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
    Alert.alert(
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
              Alert.alert('실패', e instanceof Error ? e.message : '오류');
            }
          },
        },
      ],
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safeContainer} edges={['top']}>
        {/* Modal Header */}
        <View style={s.modalHeader}>
          <Pressable onPress={onClose} hitSlop={8}>
            {({ pressed }) => (
              <View style={[s.headerIconBtn, pressed && s.btnPressed]}>
                <Feather name="x" size={22} color="#0f172a" />
              </View>
            )}
          </Pressable>
          <Text style={s.modalHeaderTitle}>크루장 위임</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.modalScrollContent}>
          <Text style={s.modalHelpText}>
            다음 크루장이 될 멤버를 선택하세요.
          </Text>

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
                      pressed && s.btnPressed
                    ]}>
                      <View style={[s.candidateAvatar, { backgroundColor: '#f1f5f9' }]}>
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
                        active && s.candidateRadioActive
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
        </ScrollView>

        <View style={s.modalFooter}>
          <Pressable
            onPress={handleConfirm}
            disabled={!selected || transfer.isPending}
          >
            {({ pressed }) => (
              <View style={[
                s.confirmBtn,
                !selected && s.confirmBtnDisabled,
                pressed && s.btnPressed
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
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function CrewBattlesSection({ crewId }: { crewId: string }) {
  const router = useRouter();
  const { data, isLoading, error } = useBattles(crewId);

  const partitioned = React.useMemo(() => {
    if (!data) return { active: [] as Battle[], ended: [] as Battle[], pending: [] as Battle[] };
    const active: Battle[] = [];
    const ended: Battle[] = [];
    const pending: Battle[] = [];
    for (const b of data) {
      const st = effectiveStatus(b);
      if (st === 'pending') pending.push(b);
      else if (st === 'ended' || st === 'declined') ended.push(b);
      else active.push(b);
    }
    return { active, ended, pending };
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
          <ActivityIndicator color="#06b6d4" />
        </View>
      )}
      {error && (
        <View style={s.errorBox}>
          <Text style={s.errorBoxText}>{error.message}</Text>
        </View>
      )}

      {data && data.length === 0 && (
        <View style={s.battleEmptyCard}>
          <Feather name="zap" size={20} color="#94a3b8" />
          <Text style={s.battleEmptyText}>아직 대결이 없어요</Text>
        </View>
      )}

      {partitioned.pending.length > 0 && (
        <View style={s.cardListGap}>
          {partitioned.pending.map((b) => <BattleCard key={b.id} battle={b} crewId={crewId} />)}
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
  const router = useRouter();
  const status = effectiveStatus(battle);
  const isCrewVs = battle.battle_type === 'crew_vs_crew';
  const isHome = battle.crew_id === crewId;
  const opponent = isHome ? battle.opponent_crew : battle.crew;

  const statusMeta = {
    pending: { bg: '#fff7ed', fg: '#c2410c', label: '수락 대기' },
    active: { bg: '#ecfeff', fg: '#0e7490', label: '진행 중' },
    ended: { bg: '#f1f5f9', fg: '#64748b', label: '종료' },
    declined: { bg: '#fef2f2', fg: '#b91c1c', label: '거절됨' },
  }[status] ?? { bg: '#f1f5f9', fg: '#64748b', label: status };

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/battle/[id]', params: { id: battle.id } } as never)
      }
    >
      {({ pressed }) => (
        <View style={[
          s.battleCard,
          past && { opacity: 0.65 },
          pressed && s.cardPressed
        ]}>
          <View style={s.battleCardHeader}>
            <View style={s.rowCenterGap}>
              <View style={[s.battleStatusTag, { backgroundColor: statusMeta.bg }]}>
                <Text style={[s.battleStatusText, { color: statusMeta.fg }]}>
                  {statusMeta.label}
                </Text>
              </View>
              <Text style={s.battleTypeText}>
                {isCrewVs ? '크루전' : '개인전'}
              </Text>
            </View>
            <Feather name="chevron-right" size={15} color="#cbd5e1" />
          </View>
          
          <Text style={s.battleTitleText} numberOfLines={1}>
            {battle.title}
          </Text>
          
          {isCrewVs && opponent && (
            <View style={s.battleVSContainer}>
              <Text style={s.battleVSTag}>VS</Text>
              <Text style={s.battleOpponentText} numberOfLines={1}>
                {opponent.name}
              </Text>
            </View>
          )}
          
          <View style={s.battleDateRow}>
            <Feather name="calendar" size={10} color="#94a3b8" />
            <Text style={s.battleDateText}>
              {battle.starts_at.slice(5, 10).replace('-', '.')} ~ {battle.ends_at.slice(5, 10).replace('-', '.')}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
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
        <View style={s.battleEmptyCard}>
          <Feather name="calendar" size={20} color="#94a3b8" />
          <Text style={s.battleEmptyText}>예정된 모임이 없어요</Text>
        </View>
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
            <Feather name="chevron-right" size={15} color="#cbd5e1" />
          </View>
          
          <View style={s.meetupMetaRow}>
            <Feather name="clock" size={11} color="#64748b" />
            <Text style={s.meetupMetaText}>
              {meetup.meetup_at ? formatMeetupShort(meetup.meetup_at) : '날짜 미정'}
            </Text>
          </View>
          
          {location && (
            <View style={s.meetupMetaRow}>
              <Feather name="map-pin" size={11} color="#64748b" />
              <Text style={s.meetupMetaText} numberOfLines={1}>
                {location}
              </Text>
            </View>
          )}
          
          <View style={[s.rowCenterSpace, { marginTop: 2 }]}>
            <View style={s.rowCenterGap}>
              <Feather name="users" size={11} color="#64748b" />
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
          <ActivityIndicator color="#06b6d4" />
        </View>
      )}

      {feed.error && (
        <View style={s.errorBox}>
          <Text style={s.errorBoxText}>{feed.error.message}</Text>
        </View>
      )}

      {!feed.isLoading && posts.length === 0 && (
        <View style={s.battleEmptyCard}>
          <Feather name="message-square" size={20} color="#94a3b8" />
          <Text style={s.battleEmptyText}>크루 첫 글을 남겨보세요</Text>
        </View>
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
            <Feather name="chevron-right" size={15} color="#cbd5e1" />
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
                  <Feather name="heart" size={11} color={liked ? '#ef4444' : '#94a3b8'} />
                  <Text style={[s.feedActionText, liked && s.feedActionTextLiked]}>
                    {post.like_count}
                  </Text>
                </View>
              )}
            </Pressable>
            
            <View style={s.feedActionPill}>
              <Feather name="message-circle" size={11} color="#94a3b8" />
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
  const kick = useKickMember();
  const name = member.user?.display_name || member.user?.username || '익명';
  const avatarBg = getAvatarBg(name);
  const avatarFg = getAvatarFg(name);
  const avatarUrl = member.user?.avatar_url;
  const showKick = isOwnerView && !isMe && member.role !== 'owner';

  function handleKick() {
    Alert.alert(
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
              { onError: (e) => Alert.alert('실패', e instanceof Error ? e.message : '오류') },
            ),
        },
      ],
    );
  }

  return (
    <View style={[s.memberRow, !isLast && s.memberRowBorder]}>
      <View style={[s.memberAvatar, { backgroundColor: avatarBg }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={s.emblemImage} resizeMode="cover" />
        ) : (
          <Text style={[s.memberAvatarText, { color: avatarFg }]}>
            {(name[0] ?? '?').toUpperCase()}
          </Text>
        )}
      </View>
      <Text style={s.memberNameText} numberOfLines={1}>
        {name}
        {isMe && <Text style={s.memberMeTag}> (나)</Text>}
      </Text>
      {member.role === 'owner' && (
        <View style={s.memberOwnerBadge}>
          <Text style={s.memberOwnerText}>크루장</Text>
        </View>
      )}
      {showKick && (
        <Pressable onPress={handleKick} hitSlop={6}>
          {({ pressed }) => (
            <View style={[s.kickBtn, pressed && s.btnPressed]}>
              <Feather name="user-x" size={15} color="#ef4444" />
            </View>
          )}
        </Pressable>
      )}
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
          <ActivityIndicator color="#06b6d4" />
        </View>
      )}

      {error && (
        <View style={s.errorBox}>
          <Text style={s.errorBoxText}>{error.message}</Text>
        </View>
      )}

      {!isLoading && items.length === 0 && (
        <View style={s.battleEmptyCard}>
          <Feather name="volume-2" size={20} color="#94a3b8" />
          <Text style={s.battleEmptyText}>아직 공지가 없어요</Text>
        </View>
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
    Alert.alert('공지를 삭제할까요?', '되돌릴 수 없어요.', [
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
                    <Feather name="trash-2" size={13} color="#94a3b8" />
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
      Alert.alert('실패', e instanceof Error ? e.message : '오류');
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safeContainer} edges={['top']}>
        <View style={s.modalHeader}>
          <Pressable onPress={onClose} hitSlop={8}>
            {({ pressed }) => (
              <View style={[s.headerIconBtn, pressed && s.btnPressed]}>
                <Feather name="x" size={22} color="#0f172a" />
              </View>
            )}
          </Pressable>
          <Text style={s.modalHeaderTitle}>공지 작성</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.modalScrollContent} keyboardShouldPersistTaps="handled">
          <Text style={s.composerLabel}>제목</Text>
          <TextInput
            style={s.composerInput}
            value={title}
            onChangeText={setTitle}
            placeholder="공지 제목"
            placeholderTextColor="#94a3b8"
            maxLength={80}
          />

          <Text style={[s.composerLabel, { marginTop: 16 }]}>내용</Text>
          <TextInput
            style={[s.composerInput, s.composerTextArea]}
            value={body}
            onChangeText={setBody}
            placeholder="크루원에게 알릴 내용"
            placeholderTextColor="#94a3b8"
            multiline
            textAlignVertical="top"
            maxLength={2000}
          />

          {canPin && (
            <Pressable onPress={() => setPinned((v) => !v)} style={{ marginTop: 16 }}>
              {({ pressed }) => (
                <View style={[s.checkboxContainer, pressed && s.btnPressed]}>
                  <View style={[s.checkbox, pinned && s.checkboxActive]}>
                    {pinned && <Feather name="check" size={11} color="#ffffff" />}
                  </View>
                  <Text style={s.checkboxLabel}>상단 고정</Text>
                </View>
              )}
            </Pressable>
          )}
        </ScrollView>

        <View style={s.modalFooter}>
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
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f8fafc', // Trendy light slate bg
  },
  safeCenter: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    color: '#0f172a',
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
    backgroundColor: '#ffffff',
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
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  backBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  backBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  heroContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  emblemRing: {
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    padding: 3,
  },
  emblemInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emblemImage: {
    width: '100%',
    height: '100%',
  },
  emblemText: {
    fontSize: 34,
    fontWeight: '900',
  },
  heroName: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  gymPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
  },
  gymPillText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '800',
  },
  descriptionBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 16,
    maxWidth: '90%',
    shadowColor: '#0f172a',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  descriptionText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    fontWeight: '600',
    textAlign: 'center',
  },
  inviteCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
    marginBottom: 26,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  inviteBgDeco: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(6, 182, 212, 0.07)',
  },
  inviteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteCardLabel: {
    color: '#22d3ee',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  inviteCardSublabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  inviteDivider: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: '#334155',
    marginVertical: 12,
  },
  inviteCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(9, 13, 22, 0.4)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inviteCodeText: {
    color: '#ffffff',
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
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  sectionTitleCount: {
    color: '#06b6d4',
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
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#cffafe',
  },
  actionBtnAmber: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  actionBtnTextCyan: {
    color: '#0891b2',
    fontSize: 11,
    fontWeight: '900',
  },
  actionBtnTextAmber: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '900',
  },
  memberListCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarText: {
    fontSize: 12,
    fontWeight: '900',
  },
  memberNameText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  memberMeTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  memberOwnerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  memberOwnerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
  },
  kickBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  loaderBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorBox: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  errorBoxText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  cardListGap: {
    gap: 10,
  },
  pastLabelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    padding: 16,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
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
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
  battleTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  battleVSContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  battleVSTag: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: '900',
  },
  battleOpponentText: {
    color: '#475569',
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
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  battleEmptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  battleEmptyText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  meetupCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    padding: 16,
    gap: 8,
    borderLeftWidth: 5,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  meetupCardActive: {
    borderLeftColor: '#f59e0b',
  },
  meetupCardPast: {
    borderLeftColor: '#cbd5e1',
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
    color: '#0f172a',
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
    color: '#475569',
  },
  meetupFullBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  meetupFullText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ef4444',
  },
  feedCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: '#0f172a',
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
    color: '#0f172a',
  },
  feedContent: {
    gap: 5,
  },
  feedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  feedBody: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  feedActionLiked: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  feedActionText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
  },
  feedActionTextLiked: {
    color: '#ef4444',
  },
  leaveBtn: {
    borderWidth: 1,
    borderColor: '#fee2e2',
    backgroundColor: '#fff5f5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  leaveBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
  },
  transferBtn: {
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  transferBtnText: {
    color: '#d97706',
    fontSize: 13,
    fontWeight: '800',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalScrollContent: {
    padding: 20,
    gap: 16,
  },
  modalHelpText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  candidateListContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0f172a',
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
    backgroundColor: '#ffffff',
  },
  candidateRowActive: {
    backgroundColor: '#ecfeff',
  },
  candidateRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
    color: '#64748b',
  },
  candidateNameText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  candidateRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
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
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: '#06b6d4',
    backgroundColor: '#06b6d4',
  },
  checkboxLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  confirmBtn: {
    backgroundColor: '#06b6d4',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  announceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
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
    color: '#0f172a',
  },
  announceBody: {
    fontSize: 13,
    color: '#475569',
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
    color: '#94a3b8',
    fontWeight: '500',
  },
  announceDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  composerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  composerInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  composerTextArea: {
    minHeight: 160,
    paddingTop: 12,
  },
  confirmBtnTextDisabled: {
    color: '#94a3b8',
  },
});
