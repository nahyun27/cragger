import { customAlert } from '@/components/ui/custom-alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { FeaturedBadgeChip } from '@/components/ui/featured-badge-chip';
import { useAuth } from '@/lib/auth-context';
import { useThemeColors } from '@/lib/theme';
import {
  effectiveStatus,
  useAcceptBattle,
  useBattle,
  useBattleParticipants,
  useBattleRanking,
  useChangeBattleTeam,
  useDeclineBattle,
  useDeleteBattle,
  useEndBattle,
  useJoinBattle,
  useLeaveBattle,
  useStartBattle,
  type Battle,
  type BattleScoreEntry,
  type ScoringRules,
  type TeamSide,
  type TeamTotal,
} from '@/hooks/use-battles';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}.${m}.${day} (${days[d.getDay()]})`;
}

function describeRules(rules: ScoringRules): string {
  if (rules.type === 'linear') return `V × ${rules.base} (기본)`;
  if (rules.type === 'exp') return `V × ${rules.base}^V (지수형)`;
  return '직접 입력';
}

export default function BattleDetailScreen() {
  const c = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session: authSession } = useAuth();
  const meId = authSession?.user.id;
  const battleQ = useBattle(id);
  // 라이브 갱신 — 진행 중일 땐 5초 폴링
  const battle = battleQ.data;
  const status = battle ? effectiveStatus(battle) : null;
  const rankingQ = useBattleRanking(id, {
    refetchInterval: status === 'active' ? 5_000 : undefined,
  });
  const participantsQ = useBattleParticipants(id);
  const join = useJoinBattle();
  const leave = useLeaveBattle();
  const changeTeam = useChangeBattleTeam();
  const startBattle = useStartBattle();
  const endBattle = useEndBattle();
  const accept = useAcceptBattle();
  const decline = useDeclineBattle();
  const deleteBattle = useDeleteBattle();

  if (battleQ.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center" edges={['top']}>
        <ActivityIndicator color={c.brand.primary} />
      </SafeAreaView>
    );
  }
  if (battleQ.error || !battle || !status) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center p-6" edges={['top']}>
        <Text className="text-status-danger text-sm font-semibold mb-3">
          {battleQ.error?.message ?? '대결을 찾을 수 없어요'}
        </Text>
        <Pressable onPress={() => router.back()} className="border border-border-default rounded-md px-4 py-2">
          <Text className="text-text-primary">돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  const isCreator = battle.created_by === meId;
  const isCrewVs = battle.battle_type === 'crew_vs_crew';
  const isTeam = battle.battle_type === 'crew_internal_team';
  const isEnded = status === 'ended';
  const isScheduled = status === 'scheduled';
  const isDeclined = status === 'declined';
  const myParticipant = (participantsQ.data ?? []).find((p) => p.user_id === meId);
  const isMeJoined = !!myParticipant;
  const myTeam = myParticipant?.team ?? null;

  function handleDelete() {
    customAlert('대결을 삭제할까요?', '되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBattle.mutateAsync(battle!.id);
            router.back();
          } catch (e) {
            customAlert('실패', e instanceof Error ? e.message : '오류');
          }
        },
      },
    ]);
  }

  function handleJoinToggle() {
    if (!battle) return;
    if (isMeJoined) {
      leave.mutate(battle.id, {
        onError: (e) => customAlert('실패', e instanceof Error ? e.message : '오류'),
      });
    } else {
      // 팀전인데 팀 안 정해진 채로 참가하면 a로 기본
      join.mutate(
        { battleId: battle.id, team: isTeam ? 'a' : undefined },
        { onError: (e) => customAlert('실패', e instanceof Error ? e.message : '오류') },
      );
    }
  }

  function handleSelectTeam(team: TeamSide) {
    if (!battle) return;
    if (!isMeJoined) {
      join.mutate({ battleId: battle.id, team }, {
        onError: (e) => customAlert('실패', e instanceof Error ? e.message : '오류'),
      });
    } else if (myTeam !== team) {
      changeTeam.mutate({ battleId: battle.id, team }, {
        onError: (e) => customAlert('실패', e instanceof Error ? e.message : '오류'),
      });
    }
  }

  function handleStart() {
    startBattle.mutate(battle!.id, {
      onError: (e) => customAlert('실패', e instanceof Error ? e.message : '오류'),
    });
  }

  function handleEnd() {
    customAlert('대결을 종료할까요?', '종료 후엔 점수가 더 이상 갱신되지 않아요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '종료',
        style: 'destructive',
        onPress: () =>
          endBattle.mutate(battle!.id, {
            onError: (e) => customAlert('실패', e instanceof Error ? e.message : '오류'),
          }),
      },
    ]);
  }

  function handleRecord() {
    if (!battle) return;
    router.push({ pathname: '/session/new', params: { gymId: battle.gym_id } } as never);
  }

  function handleAccept() {
    accept.mutate(battle!.id, {
      onError: (e) => customAlert('실패', e instanceof Error ? e.message : '오류'),
    });
  }
  function handleDecline() {
    customAlert('대결을 거절할까요?', '거절하면 다시 수락할 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '거절',
        style: 'destructive',
        onPress: () =>
          decline.mutate(battle!.id, {
            onError: (e) => customAlert('실패', e instanceof Error ? e.message : '오류'),
          }),
      },
    ]);
  }

  const gymLabel = battle.gym
    ? `${battle.gym.name}${battle.gym.branch ? ` ${battle.gym.branch}` : ''}`
    : '암장 미지정';

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color={c.text.primary} />
        </Pressable>
        <Text className="text-text-primary text-base font-bold">대결</Text>
        {isCreator ? (
          <Pressable onPress={handleDelete} className="p-2 active:opacity-60" hitSlop={8}>
            <Feather name="trash-2" size={20} color={c.status.danger} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView contentContainerClassName="p-5 gap-5 pb-8">
        {/* Hero */}
        <View className="gap-2 pt-1">
          <View className="flex-row items-center gap-2">
            <StatusPill status={status} />
            <Text className="text-text-tertiary text-xs font-bold">
              {isCrewVs ? '크루 vs 크루' : '크루 내 개인전'}
            </Text>
          </View>
          <Text className="text-text-primary text-2xl font-extrabold">{battle.title}</Text>
          <View className="flex-row flex-wrap gap-x-3 gap-y-1">
            <View className="flex-row items-center gap-1">
              <Feather name="calendar" size={11} color={c.text.tertiary} />
              <Text className="text-text-tertiary text-xs font-semibold">
                {formatDate(battle.battle_date)}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Feather name="map-pin" size={11} color={c.text.tertiary} />
              <Text className="text-text-tertiary text-xs font-semibold">{gymLabel}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Feather name="award" size={11} color={c.text.tertiary} />
              <Text className="text-text-tertiary text-xs font-semibold">
                {describeRules(battle.scoring_rules)}
              </Text>
            </View>
          </View>
        </View>

        {/* 크루 vs 크루 점수 비교 */}
        {isCrewVs && rankingQ.data && (
          <CrewVsCrewCard battle={battle} totals={rankingQ.data.crewTotals} status={status} />
        )}

        {/* 팀전 점수 비교 */}
        {isTeam && rankingQ.data && (
          <TeamVsTeamCard totals={rankingQ.data.teamTotals} status={status} />
        )}

        {/* 호스트 시작/종료 */}
        {isCreator && !isDeclined && (
          <View className="flex-row gap-2">
            {isScheduled && (
              <Pressable
                onPress={handleStart}
                disabled={startBattle.isPending}
                className="flex-1 py-3 rounded-xl items-center justify-center flex-row gap-2 bg-status-success/10 border border-status-success/30"
              >
                <Feather name="play" size={14} color={c.status.success} />
                <Text className="text-status-success text-sm font-extrabold">대결 시작</Text>
              </Pressable>
            )}
            {status === 'active' && (
              <Pressable
                onPress={handleEnd}
                disabled={endBattle.isPending}
                className="flex-1 py-3 rounded-xl items-center justify-center flex-row gap-2 bg-status-warning/10 border border-status-warning/30"
              >
                <Feather name="flag" size={14} color={c.status.warning} />
                <Text className="text-status-warning text-sm font-extrabold">대결 종료</Text>
              </Pressable>
            )}
          </View>
        )}

        {isDeclined && (
          <View className="bg-background-secondary border border-border-subtle rounded-2xl p-4">
            <Text className="text-text-tertiary text-sm font-semibold text-center">거절된 대결입니다</Text>
          </View>
        )}

        {/* 참가 토글 + 기록하기 CTA */}
        {!isEnded && !isDeclined && (
          <View className="gap-2">
            {isTeam ? (
              <View className="gap-2">
                <Text className="text-text-tertiary text-xs font-bold">참가하려면 팀 선택</Text>
                <View className="flex-row gap-2">
                  <TeamPickBtn
                    label={battle.team_a_name ?? 'A팀'}
                    active={myTeam === 'a'}
                    onPress={() => handleSelectTeam('a')}
                  />
                  <TeamPickBtn
                    label={battle.team_b_name ?? 'B팀'}
                    active={myTeam === 'b'}
                    onPress={() => handleSelectTeam('b')}
                  />
                </View>
                {isMeJoined && (
                  <Pressable
                    onPress={handleJoinToggle}
                    className="py-2 items-center"
                  >
                    <Text className="text-text-tertiary text-xs font-semibold">참가 취소</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <Pressable
                onPress={handleJoinToggle}
                disabled={join.isPending || leave.isPending}
                className={`py-3 rounded-xl items-center justify-center flex-row gap-2 ${
                  isMeJoined ? 'bg-background-card border border-border-subtle' : 'bg-brand-primary'
                }`}
              >
                {(join.isPending || leave.isPending) ? (
                  <ActivityIndicator size="small" color={isMeJoined ? c.text.primary : c.brand.onPrimary} />
                ) : (
                  <>
                    <Feather
                      name={isMeJoined ? 'user-check' : 'user-plus'}
                      size={15}
                      color={isMeJoined ? c.text.primary : c.brand.onPrimary}
                    />
                    <Text
                      className={`text-sm font-extrabold ${
                        isMeJoined ? 'text-text-primary' : 'text-background-primary'
                      }`}
                    >
                      {isMeJoined ? '참가 신청 됨 — 취소' : '참가 신청'}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
            {isMeJoined && status === 'active' && (
              <Pressable
                onPress={handleRecord}
                className="py-3 rounded-xl items-center justify-center flex-row gap-2 bg-brand-primary/10 border border-brand-primary/30"
              >
                <Feather name="edit-3" size={15} color={c.brand.primary} />
                <Text className="text-brand-primary text-sm font-extrabold">
                  지금 기록하기 ({gymLabel})
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Scheduled (=수락 대기 또는 시작 전) */}
        {isScheduled && isCrewVs && (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 gap-2">
            <View className="flex-row items-center gap-2">
              <Feather name="clock" size={14} color="#b45309" />
              <Text className="text-amber-800 text-sm font-extrabold">
                상대 크루장 수락 대기 / 시작 전
              </Text>
            </View>
            <Text className="text-amber-700 text-xs">
              원정 당일이 되면 자동으로 active 상태로 전환돼요.
            </Text>
            <PendingActions
              battle={battle}
              meId={meId}
              isCreator={isCreator}
              onAccept={handleAccept}
              onDecline={handleDecline}
              accepting={accept.isPending}
              declining={decline.isPending}
            />
          </View>
        )}

        {/* 랭킹 */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-text-primary text-base font-extrabold">
              {isEnded ? '최종 랭킹' : '실시간 랭킹'}
            </Text>
            {status === 'active' && (
              <View className="flex-row items-center gap-1">
                <View className="w-1.5 h-1.5 rounded-full bg-status-success" />
                <Text className="text-text-tertiary text-[10px] font-bold">5초마다 갱신</Text>
              </View>
            )}
          </View>
          {rankingQ.isLoading && !rankingQ.data ? (
            <View className="py-6 items-center">
              <ActivityIndicator color={c.brand.primary} />
            </View>
          ) : rankingQ.data && rankingQ.data.individuals.length > 0 ? (
            <View className="bg-background-card border border-border-subtle rounded-2xl overflow-hidden">
              {rankingQ.data.individuals.map((p, i, arr) => (
                <ParticipantRow
                  key={p.user_id}
                  participant={p}
                  rank={i + 1}
                  isMe={p.user_id === meId}
                  isLast={i === arr.length - 1}
                  isWinner={isEnded && i === 0 && p.score > 0}
                />
              ))}
            </View>
          ) : (
            <View className="bg-background-secondary border border-border-subtle rounded-2xl p-6 items-center gap-1">
              <Feather name="users" size={20} color={c.text.muted} />
              <Text className="text-text-tertiary text-sm font-semibold">아직 참가자가 없어요</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TeamPickBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 py-3 rounded-xl items-center justify-center ${
        active ? 'bg-brand-primary' : 'bg-background-card border border-border-subtle'
      }`}
    >
      <Text className={`text-sm font-extrabold ${active ? 'text-background-primary' : 'text-text-primary'}`}>
        {label}{active && ' ✓'}
      </Text>
    </Pressable>
  );
}

function TeamVsTeamCard({ totals, status }: { totals: TeamTotal[]; status: string }) {
  const c = useThemeColors();
  if (totals.length !== 2) return null;
  const a = totals[0];
  const b = totals[1];
  const total = a.score + b.score;
  const aPct = total > 0 ? Math.round((a.score / total) * 100) : 50;
  const aWin = status === 'ended' && a.score > b.score;
  const bWin = status === 'ended' && b.score > a.score;
  return (
    <View className="bg-background-card border border-border-subtle rounded-2xl p-4 gap-3">
      <View className="flex-row items-center justify-between">
        <CrewTotal name={a.name} score={a.score} isWinner={aWin} align="left" />
        <Text className="text-text-muted text-[11px] font-extrabold">VS</Text>
        <CrewTotal name={b.name} score={b.score} isWinner={bWin} align="right" />
      </View>
      <View className="h-2.5 rounded-full bg-background-subtle overflow-hidden flex-row">
        <View style={{ width: `${aPct}%`, backgroundColor: c.brand.primary }} />
      </View>
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta = ({
    scheduled: { bg: '#fff7ed', fg: '#c2410c', label: '예정' },
    active: { bg: '#ecfeff', fg: '#0e7490', label: '진행 중' },
    ended: { bg: '#f1f5f9', fg: '#64748b', label: '종료' },
    declined: { bg: '#fef2f2', fg: '#b91c1c', label: '거절됨' },
  } as Record<string, { bg: string; fg: string; label: string }>)[status]
    ?? { bg: '#f1f5f9', fg: '#64748b', label: status };
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: meta.bg }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: meta.fg }}>{meta.label}</Text>
    </View>
  );
}

function CrewVsCrewCard({
  battle, totals, status,
}: {
  battle: Battle;
  totals: { crew_id: string; crew_name: string; score: number; send_count: number }[];
  status: string;
}) {
  const c = useThemeColors();
  const home = totals.find((t) => t.crew_id === battle.crew_id);
  const away = totals.find((t) => t.crew_id === battle.opponent_crew_id);
  if (!home || !away) return null;
  const total = home.score + away.score;
  const homePct = total > 0 ? Math.round((home.score / total) * 100) : 50;
  const homeWin = status === 'ended' && home.score > away.score;
  const awayWin = status === 'ended' && away.score > home.score;
  return (
    <View className="bg-background-card border border-border-subtle rounded-2xl p-4 gap-3">
      <View className="flex-row items-center justify-between">
        <CrewTotal name={home.crew_name} score={home.score} isWinner={homeWin} align="left" />
        <Text className="text-text-muted text-[11px] font-extrabold">VS</Text>
        <CrewTotal name={away.crew_name} score={away.score} isWinner={awayWin} align="right" />
      </View>
      <View className="h-2.5 rounded-full bg-background-subtle overflow-hidden flex-row">
        <View style={{ width: `${homePct}%`, backgroundColor: c.brand.primary }} />
      </View>
    </View>
  );
}

function CrewTotal({ name, score, isWinner, align }: {
  name: string; score: number; isWinner: boolean; align: 'left' | 'right';
}) {
  return (
    <View className={`flex-1 ${align === 'left' ? 'items-start' : 'items-end'}`}>
      <Text
        className={`text-[13px] font-extrabold ${isWinner ? 'text-status-warning' : 'text-text-secondary'}`}
        numberOfLines={1}
      >
        {isWinner ? '👑 ' : ''}{name}
      </Text>
      <Text
        className={`text-2xl font-black mt-0.5 tracking-tight ${isWinner ? 'text-status-warning' : 'text-text-primary'}`}
      >
        {score}
      </Text>
    </View>
  );
}

function PendingActions({
  battle, meId, isCreator, onAccept, onDecline, accepting, declining,
}: {
  battle: Battle;
  meId: string | undefined;
  isCreator: boolean;
  onAccept: () => void;
  onDecline: () => void;
  accepting: boolean;
  declining: boolean;
}) {
  if (isCreator || !meId) {
    return <Text className="text-amber-700 text-xs font-semibold">상대 크루장 응답을 기다려 주세요</Text>;
  }
  return (
    <View className="flex-row gap-2 mt-1">
      <Pressable
        onPress={onAccept}
        disabled={accepting}
        className="flex-1 bg-brand-primary py-3 rounded-xl items-center active:opacity-85"
      >
        {accepting ? <ActivityIndicator size="small" color="white" /> : (
          <Text className="text-white text-sm font-extrabold">수락</Text>
        )}
      </Pressable>
      <Pressable
        onPress={onDecline}
        disabled={declining}
        className="flex-1 border border-status-danger/30 py-3 rounded-xl items-center active:opacity-70"
      >
        <Text className="text-status-danger text-sm font-bold">거절</Text>
      </Pressable>
    </View>
  );
}

function ParticipantRow({ participant, rank, isMe, isLast, isWinner }: {
  participant: BattleScoreEntry;
  rank: number;
  isMe: boolean;
  isLast: boolean;
  isWinner: boolean;
}) {
  const c = useThemeColors();
  const name = participant.display_name || participant.username;
  return (
    <View
      className={`flex-row items-center gap-2.5 px-3.5 py-3 ${isMe ? 'bg-brand-primary/10' : 'bg-background-card'}`}
      style={{ borderBottomWidth: isLast ? 0 : 1, borderColor: c.border.subtle }}
    >
      <View className="w-7 items-center justify-center">
        {isWinner ? (
          <Text className="text-lg">👑</Text>
        ) : (
          <Text className={`text-sm font-black ${rank <= 3 ? 'text-brand-primaryDeep' : 'text-text-muted'}`}>
            {rank}
          </Text>
        )}
      </View>
      <View className="w-8 h-8 rounded-full bg-background-subtle items-center justify-center overflow-hidden">
        {participant.avatar_url ? (
          <Image source={{ uri: participant.avatar_url }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Text className="text-[11px] font-extrabold text-text-tertiary">
            {(name[0] ?? '?').toUpperCase()}
          </Text>
        )}
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-1">
          <Text className={`text-[13px] ${isMe ? 'font-black' : 'font-bold'} text-text-primary`} numberOfLines={1}>
            {name}
            {isMe && <Text className="text-[11px] font-bold text-brand-primaryDeep"> (나)</Text>}
          </Text>
          <FeaturedBadgeChip badgeKey={participant.featured_badge_key} size={11} />
        </View>
        <Text className="text-[11px] font-semibold text-text-muted mt-0.5">
          완등 {participant.send_count}
        </Text>
      </View>
      <Text className="text-lg font-black text-text-primary tracking-tight">
        {participant.score}
      </Text>
    </View>
  );
}
