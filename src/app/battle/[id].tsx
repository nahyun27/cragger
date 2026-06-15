import { customAlert } from '@/components/ui/custom-alert';
import { useLocalSearchParams, useRouter } from '@/lib/router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { FeaturedBadgeChip } from '@/components/ui/featured-badge-chip';
import { ScreenHeader } from '@/components/ui/screen-header';
import { UserAvatar } from '@/components/ui/user-avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { CLIMB_COLOR_HEX, CLIMB_COLOR_LABEL, resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import { useAuth } from '@/lib/auth-context';
import { useThemeColors } from '@/lib/theme';
import { useBattleRecording, type ColorCountMap } from '@/hooks/use-battle-recording';
import {
  effectiveStatus,
  useAcceptBattle,
  useBattle,
  useBattleParticipants,
  useBattleRanking,
  useChangeBattleTeam,
  useDeclineBattle,
  resolveTeamConfigs,
  useDeleteBattle,
  useEndBattle,
  useJoinBattle,
  useLeaveBattle,
  useMyBattleSends,
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
  const insets = useSafeAreaInsets();
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
  const mySends = useMyBattleSends(id);
  const join = useJoinBattle();
  const leave = useLeaveBattle();
  const changeTeam = useChangeBattleTeam();
  const startBattle = useStartBattle();
  const endBattle = useEndBattle();
  const accept = useAcceptBattle();
  const decline = useDeclineBattle();
  const deleteBattle = useDeleteBattle();
  const recording = useBattleRecording({
    battleId: battle?.id,
    gymId: battle?.gym_id,
    battleDate: battle?.battle_date,
  });

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
  // 점수 공개 — 'after_end' 이면 종료 전까지 점수/랭크를 가린다
  const hideScores = (battle.score_visibility ?? 'live') === 'after_end' && !isEnded;
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

  async function handleShare() {
    if (!battle) return;
    const typeLabel = isCrewVs ? '크루 vs 크루' : isTeam ? '크루 내 팀전' : '크루 내 개인전';
    const lines = [
      `⚔️ ${battle.title}`,
      `${typeLabel} · ${formatDate(battle.battle_date)}`,
      ...(battle.gym ? [`📍 ${gymLabel}`] : []),
      '',
      '크래거에서 대결을 구경해보세요!',
    ];
    try {
      await Share.share({ message: lines.join('\n') });
    } catch { /* user cancelled */ }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['left', 'right']}>
      <ScreenHeader
        title="대결"
        onBack={() => router.back()}
        rightActions={[
          { icon: 'share-2', onPress: handleShare },
          ...(isCreator ? [{ icon: 'trash-2' as const, tone: 'danger' as const, onPress: handleDelete }] : []),
        ]}
      />

      <ScrollView
        contentContainerClassName="p-5 gap-5"
        contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        {/* Hero */}
        <View className="gap-2 pt-1">
          <View className="flex-row items-center gap-2">
            <StatusPill status={status} />
            <Text className="text-text-tertiary text-xs font-bold">
              {isCrewVs ? '크루 vs 크루' : isTeam ? '크루 내 팀전' : '크루 내 개인전'}
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
        {isCrewVs && rankingQ.data && !hideScores && (
          <CrewVsCrewCard battle={battle} totals={rankingQ.data.crewTotals} status={status} />
        )}

        {/* 팀전 점수 비교 */}
        {isTeam && rankingQ.data && !hideScores && (
          <TeamVsTeamCard totals={rankingQ.data.teamTotals} status={status} />
        )}

        {/* 점수 숨김 안내 */}
        {hideScores && (isCrewVs || isTeam || (rankingQ.data && rankingQ.data.individuals.length > 0)) && (
          <View className="bg-background-card border border-border-subtle rounded-2xl p-3.5 flex-row items-center gap-2">
            <Feather name="eye-off" size={14} color={c.text.tertiary} />
            <Text className="text-text-secondary text-[12px] font-bold flex-1">
              점수는 대결 종료 후 공개돼요
            </Text>
          </View>
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
                {(() => {
                  const configs = resolveTeamConfigs(battle);
                  const cols = configs.length <= 2 ? 2 : 3;
                  return (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                      {configs.map((t) => (
                        <View
                          key={t.key}
                          style={{ width: `${100 / cols}%`, padding: 4 }}
                        >
                          <TeamPickBtn
                            label={t.name}
                            active={myTeam === t.key}
                            onPress={() => handleSelectTeam(t.key)}
                          />
                        </View>
                      ))}
                    </View>
                  );
                })()}
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
              <RecordingPanel
                counts={recording.counts}
                colorGrades={battle.color_grades ?? []}
                onAdd={recording.addSend}
                onRemove={recording.removeSend}
                gymLabel={gymLabel}
              />
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

        {/* 내 결과 — 본인이 참가한 대결에서만 노출 */}
        {!isScheduled && !isDeclined && mySends.data && mySends.data.total > 0 && (
          <View
            style={{
              backgroundColor: c.brand.primaryLight,
              borderRadius: 16,
              padding: 14,
              gap: 10,
              borderWidth: 1,
              borderColor: c.brand.primary + '33',
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Feather name="award" size={14} color={c.brand.primaryDeep} />
                <Text style={{ fontSize: 12, fontWeight: '900', color: c.brand.primaryDeep, letterSpacing: 0.2 }}>
                  내 결과
                </Text>
              </View>
              <View className="flex-row items-baseline gap-1">
                <Text style={{ fontSize: 22, fontWeight: '900', color: c.brand.primaryDeep, letterSpacing: -0.5 }}>
                  {mySends.data.total}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: c.brand.primaryDeep }}>완등</Text>
              </View>
            </View>
            {mySends.data.byColor.length > 0 && (
              <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                {mySends.data.byColor.map((entry) => (
                  <View
                    key={entry.color}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingLeft: 8,
                      paddingRight: 10,
                      paddingVertical: 5,
                      borderRadius: 999,
                      backgroundColor: c.bg.card,
                    }}
                  >
                    <View
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        backgroundColor: resolveColorHex(entry.color),
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                      }}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '900', color: c.text.primary, letterSpacing: -0.2 }}>
                      {resolveColorLabel(entry.color)}
                    </Text>
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: c.text.tertiary }}>
                      ×{entry.count}
                    </Text>
                  </View>
                ))}
              </View>
            )}
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
            isTeam ? (
              (() => {
                const configs = resolveTeamConfigs(battle);
                const byTeam = new Map<string, typeof rankingQ.data.individuals>();
                for (const t of configs) byTeam.set(t.key, []);
                const unassigned: typeof rankingQ.data.individuals = [];
                for (const p of rankingQ.data.individuals) {
                  if (p.team && byTeam.has(p.team)) byTeam.get(p.team)!.push(p);
                  else unassigned.push(p);
                }
                const totalsByKey = new Map(
                  rankingQ.data.teamTotals.map((t) => [t.team, t]),
                );
                return (
                  <View className="gap-3">
                    {configs.map((cfg) => {
                      const members = byTeam.get(cfg.key) ?? [];
                      const total = totalsByKey.get(cfg.key);
                      return (
                        <View
                          key={cfg.key}
                          className="bg-background-card border border-border-subtle rounded-2xl overflow-hidden"
                        >
                          <View className="flex-row items-center justify-between px-4 py-2.5 bg-background-secondary border-b border-border-subtle">
                            <View className="flex-row items-center gap-2">
                              <Text className="text-text-primary text-sm font-extrabold">
                                {cfg.name}
                              </Text>
                              <Text className="text-text-tertiary text-[11px] font-bold">
                                {members.length}명
                              </Text>
                            </View>
                            {!hideScores && total && (
                              <Text className="text-brand-primary text-sm font-extrabold">
                                {total.score}점 · 완등 {total.send_count}
                              </Text>
                            )}
                          </View>
                          {members.length === 0 ? (
                            <View className="px-4 py-4">
                              <Text className="text-text-tertiary text-xs font-semibold text-center">
                                아직 참가자가 없어요
                              </Text>
                            </View>
                          ) : (
                            members.map((p, i, arr) => (
                              <ParticipantRow
                                key={p.user_id}
                                participant={p}
                                rank={i + 1}
                                isMe={p.user_id === meId}
                                isLast={i === arr.length - 1}
                                isWinner={false}
                                hideScore={hideScores && p.user_id !== meId}
                              />
                            ))
                          )}
                        </View>
                      );
                    })}
                    {unassigned.length > 0 && (
                      <View className="bg-background-card border border-border-subtle rounded-2xl overflow-hidden">
                        <View className="px-4 py-2.5 bg-background-secondary border-b border-border-subtle">
                          <Text className="text-text-tertiary text-xs font-extrabold">
                            팀 미정
                          </Text>
                        </View>
                        {unassigned.map((p, i, arr) => (
                          <ParticipantRow
                            key={p.user_id}
                            participant={p}
                            rank={i + 1}
                            isMe={p.user_id === meId}
                            isLast={i === arr.length - 1}
                            isWinner={false}
                            hideScore={hideScores && p.user_id !== meId}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })()
            ) : (
              <View className="bg-background-card border border-border-subtle rounded-2xl overflow-hidden">
                {rankingQ.data.individuals.map((p, i, arr) => (
                  <ParticipantRow
                    key={p.user_id}
                    participant={p}
                    rank={i + 1}
                    isMe={p.user_id === meId}
                    isLast={i === arr.length - 1}
                    isWinner={isEnded && i === 0 && p.score > 0}
                    hideScore={hideScores && p.user_id !== meId}
                  />
                ))}
              </View>
            )
          ) : (
            <EmptyState
              compact
              icon="users"
              tone="muted"
              title="아직 참가자가 없어요"
            />
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
      className={`w-full py-3 rounded-xl items-center justify-center ${
        active ? 'bg-brand-primary' : 'bg-background-card border border-border-subtle'
      }`}
    >
      <Text
        className={`text-sm font-extrabold ${active ? 'text-background-primary' : 'text-text-primary'}`}
        numberOfLines={1}
      >
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

function RecordingPanel({
  counts, colorGrades, onAdd, onRemove, gymLabel,
}: {
  counts: ColorCountMap;
  colorGrades: Array<{ color: string; points: number }>;
  onAdd: (color: string) => void;
  onRemove: (color: string) => void;
  gymLabel: string;
}) {
  const c = useThemeColors();
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  // 호스트가 정한 순서대로 (쉬운→어려운)
  const colors = colorGrades.filter((e) => CLIMB_COLOR_HEX[e.color]);
  return (
    <View className="rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-3.5 gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Feather name="zap" size={13} color={c.brand.primary} />
          <Text className="text-brand-primary text-[12px] font-extrabold">
            바로 기록 — {gymLabel}
          </Text>
        </View>
        <Text className="text-text-tertiary text-[11px] font-bold">
          오늘 완등 {total}
        </Text>
      </View>
      {colors.length === 0 ? (
        <Text className="text-text-tertiary text-[12px] font-semibold text-center py-3">
          호스트가 색깔별 점수를 아직 설정하지 않았어요
        </Text>
      ) : (
        <View className="gap-2">
          {colors.map(({ color, points }) => (
            <ColorCountRow
              key={color}
              color={color}
              count={counts[color] ?? 0}
              points={points}
              onAdd={() => onAdd(color)}
              onRemove={() => onRemove(color)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function ColorCountRow({
  color, count, points, onAdd, onRemove,
}: {
  color: string;
  count: number;
  points: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const c = useThemeColors();
  const hex = CLIMB_COLOR_HEX[color];
  const label = CLIMB_COLOR_LABEL[color] ?? color;
  const isLight = color === 'white' || color === 'yellow' || color === 'lime' || color === 'sky';
  return (
    <View
      className="flex-row items-center gap-2 px-2 py-2 rounded-xl"
      style={{ backgroundColor: c.bg.card, borderWidth: 1, borderColor: c.border.subtle }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: hex,
          borderWidth: isLight ? 1 : 0,
          borderColor: c.border.subtle,
        }}
      />
      <Text className="text-text-primary text-[13px] font-extrabold flex-1" numberOfLines={1}>
        {label}
      </Text>
      <View
        style={{
          paddingHorizontal: 7,
          paddingVertical: 2,
          borderRadius: 6,
          backgroundColor: c.bg.subtle,
        }}
      >
        <Text className="text-text-secondary text-[11px] font-extrabold">{points}점</Text>
      </View>
      <Pressable
        onPress={onRemove}
        disabled={count <= 0}
        hitSlop={6}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: count > 0 ? c.bg.subtle : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: count > 0 ? 1 : 0.4,
        }}
        className="active:opacity-60"
      >
        <Feather name="minus" size={16} color={c.text.primary} />
      </Pressable>
      <View
        style={{
          minWidth: 28,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text className="text-text-primary text-[16px] font-black tracking-tight">
          {count}
        </Text>
      </View>
      <Pressable
        onPress={onAdd}
        hitSlop={6}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: c.brand.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        className="active:opacity-80"
      >
        <Feather name="plus" size={16} color={c.brand.onPrimary} />
      </Pressable>
    </View>
  );
}

function ParticipantRow({ participant, rank, isMe, isLast, isWinner, hideScore }: {
  participant: BattleScoreEntry;
  rank: number;
  isMe: boolean;
  isLast: boolean;
  isWinner: boolean;
  hideScore: boolean;
}) {
  const c = useThemeColors();
  const name = participant.display_name || participant.username;
  const [expanded, setExpanded] = useState(false);
  const canExpand = !hideScore && participant.color_sends.length > 0;

  return (
    <View style={{ borderBottomWidth: isLast ? 0 : 1, borderColor: c.border.subtle }}>
      <Pressable
        onPress={() => canExpand && setExpanded((v) => !v)}
        disabled={!canExpand}
      >
        {({ pressed }) => (
          <View
            className={`flex-row items-center gap-2.5 px-3.5 py-3 ${isMe ? 'bg-brand-primary/10' : 'bg-background-card'}`}
            style={pressed && canExpand ? { opacity: 0.7 } : undefined}
          >
            <View className="w-7 items-center justify-center">
              {hideScore ? (
                <Feather name="lock" size={13} color={c.text.muted} />
              ) : isWinner ? (
                <Text className="text-lg">👑</Text>
              ) : (
                <Text className={`text-sm font-black ${rank <= 3 ? 'text-brand-primaryDeep' : 'text-text-muted'}`}>
                  {rank}
                </Text>
              )}
            </View>
            <UserAvatar
              userKey={participant.user_id}
              username={name}
              avatarUrl={participant.avatar_url}
              size={32}
            />
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-1">
                <Text className={`text-[13px] ${isMe ? 'font-black' : 'font-bold'} text-text-primary`} numberOfLines={1}>
                  {name}
                  {isMe && <Text className="text-[11px] font-bold text-brand-primaryDeep"> (나)</Text>}
                </Text>
                <FeaturedBadgeChip badgeKey={participant.featured_badge_key} size={11} />
              </View>
              <Text className="text-[11px] font-semibold text-text-muted mt-0.5">
                {hideScore ? '비공개' : `완등 ${participant.send_count}`}
              </Text>
            </View>
            <Text className="text-lg font-black text-text-primary tracking-tight">
              {hideScore ? '—' : participant.score}
            </Text>
            {canExpand && (
              <Feather
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={c.text.muted}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        )}
      </Pressable>
      {expanded && canExpand && (
        <View
          className="px-3.5 pb-3 pt-1 bg-background-subtle"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
        >
          {participant.color_sends.map((cs) => {
            const hex = resolveColorHex(cs.color);
            const label = resolveColorLabel(cs.color);
            return (
              <View
                key={cs.color}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: c.bg.card,
                  borderWidth: 1,
                  borderColor: c.border.subtle,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: hex,
                    borderWidth: 1,
                    borderColor: cs.color === 'white' ? c.border.strong : 'transparent',
                  }}
                />
                <Text style={{ fontSize: 11, fontWeight: '700', color: c.text.secondary }}>
                  {label} {cs.count}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
