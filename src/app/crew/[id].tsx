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
  View,
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

export default function CrewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session: authSession } = useAuth();
  const meId = authSession?.user.id;
  const { data, isLoading, error } = useCrewDetail(id);
  const leaveCrew = useLeaveCrew();
  const deleteCrew = useDeleteCrew();
  const [transferOpen, setTransferOpen] = useState(false);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center" edges={['top']}>
        <ActivityIndicator color="#06b6d4" />
      </SafeAreaView>
    );
  }
  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center p-6" edges={['top']}>
        <Text className="text-status-danger text-sm font-semibold mb-3">
          {error?.message ?? '크루를 찾을 수 없어요'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="border border-border-default rounded-md px-4 py-2"
        >
          <Text className="text-text-primary">돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isOwner = data.my_role === 'owner';
  const isMember = data.my_role != null;

  function handleCopyCode() {
    if (!data) return;
    // expo-clipboard 미설치 — 일단 코드를 다이얼로그로 안내, 길게 눌러 복사.
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

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </Pressable>
        <Text className="text-text-primary text-base font-bold">크루</Text>
        {isOwner ? (
          <Pressable onPress={handleDelete} className="p-2 active:opacity-60" hitSlop={8}>
            <Feather name="trash-2" size={20} color="#ef4444" />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView contentContainerClassName="p-5 gap-6 pb-8">
        {/* Hero — 로고/이름/소개 */}
        <View className="items-center gap-3 pt-1">
          <View
            className="w-24 h-24 rounded-full bg-brand-primary/10 border-2 border-brand-primary items-center justify-center overflow-hidden"
            style={{
              shadowColor: '#06b6d4',
              shadowOpacity: 0.18,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
            }}
          >
            {data.image_url ? (
              <Image source={{ uri: data.image_url }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Feather name="users" size={32} color="#06b6d4" />
            )}
          </View>
          <Text className="text-text-primary text-xl font-extrabold" numberOfLines={2}>
            {data.name}
          </Text>
          {data.home_gym && (
            <View className="flex-row items-center gap-1.5">
              <Feather name="map-pin" size={12} color="#64748b" />
              <Text className="text-text-tertiary text-xs font-semibold">
                {data.home_gym.name}
                {data.home_gym.branch ? ` ${data.home_gym.branch}` : ''}
              </Text>
            </View>
          )}
          {data.description && (
            <Text className="text-text-secondary text-sm leading-5 text-center px-3">
              {data.description}
            </Text>
          )}
        </View>

        {/* 초대코드 (멤버에게만) */}
        {isMember && (
          <View className="bg-brand-primary/5 border border-brand-primary/15 rounded-2xl p-4 gap-2">
            <Text className="text-brand-primary text-xs font-bold">초대코드</Text>
            <Pressable
              onPress={handleCopyCode}
              className="flex-row items-center justify-between bg-white border border-border-subtle rounded-xl px-4 py-3 active:opacity-70"
            >
              <Text
                className="text-text-primary text-xl font-extrabold"
                style={{ letterSpacing: 6 }}
              >
                {data.invite_code}
              </Text>
              <View className="flex-row items-center gap-1.5">
                <Feather name="copy" size={14} color="#06b6d4" />
                <Text className="text-brand-primary text-xs font-bold">복사</Text>
              </View>
            </Pressable>
            <Text className="text-text-tertiary text-xs">
              친구에게 이 코드를 알려주면 크루에 가입할 수 있어요
            </Text>
          </View>
        )}

        {/* 멤버 목록 */}
        <View className="gap-3">
          <View className="flex-row items-baseline justify-between px-1">
            <Text className="text-text-primary text-base font-extrabold">
              멤버 <Text className="text-text-tertiary">{data.member_count}</Text>
            </Text>
          </View>
          <View className="bg-background-secondary border border-border-subtle rounded-2xl divide-y divide-border-subtle overflow-hidden">
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

        {/* 크루 대결 */}
        {isMember && <CrewBattlesSection crewId={data.id} />}

        {/* 크루 모임 */}
        {isMember && <CrewMeetupsSection crewId={data.id} />}

        {/* 크루 피드 */}
        {isMember && <CrewFeedSection crewId={data.id} />}

        {/* 탈퇴 (member) — owner 는 위임 후 탈퇴 */}
        {isMember && !isOwner && (
          <Pressable
            onPress={handleLeave}
            className="border border-status-danger/30 rounded-xl py-3.5 items-center active:opacity-70"
          >
            <Text className="text-status-danger text-sm font-bold">크루 나가기</Text>
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
            className="border border-amber-300 rounded-xl py-3.5 items-center active:opacity-70"
          >
            <Text className="text-amber-700 text-sm font-bold">
              크루장 위임 후 나가기
            </Text>
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
      <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
        <View className="flex-row items-center px-4 py-2 border-b border-border-subtle">
          <Pressable onPress={onClose} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
            <Feather name="x" size={22} color="#0f172a" />
          </Pressable>
          <Text className="flex-1 text-center text-text-primary text-base font-semibold mr-6">
            크루장 위임
          </Text>
        </View>

        <ScrollView contentContainerClassName="p-5 gap-4">
          <Text className="text-text-secondary text-sm">
            다음 크루장이 될 멤버를 선택하세요.
          </Text>

          <View className="bg-background-secondary border border-border-subtle rounded-2xl overflow-hidden">
            {candidates.map((m, i) => (
              <Pressable
                key={m.user_id}
                onPress={() => setSelected(m.user_id)}
              >
                {({ pressed }) => {
                  const active = selected === m.user_id;
                  const name = m.user?.display_name || m.user?.username || '익명';
                  return (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        backgroundColor: active ? '#ecfeff' : '#ffffff',
                        borderBottomWidth: i === candidates.length - 1 ? 0 : 1,
                        borderColor: '#f1f5f9',
                        opacity: pressed ? 0.85 : 1,
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: '#f1f5f9',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {m.user?.avatar_url ? (
                          <Image
                            source={{ uri: m.user.avatar_url }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b' }}>
                            {(name[0] ?? '?').toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>
                        {name}
                      </Text>
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor: active ? '#06b6d4' : '#cbd5e1',
                          backgroundColor: active ? '#06b6d4' : '#ffffff',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {active && <Feather name="check" size={12} color="#ffffff" />}
                      </View>
                    </View>
                  );
                }}
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => setAlsoLeave(!alsoLeave)}
            className="flex-row items-center gap-2 px-1 py-2 active:opacity-70"
          >
            <View
              className={`w-5 h-5 rounded border-[1.5px] items-center justify-center ${
                alsoLeave ? 'bg-brand-primary border-brand-primary' : 'bg-white border-border-default'
              }`}
            >
              {alsoLeave && <Feather name="check" size={11} color="#ffffff" />}
            </View>
            <Text className="text-text-primary text-sm font-semibold">
              위임 후 크루 나가기
            </Text>
          </Pressable>
        </ScrollView>

        <View className="px-5 pt-3 pb-5 border-t border-border-subtle">
          <Pressable
            onPress={handleConfirm}
            disabled={!selected || transfer.isPending}
            className={`rounded-xl py-4 items-center ${
              !selected ? 'bg-background-tertiary' : 'bg-brand-primary'
            }`}
          >
            {transfer.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`font-bold text-base ${
                  !selected ? 'text-text-muted' : 'text-background-primary'
                }`}
              >
                {alsoLeave ? '위임 + 나가기' : '위임'}
              </Text>
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
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between px-1">
        <Text className="text-text-primary text-base font-extrabold">크루 대결</Text>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/battle/new', params: { crewId } } as never)
          }
          hitSlop={6}
        >
          {({ pressed }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: '#06b6d4',
                opacity: pressed ? 0.85 : 1,
                shadowColor: '#06b6d4',
                shadowOpacity: 0.25,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              <Feather name="zap" size={12} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>
                대결 만들기
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {isLoading && (
        <View className="py-6 items-center">
          <ActivityIndicator color="#06b6d4" />
        </View>
      )}
      {error && (
        <View className="p-4 rounded-2xl bg-status-danger/10 border border-status-danger/20">
          <Text className="text-status-danger text-xs font-semibold">{error.message}</Text>
        </View>
      )}

      {data && data.length === 0 && (
        <View className="p-6 items-center gap-2 bg-background-secondary border border-border-subtle rounded-2xl">
          <Feather name="zap" size={20} color="#94a3b8" />
          <Text className="text-text-tertiary text-sm font-semibold">
            아직 대결이 없어요
          </Text>
        </View>
      )}

      {partitioned.pending.length > 0 && (
        <View className="gap-2">
          {partitioned.pending.map((b) => <BattleCard key={b.id} battle={b} crewId={crewId} />)}
        </View>
      )}
      {partitioned.active.length > 0 && (
        <View className="gap-2">
          {partitioned.active.map((b) => <BattleCard key={b.id} battle={b} crewId={crewId} />)}
        </View>
      )}
      {partitioned.ended.length > 0 && (
        <View className="gap-2 mt-2">
          <Text className="text-text-tertiary text-xs font-bold px-1">지난 대결</Text>
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
      style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
    >
      <View
        style={{
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: '#e2e8f0',
          borderRadius: 14,
          padding: 12,
          gap: 6,
          opacity: past ? 0.75 : 1,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
              backgroundColor: statusMeta.bg,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', color: statusMeta.fg }}>
              {statusMeta.label}
            </Text>
          </View>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8' }}>
            {isCrewVs ? '크루전' : '개인전'}
          </Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }} numberOfLines={1}>
          {battle.title}
        </Text>
        {isCrewVs && opponent && (
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }} numberOfLines={1}>
            VS {opponent.name}
          </Text>
        )}
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8' }}>
          {battle.starts_at.slice(0, 10)} ~ {battle.ends_at.slice(0, 10)}
        </Text>
      </View>
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
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between px-1">
        <Text className="text-text-primary text-base font-extrabold">
          크루 모임
        </Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/community/new',
              params: { crewId, type: 'meetup' },
            } as never)
          }
          hitSlop={6}
        >
          {({ pressed }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: '#d97706',
                opacity: pressed ? 0.85 : 1,
                shadowColor: '#d97706',
                shadowOpacity: 0.25,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              <Feather name="calendar" size={12} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>
                모임 만들기
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {isLoading && (
        <View className="py-6 items-center">
          <ActivityIndicator color="#d97706" />
        </View>
      )}

      {error && (
        <View className="p-4 rounded-2xl bg-status-danger/10 border border-status-danger/20">
          <Text className="text-status-danger text-xs font-semibold">
            {error.message}
          </Text>
        </View>
      )}

      {data && data.upcoming.length === 0 && data.past.length === 0 && (
        <View className="p-6 items-center gap-2 bg-background-secondary border border-border-subtle rounded-2xl">
          <Feather name="calendar" size={20} color="#94a3b8" />
          <Text className="text-text-tertiary text-sm font-semibold">
            예정된 모임이 없어요
          </Text>
        </View>
      )}

      {data && data.upcoming.length > 0 && (
        <View className="gap-2">
          {data.upcoming.map((m) => (
            <CrewMeetupCard key={m.id} meetup={m} />
          ))}
        </View>
      )}

      {data && data.past.length > 0 && (
        <View className="gap-2 mt-2">
          <Text className="text-text-tertiary text-xs font-bold px-1">
            지난 모임
          </Text>
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
      style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
    >
      <View
        style={{
          backgroundColor: past ? '#f8fafc' : '#fffbeb',
          borderWidth: 1,
          borderColor: past ? '#e2e8f0' : '#fde68a',
          borderRadius: 14,
          padding: 12,
          gap: 6,
          opacity: past ? 0.7 : 1,
        }}
      >
        {meetup.title && (
          <Text
            style={{
              fontSize: 13,
              fontWeight: '800',
              color: past ? '#64748b' : '#0f172a',
            }}
            numberOfLines={1}
          >
            {meetup.title}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Feather name="clock" size={12} color={past ? '#94a3b8' : '#b45309'} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: past ? '#94a3b8' : '#92400e',
            }}
          >
            {meetup.meetup_at ? formatMeetupShort(meetup.meetup_at) : '날짜 미정'}
          </Text>
        </View>
        {location && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Feather name="map-pin" size={12} color={past ? '#94a3b8' : '#b45309'} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: past ? '#94a3b8' : '#92400e',
              }}
              numberOfLines={1}
            >
              {location}
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Feather name="users" size={12} color={past ? '#94a3b8' : '#b45309'} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: past ? '#94a3b8' : '#92400e',
            }}
          >
            {cap != null
              ? `${meetup.participant_count} / ${cap}명`
              : `${meetup.participant_count}명 (정원 무제한)`}
          </Text>
          {full && !past && (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 6,
                backgroundColor: '#f1f5f9',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b' }}>
                마감
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function CrewFeedSection({ crewId }: { crewId: string }) {
  const router = useRouter();
  const feed = useCrewFeed(crewId);
  const { data: likedSet } = useMyLikes();
  const posts = feed.data?.pages.flat() ?? [];

  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between px-1">
        <Text className="text-text-primary text-base font-extrabold">
          크루 피드
        </Text>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/community/new', params: { crewId } } as never)
          }
          hitSlop={6}
        >
          {({ pressed }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: '#06b6d4',
                opacity: pressed ? 0.85 : 1,
                shadowColor: '#06b6d4',
                shadowOpacity: 0.25,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              <Feather name="edit-3" size={12} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>
                글쓰기
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {feed.isLoading && (
        <View className="py-6 items-center">
          <ActivityIndicator color="#06b6d4" />
        </View>
      )}

      {feed.error && (
        <View className="p-4 rounded-2xl bg-status-danger/10 border border-status-danger/20">
          <Text className="text-status-danger text-xs font-semibold">
            {feed.error.message}
          </Text>
        </View>
      )}

      {!feed.isLoading && posts.length === 0 && (
        <View className="p-6 items-center gap-2 bg-background-secondary border border-border-subtle rounded-2xl">
          <Feather name="message-square" size={20} color="#94a3b8" />
          <Text className="text-text-tertiary text-sm font-semibold">
            크루 첫 글을 남겨보세요
          </Text>
        </View>
      )}

      {posts.length > 0 && (
        <View className="gap-2">
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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}
    >
      <View
        style={{
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: '#e2e8f0',
          borderRadius: 16,
          padding: 14,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#e0f2fe',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {post.author?.avatar_url ? (
              <Image
                source={{ uri: post.author.avatar_url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#0369a1' }}>
                {initial}
              </Text>
            )}
          </View>
          <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#0f172a' }}>
            {author}
          </Text>
        </View>
        {post.title && (
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }} numberOfLines={1}>
            {post.title}
          </Text>
        )}
        <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18 }} numberOfLines={3}>
          {post.body}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 2 }}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (toggle.isPending) return;
              toggle.mutate({ postId: post.id, currentlyLiked: liked });
            }}
            hitSlop={6}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Feather name="heart" size={14} color={liked ? '#ef4444' : '#94a3b8'} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: liked ? '#ef4444' : '#64748b' }}>
                {post.like_count}
              </Text>
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Feather name="message-circle" size={14} color="#94a3b8" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>
              {post.comment_count}
            </Text>
          </View>
        </View>
      </View>
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
    <View
      className={`flex-row items-center gap-3 px-4 py-3 bg-white ${isLast ? '' : 'border-b border-border-subtle'}`}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center overflow-hidden"
        style={{ backgroundColor: avatarBg }}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Text style={{ color: avatarFg, fontSize: 14, fontWeight: '800' }}>
            {(name[0] ?? '?').toUpperCase()}
          </Text>
        )}
      </View>
      <Text className="flex-1 text-text-primary text-sm font-bold" numberOfLines={1}>
        {name}
        {isMe && <Text className="text-text-tertiary text-xs font-semibold">  (나)</Text>}
      </Text>
      {member.role === 'owner' && (
        <View className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
          <Text className="text-amber-700 text-[10px] font-extrabold">크루장</Text>
        </View>
      )}
      {showKick && (
        <Pressable
          onPress={handleKick}
          hitSlop={6}
          className="px-2 py-1 active:opacity-60"
        >
          <Feather name="user-x" size={16} color="#ef4444" />
        </Pressable>
      )}
    </View>
  );
}
