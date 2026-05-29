import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { checkBadgesAndNotify } from '@/lib/check-badges-and-notify';
import { supabase } from '@/lib/supabase';

export type BattleType = 'individual' | 'crew_vs_crew';
export type BattleStatus = 'pending' | 'active' | 'ended' | 'declined';

export type BattleCrewMini = {
  id: string;
  name: string;
};

export type Battle = {
  id: string;
  battle_type: BattleType;
  title: string;
  crew_id: string;
  opponent_crew_id: string | null;
  status: BattleStatus;
  starts_at: string;
  ends_at: string;
  created_by: string;
  created_at: string;
  crew: BattleCrewMini | null;
  opponent_crew: BattleCrewMini | null;
};

const BATTLE_COLS =
  'id, battle_type, title, crew_id, opponent_crew_id, status, starts_at, ends_at, created_by, created_at, crew:crews!battles_crew_id_fkey(id, name), opponent_crew:crews!battles_opponent_crew_id_fkey(id, name)';

// 현재 시각 기준 effective status — DB status='active' 라도 ends_at 지났으면 ended.
export function effectiveStatus(b: Battle): BattleStatus {
  if (b.status === 'pending' || b.status === 'declined') return b.status;
  const now = Date.now();
  if (new Date(b.ends_at).getTime() < now) return 'ended';
  if (new Date(b.starts_at).getTime() > now) return 'pending';  // 시작 전
  return 'active';
}

// ── 크루의 대결 목록 ─────────────────────────────────────────
export function useBattles(crewId: string | undefined) {
  return useQuery({
    queryKey: ['battles', crewId] as const,
    enabled: !!crewId,
    queryFn: async (): Promise<Battle[]> => {
      const { data, error } = await supabase
        .from('battles')
        .select(BATTLE_COLS)
        .or(`crew_id.eq.${crewId},opponent_crew_id.eq.${crewId}`)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Battle[];
    },
  });
}

// ── 단일 대결 ────────────────────────────────────────────────
export function useBattle(battleId: string | undefined) {
  return useQuery({
    queryKey: ['battles', 'detail', battleId] as const,
    enabled: !!battleId,
    queryFn: async (): Promise<Battle> => {
      const { data, error } = await supabase
        .from('battles')
        .select(BATTLE_COLS)
        .eq('id', battleId!)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Battle;
    },
  });
}

// ── 랭킹 (client 집계) ────────────────────────────────────────
// 점수 = 기간 내 send/onsight/flash/redpoint + felt_grade 의 V그레이드 합산.
// 5.x lead 등급은 점수 미반영 (V그레이드만).
export type BattleParticipant = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  crew_id: string;
  score: number;       // V 합산
  send_count: number;  // 점수 반영된 완등 수
};

export type BattleRanking = {
  individuals: BattleParticipant[];   // 점수 내림차순
  crewTotals: { crew_id: string; crew_name: string; score: number; send_count: number }[];
};

function vGradeToNum(g: string | null): number | null {
  if (!g) return null;
  const m = /^V(\d+)([+-])?$/.exec(g.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const suffix = m[2];
  if (suffix === '+') return n + 0.5;
  if (suffix === '-') return n - 0.5;
  return n;
}

const SEND_RESULTS = new Set(['send', 'onsight', 'flash', 'redpoint']);

export function useBattleRanking(battleId: string | undefined) {
  return useQuery({
    queryKey: ['battles', 'ranking', battleId] as const,
    enabled: !!battleId,
    queryFn: async (): Promise<BattleRanking> => {
      // 1) battle 정보
      const { data: bRow, error: bErr } = await supabase
        .from('battles')
        .select(BATTLE_COLS)
        .eq('id', battleId!)
        .single();
      if (bErr) throw new Error(bErr.message);
      const battle = bRow as unknown as Battle;

      // 2) 참여 크루(들) → 멤버 목록
      const crewIds = [battle.crew_id];
      if (battle.opponent_crew_id) crewIds.push(battle.opponent_crew_id);

      const { data: members, error: mErr } = await supabase
        .from('crew_members')
        .select('crew_id, user_id, user:profiles!crew_members_user_id_fkey(id, username, display_name, avatar_url)')
        .in('crew_id', crewIds);
      if (mErr) throw new Error(mErr.message);
      const memberRows = (members ?? []) as Array<{
        crew_id: string;
        user_id: string;
        user: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
      }>;

      // 멤버 dedupe (같은 유저가 두 크루 모두 멤버일 가능성 — 일단 첫 crew 우선)
      const participantMap = new Map<string, BattleParticipant>();
      for (const m of memberRows) {
        if (!m.user) continue;
        if (participantMap.has(m.user_id)) continue;
        participantMap.set(m.user_id, {
          user_id: m.user_id,
          username: m.user.username,
          display_name: m.user.display_name,
          avatar_url: m.user.avatar_url,
          crew_id: m.crew_id,
          score: 0,
          send_count: 0,
        });
      }

      const participantUserIds = Array.from(participantMap.keys());
      if (participantUserIds.length === 0) {
        return {
          individuals: [],
          crewTotals: crewIds.map((cid) => ({
            crew_id: cid,
            crew_name:
              cid === battle.crew_id
                ? battle.crew?.name ?? ''
                : battle.opponent_crew?.name ?? '',
            score: 0,
            send_count: 0,
          })),
        };
      }

      // 3) 기간 내 attempts — session date 필터 + felt_grade NOT NULL.
      // sessions 먼저 가져와서 session_id 모음으로 attempts 쿼리.
      const startDate = battle.starts_at.slice(0, 10);
      const endDate = battle.ends_at.slice(0, 10);
      const { data: sessions, error: sErr } = await supabase
        .from('sessions')
        .select('id, user_id, session_date')
        .in('user_id', participantUserIds)
        .gte('session_date', startDate)
        .lte('session_date', endDate);
      if (sErr) throw new Error(sErr.message);
      const sessionRows = (sessions ?? []) as Array<{
        id: string;
        user_id: string;
        session_date: string;
      }>;
      const sessionToUser = new Map<string, string>();
      for (const s of sessionRows) sessionToUser.set(s.id, s.user_id);

      if (sessionRows.length > 0) {
        const sIds = sessionRows.map((s) => s.id);
        const { data: attempts, error: aErr } = await supabase
          .from('attempts')
          .select('session_id, result, felt_grade')
          .in('session_id', sIds)
          .not('felt_grade', 'is', null);
        if (aErr) throw new Error(aErr.message);

        for (const a of (attempts ?? []) as Array<{
          session_id: string;
          result: string;
          felt_grade: string | null;
        }>) {
          if (!SEND_RESULTS.has(a.result)) continue;
          const v = vGradeToNum(a.felt_grade);
          if (v == null) continue;
          const uid = sessionToUser.get(a.session_id);
          if (!uid) continue;
          const p = participantMap.get(uid);
          if (!p) continue;
          p.score += v;
          p.send_count += 1;
        }
      }

      const individuals = Array.from(participantMap.values()).sort(
        (a, b) => b.score - a.score,
      );

      // 크루별 합산
      const crewMap = new Map<string, { score: number; send_count: number; name: string }>();
      for (const cid of crewIds) {
        crewMap.set(cid, {
          score: 0,
          send_count: 0,
          name:
            cid === battle.crew_id
              ? battle.crew?.name ?? ''
              : battle.opponent_crew?.name ?? '',
        });
      }
      for (const p of individuals) {
        const c = crewMap.get(p.crew_id);
        if (c) {
          c.score += p.score;
          c.send_count += p.send_count;
        }
      }
      const crewTotals = Array.from(crewMap.entries()).map(([cid, v]) => ({
        crew_id: cid,
        crew_name: v.name,
        score: v.score,
        send_count: v.send_count,
      }));

      return { individuals, crewTotals };
    },
  });
}

// ── Mutations ────────────────────────────────────────────────
export type CreateBattleArgs = {
  battleType: BattleType;
  title: string;
  crewId: string;
  opponentCrewId: string | null;
  startsAt: string;  // ISO
  endsAt: string;
};

export function useCreateBattle() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (args: CreateBattleArgs): Promise<{ id: string }> => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('battles')
        .insert({
          battle_type: args.battleType,
          title: args.title.trim(),
          crew_id: args.crewId,
          opponent_crew_id: args.opponentCrewId,
          status: args.battleType === 'individual' ? 'active' : 'pending',
          starts_at: args.startsAt,
          ends_at: args.endsAt,
          created_by: userId,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battles'] });
      checkBadgesAndNotify();
    },
  });
}

export function useAcceptBattle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (battleId: string) => {
      const { error } = await supabase
        .from('battles')
        .update({ status: 'active' })
        .eq('id', battleId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battles'] });
    },
  });
}

export function useDeclineBattle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (battleId: string) => {
      // 거절은 status='declined' 로 마킹 (또는 삭제). 일단 마킹 — 기록 보존.
      const { error } = await supabase
        .from('battles')
        .update({ status: 'declined' })
        .eq('id', battleId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battles'] });
    },
  });
}

export function useDeleteBattle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (battleId: string) => {
      const { error } = await supabase.from('battles').delete().eq('id', battleId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battles'] });
    },
  });
}

// ── 상대 크루 lookup (대결 만들기 시) ──────────────────────────
export function useLookupCrewForBattle(code: string) {
  const trimmed = code.trim().toUpperCase();
  return useQuery({
    queryKey: ['battles', 'crew-lookup', trimmed] as const,
    enabled: trimmed.length === 6,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crews')
        .select('id, name, member_count')
        .eq('invite_code', trimmed)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as { id: string; name: string; member_count: number } | null;
    },
  });
}
