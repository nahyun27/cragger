import { customAlert } from '@/components/ui/custom-alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '@/lib/auth-context';
import { useThemeColors } from '@/lib/theme';
import {
  effectiveStatus,
  useAcceptBattle,
  useBattle,
  useBattleRanking,
  useDeclineBattle,
  useDeleteBattle,
  type Battle,
  type BattleParticipant,
} from '@/hooks/use-battles';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export default function BattleDetailScreen() {

  const c = useThemeColors();  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session: authSession } = useAuth();
  const meId = authSession?.user.id;
  const battleQ = useBattle(id);
  const rankingQ = useBattleRanking(id);
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
  if (battleQ.error || !battleQ.data) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center p-6" edges={['top']}>
        <Text className="text-status-danger text-sm font-semibold mb-3">
          {battleQ.error?.message ?? '대결을 찾을 수 없어요'}
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
  const battle = battleQ.data;
  const status = effectiveStatus(battle);
  const isCreator = battle.created_by === meId;
  const isCrewVs = battle.battle_type === 'crew_vs_crew';
  const isEnded = status === 'ended';
  const isPending = status === 'pending';
  const isDeclined = status === 'declined';

  // 상대 크루 owner 인지 체크 — 수락 권한
  const opponentOwnerCheck = rankingQ.data?.crewTotals.find(
    (c) => c.crew_id === battle.opponent_crew_id,
  );

  function handleDelete() {
    customAlert('대결을 삭제할까요?', '되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBattle.mutateAsync(battle.id);
            router.back();
          } catch (e) {
            customAlert('실패', e instanceof Error ? e.message : '오류');
          }
        },
      },
    ]);
  }

  function handleAccept() {
    accept.mutate(battle.id, {
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
          decline.mutate(battle.id, {
            onError: (e) => customAlert('실패', e instanceof Error ? e.message : '오류'),
          }),
      },
    ]);
  }

  const daysLeft = daysBetween(new Date(), new Date(battle.ends_at));

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
              {battle.battle_type === 'individual' ? '크루 내 개인전' : '크루 vs 크루'}
            </Text>
          </View>
          <Text className="text-text-primary text-2xl font-extrabold">
            {battle.title}
          </Text>
          <Text className="text-text-tertiary text-xs font-semibold">
            {formatDate(battle.starts_at)} ~ {formatDate(battle.ends_at)}
            {!isEnded && !isPending && daysLeft >= 0 && (
              <Text className="text-brand-primary"> · D-{daysLeft}</Text>
            )}
          </Text>
        </View>

        {/* 크루 vs 크루 점수 비교 */}
        {isCrewVs && rankingQ.data && (
          <CrewVsCrewCard battle={battle} totals={rankingQ.data.crewTotals} status={status} />
        )}

        {/* Pending — 상대 크루 owner 수락/거절 */}
        {isPending && (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 gap-2">
            <View className="flex-row items-center gap-2">
              <Feather name="clock" size={14} color="#b45309" />
              <Text className="text-amber-800 text-sm font-extrabold">
                상대 크루장 수락 대기 중
              </Text>
            </View>
            <Text className="text-amber-700 text-xs">
              {battle.opponent_crew?.name ?? '상대 크루'} 크루장이 수락해야 시작돼요.
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

        {isDeclined && (
          <View className="bg-background-secondary border border-border-subtle rounded-2xl p-4">
            <Text className="text-text-tertiary text-sm font-semibold text-center">
              거절된 대결입니다
            </Text>
          </View>
        )}

        {/* 랭킹 — active/ended 시 */}
        {(status === 'active' || isEnded) && (
          <View className="gap-3">
            <Text className="text-text-primary text-base font-extrabold">
              {isEnded ? '최종 랭킹' : '실시간 랭킹'}
            </Text>
            {rankingQ.isLoading ? (
              <View className="py-6 items-center">
                <ActivityIndicator color={c.brand.primary} />
              </View>
            ) : rankingQ.data && rankingQ.data.individuals.length > 0 ? (
              <View className="bg-white border border-border-subtle rounded-2xl overflow-hidden">
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
                <Text className="text-text-tertiary text-sm font-semibold">
                  아직 참가자가 없어요
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 안내 */}
        {(status === 'active' || isEnded) && (
          <View className="bg-background-secondary border border-border-subtle rounded-xl p-3 gap-1">
            <View className="flex-row items-center gap-1.5">
              <Feather name="info" size={11} color={c.text.tertiary} />
              <Text className="text-text-tertiary text-xs font-bold">점수 계산</Text>
            </View>
            <Text className="text-text-tertiary text-xs leading-4">
              대결 기간 내 등록한 완등 중 felt_grade(V그레이드) 가 있는 시도만
              합산해요. V+ 는 0.5점 가산. 리드 등급은 미반영.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta = {
    pending: { bg: '#fff7ed', fg: '#c2410c', label: '수락 대기' },
    active: { bg: '#ecfeff', fg: '#0e7490', label: '진행 중' },
    ended: { bg: '#f1f5f9', fg: '#64748b', label: '종료' },
    declined: { bg: '#fef2f2', fg: '#b91c1c', label: '거절됨' },
  }[status] ?? { bg: '#f1f5f9', fg: '#64748b', label: status };

  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: meta.bg,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '800', color: meta.fg }}>
        {meta.label}
      </Text>
    </View>
  );
}

function CrewVsCrewCard({
  battle,
  totals,
  status,
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
    <View
      style={{
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 18,
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <CrewTotal name={home.crew_name} score={home.score} isWinner={homeWin} align="left" />
        <Text style={{ fontSize: 11, fontWeight: '800', color: c.text.muted }}>VS</Text>
        <CrewTotal name={away.crew_name} score={away.score} isWinner={awayWin} align="right" />
      </View>
      {/* 비율 바 */}
      <View
        style={{
          height: 10,
          borderRadius: 999,
          backgroundColor: '#f1f5f9',
          overflow: 'hidden',
          flexDirection: 'row',
        }}
      >
        <View style={{ width: `${homePct}%`, backgroundColor: c.brand.primary }} />
      </View>
    </View>
  );
}

function CrewTotal({
  name,
  score,
  isWinner,
  align,
}: {
  name: string;
  score: number;
  isWinner: boolean;
  align: 'left' | 'right';
}) {
  return (
    <View style={{ flex: 1, alignItems: align === 'left' ? 'flex-start' : 'flex-end' }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '800',
          color: isWinner ? '#b45309' : '#475569',
        }}
        numberOfLines={1}
      >
        {isWinner ? '👑 ' : ''}{name}
      </Text>
      <Text
        style={{
          fontSize: 24,
          fontWeight: '900',
          color: isWinner ? '#b45309' : '#0f172a',
          marginTop: 2,
          letterSpacing: -0.5,
        }}
      >
        {score}
      </Text>
    </View>
  );
}

function PendingActions({
  battle,
  meId,
  isCreator,
  onAccept,
  onDecline,
  accepting,
  declining,
}: {
  battle: Battle;
  meId: string | undefined;
  isCreator: boolean;
  onAccept: () => void;
  onDecline: () => void;
  accepting: boolean;
  declining: boolean;
}) {
  // 상대 크루 owner 여부는 client 에서 판단 어렵 — 일단 자기 자신이 creator 가 아니면
  // 수락/거절 버튼 노출. 권한은 RLS 가 막음.
  if (isCreator || !meId) {
    return (
      <Text className="text-amber-700 text-xs font-semibold">
        상대 크루장의 응답을 기다려 주세요
      </Text>
    );
  }
  return (
    <View className="flex-row gap-2 mt-1">
      <Pressable
        onPress={onAccept}
        disabled={accepting}
        className="flex-1 bg-brand-primary py-3 rounded-xl items-center active:opacity-85"
      >
        {accepting ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
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

function ParticipantRow({
  participant,
  rank,
  isMe,
  isLast,
  isWinner,
}: {
  participant: BattleParticipant;
  rank: number;
  isMe: boolean;
  isLast: boolean;
  isWinner: boolean;
}) {
  const c = useThemeColors();
  const name = participant.display_name || participant.username;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: isMe ? '#ecfeff' : '#ffffff',
        borderBottomWidth: isLast ? 0 : 1,
        borderColor: '#f1f5f9',
      }}
    >
      <View
        style={{
          width: 28,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isWinner ? (
          <Text style={{ fontSize: 18 }}>👑</Text>
        ) : (
          <Text
            style={{
              fontSize: 14,
              fontWeight: '900',
              color: rank <= 3 ? '#0e7490' : '#94a3b8',
            }}
          >
            {rank}
          </Text>
        )}
      </View>
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
        {participant.avatar_url ? (
          <Image
            source={{ uri: participant.avatar_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ fontSize: 11, fontWeight: '800', color: c.text.tertiary }}>
            {(name[0] ?? '?').toUpperCase()}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: isMe ? '900' : '700',
            color: c.text.primary,
          }}
          numberOfLines={1}
        >
          {name}
          {isMe && (
            <Text style={{ fontSize: 11, fontWeight: '700', color: c.brand.primaryDeep }}> (나)</Text>
          )}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: '600', color: c.text.muted, marginTop: 1 }}>
          완등 {participant.send_count}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '900',
          color: c.text.primary,
          letterSpacing: -0.3,
        }}
      >
        {participant.score}
      </Text>
    </View>
  );
}
