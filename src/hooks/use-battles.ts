import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { checkBadgesAndNotify } from '@/lib/check-badges-and-notify';
import { supabase } from '@/lib/supabase';

export type BattleType = 'crew_internal' | 'crew_vs_crew';
export type BattleStatus = 'scheduled' | 'active' | 'ended' | 'declined';

export type ScoringRules =
  | { type: 'linear'; base: number }              // V × base
  | { type: 'exp'; base: number }                  // V × base^V
  | { type: 'custom'; v_points: Record<string, number> }; // {"0":1, "1":2, ...}

export type BattleCrewMini = {
  id: string;
  name: string;
};

export type BattleGymMini = {
  id: string;
  name: string;
  branch: string | null;
};

export type Battle = {
  id: string;
  battle_type: BattleType;
  title: string;
  crew_id: string;
  opponent_crew_id: string | null;
  gym_id: string;
  battle_date: string;       // YYYY-MM-DD
  status: BattleStatus;
  scoring_rules: ScoringRules;
  created_by: string;
  created_at: string;
  crew: BattleCrewMini | null;
  opponent_crew: BattleCrewMini | null;
  gym: BattleGymMini | null;
};

const BATTLE_COLS =
  'id, battle_type, title, crew_id, opponent_crew_id, gym_id, battle_date, status, scoring_rules, created_by, created_at, crew:crews!battles_crew_id_fkey(id, name), opponent_crew:crews!battles_opponent_crew_id_fkey(id, name), gym:gyms!battles_gym_id_fkey(id, name, branch)';

// 현재 날짜 기준 effective status.
// DB status='active' 라도 battle_date 가 지났으면 ended.
// status='scheduled' 인데 오늘이면 active 로 본다.
export function effectiveStatus(b: Battle): BattleStatus {
  if (b.status === 'declined' || b.status === 'ended') return b.status;
  const today = new Date().toISOString().slice(0, 10);
  if (b.battle_date < today) return 'ended';
  if (b.battle_date > today) return 'scheduled';
  return 'active';
}

// 점수 환산 — V숫자 → scoring_rules 기반 점수
export function vToScore(v: number, rules: ScoringRules): number {
  if (rules.type === 'linear') return v * rules.base;
  if (rules.type === 'exp') return v * Math.pow(rules.base, v);
  if (rules.type === 'custom') {
    const key = String(Math.round(v));
    return rules.v_points[key] ?? 0;
  }
  return 0;
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
        .order('battle_date', { ascending: false });
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

// ── 참가자 ─────────────────────────────────────────────────
export type BattleParticipantRow = {
  user_id: string;
  joined_at: string;
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    featured_badge_key: string | null;
  } | null;
  crew_id: string | null;  // 어느 크루 소속인지 (vs_crew 일 때 합산용)
};

export function useBattleParticipants(battleId: string | undefined) {
  return useQuery({
    queryKey: ['battles', 'participants', battleId] as const,
    enabled: !!battleId,
    queryFn: async (): Promise<BattleParticipantRow[]> => {
      const { data, error } = await supabase
        .from('battle_participants')
        .select(
          'user_id, joined_at, user:profiles!battle_participants_user_id_fkey(id, username, display_name, avatar_url, featured_badge_key)',
        )
        .eq('battle_id', battleId!)
        .order('joined_at', { ascending: true });
      if (error) throw new Error(error.message);
      // crew_id 는 별도 조회 (어느 크루 멤버인지)
      const rows = (data ?? []) as Array<{
        user_id: string;
        joined_at: string;
        user: BattleParticipantRow['user'];
      }>;
      if (rows.length === 0) return [];
      // battle 정보로 두 크루 id 받기
      const { data: bRow } = await supabase
        .from('battles')
        .select('crew_id, opponent_crew_id')
        .eq('id', battleId!)
        .single();
      const crewIds = [
        (bRow as { crew_id: string }).crew_id,
        (bRow as { opponent_crew_id: string | null }).opponent_crew_id,
      ].filter((x): x is string => !!x);
      const { data: cmRows } = await supabase
        .from('crew_members')
        .select('user_id, crew_id')
        .in('user_id', rows.map((r) => r.user_id))
        .in('crew_id', crewIds);
      const userToCrew = new Map<string, string>();
      for (const r of (cmRows ?? []) as Array<{ user_id: string; crew_id: string }>) {
        if (!userToCrew.has(r.user_id)) userToCrew.set(r.user_id, r.crew_id);
      }
      return rows.map((r) => ({ ...r, crew_id: userToCrew.get(r.user_id) ?? null }));
    },
  });
}

// ── 라이브 랭킹 ───────────────────────────────────────────────
// 점수 = 그 날짜 + 그 암장 + 참가자(battle_participants) 의 sends
//   felt_grade 우선, 없으면 gym_color_grade_stats crowd 평균
//   V숫자 → scoring_rules 로 환산
export type BattleScoreEntry = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  featured_badge_key: string | null;
  crew_id: string | null;
  score: number;
  send_count: number;
};

export type BattleRanking = {
  individuals: BattleScoreEntry[];                                              // 점수 내림차순
  crewTotals: { crew_id: string; crew_name: string; score: number; send_count: number }[];
};

function vGradeToNum(g: string | null): number | null {
  if (!g) return null;
  const m = /^V(\d+)([+-])?$/.exec(g.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return m[2] === '+' ? n + 0.5 : m[2] === '-' ? n - 0.5 : n;
}

const SEND_RESULTS = new Set(['send', 'onsight', 'flash', 'redpoint']);

export function useBattleRanking(battleId: string | undefined, opts?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['battles', 'ranking', battleId] as const,
    enabled: !!battleId,
    refetchInterval: opts?.refetchInterval,
    queryFn: async (): Promise<BattleRanking> => {
      // 1) battle
      const { data: bRow, error: bErr } = await supabase
        .from('battles')
        .select(BATTLE_COLS)
        .eq('id', battleId!)
        .single();
      if (bErr) throw new Error(bErr.message);
      const battle = bRow as unknown as Battle;

      // 2) participants
      const { data: pRows, error: pErr } = await supabase
        .from('battle_participants')
        .select(
          'user_id, user:profiles!battle_participants_user_id_fkey(id, username, display_name, avatar_url, featured_badge_key)',
        )
        .eq('battle_id', battleId!);
      if (pErr) throw new Error(pErr.message);
      const participants = (pRows ?? []) as Array<{
        user_id: string;
        user: BattleScoreEntry | null;
      }>;
      if (participants.length === 0) {
        return { individuals: [], crewTotals: emptyCrewTotals(battle) };
      }
      const userIds = participants.map((p) => p.user_id);

      // 3) crew_id per participant
      const crewIds = [battle.crew_id, battle.opponent_crew_id].filter((x): x is string => !!x);
      const { data: cmRows } = await supabase
        .from('crew_members')
        .select('user_id, crew_id')
        .in('user_id', userIds)
        .in('crew_id', crewIds);
      const userToCrew = new Map<string, string>();
      for (const r of (cmRows ?? []) as Array<{ user_id: string; crew_id: string }>) {
        if (!userToCrew.has(r.user_id)) userToCrew.set(r.user_id, r.crew_id);
      }

      // 4) sessions 그 날 + 그 암장 + 참가자
      const { data: sessions, error: sErr } = await supabase
        .from('sessions')
        .select('id, user_id')
        .in('user_id', userIds)
        .eq('gym_id', battle.gym_id)
        .eq('session_date', battle.battle_date);
      if (sErr) throw new Error(sErr.message);
      const sessionRows = (sessions ?? []) as Array<{ id: string; user_id: string }>;
      const sessionToUser = new Map<string, string>();
      for (const s of sessionRows) sessionToUser.set(s.id, s.user_id);

      // 점수 누적 맵 초기화
      const scoreMap = new Map<string, BattleScoreEntry>();
      for (const p of participants) {
        if (!p.user) continue;
        scoreMap.set(p.user_id, {
          user_id: p.user_id,
          username: p.user.username,
          display_name: p.user.display_name,
          avatar_url: p.user.avatar_url,
          featured_badge_key: p.user.featured_badge_key,
          crew_id: userToCrew.get(p.user_id) ?? null,
          score: 0,
          send_count: 0,
        });
      }

      if (sessionRows.length > 0) {
        const { data: attempts, error: aErr } = await supabase
          .from('attempts')
          .select('session_id, result, felt_grade, problem:problems(color)')
          .in('session_id', sessionRows.map((s) => s.id));
        if (aErr) throw new Error(aErr.message);

        // crowd V 평균 lookup (battle 의 gym 만)
        const colorsUsed = new Set<string>();
        for (const a of (attempts ?? []) as Array<{
          problem: { color: string | null } | null;
        }>) {
          if (a.problem?.color) colorsUsed.add(a.problem.color);
        }
        const crowdVMap = new Map<string, number>();
        if (colorsUsed.size > 0) {
          const { data: statsRows } = await supabase
            .from('gym_color_grade_stats')
            .select('color, avg_v_grade')
            .eq('gym_id', battle.gym_id)
            .in('color', Array.from(colorsUsed));
          for (const r of (statsRows ?? []) as Array<{ color: string; avg_v_grade: number | null }>) {
            if (r.avg_v_grade != null) crowdVMap.set(r.color, r.avg_v_grade);
          }
        }

        // 점수 누적
        for (const a of (attempts ?? []) as Array<{
          session_id: string;
          result: string;
          felt_grade: string | null;
          problem: { color: string | null } | null;
        }>) {
          if (!SEND_RESULTS.has(a.result)) continue;
          let v: number | null = vGradeToNum(a.felt_grade);
          if (v == null && a.problem?.color) v = crowdVMap.get(a.problem.color) ?? null;
          if (v == null) continue;
          const uid = sessionToUser.get(a.session_id);
          if (!uid) continue;
          const entry = scoreMap.get(uid);
          if (!entry) continue;
          entry.score += vToScore(v, battle.scoring_rules);
          entry.send_count += 1;
        }
      }

      const individuals = Array.from(scoreMap.values()).sort((a, b) => b.score - a.score);

      // 크루별 합산
      const crewNameMap = new Map<string, string>();
      crewNameMap.set(battle.crew_id, battle.crew?.name ?? '');
      if (battle.opponent_crew_id) {
        crewNameMap.set(battle.opponent_crew_id, battle.opponent_crew?.name ?? '');
      }
      const crewMap = new Map<string, { score: number; send_count: number; name: string }>();
      for (const cid of crewIds) {
        crewMap.set(cid, { score: 0, send_count: 0, name: crewNameMap.get(cid) ?? '' });
      }
      for (const p of individuals) {
        if (!p.crew_id) continue;
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

function emptyCrewTotals(battle: Battle) {
  const out = [{
    crew_id: battle.crew_id,
    crew_name: battle.crew?.name ?? '',
    score: 0,
    send_count: 0,
  }];
  if (battle.opponent_crew_id) {
    out.push({
      crew_id: battle.opponent_crew_id,
      crew_name: battle.opponent_crew?.name ?? '',
      score: 0,
      send_count: 0,
    });
  }
  return out;
}

// ── Mutations ────────────────────────────────────────────────
export type CreateBattleArgs = {
  battleType: BattleType;
  title: string;
  crewId: string;
  opponentCrewId: string | null;
  gymId: string;
  battleDate: string;             // YYYY-MM-DD
  scoringRules: ScoringRules;
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
          gym_id: args.gymId,
          battle_date: args.battleDate,
          // crew_internal 은 바로 active(scheduled), crew_vs_crew 는 상대 수락 대기 의미로 scheduled
          status: 'scheduled',
          scoring_rules: args.scoringRules,
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

// ── 참가 신청 / 취소 ─────────────────────────────────────────
export function useJoinBattle() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (battleId: string) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('battle_participants')
        .insert({ battle_id: battleId, user_id: userId });
      if (error) {
        if (error.code === '23505') return; // 이미 참가
        throw new Error(error.message);
      }
    },
    onSuccess: (_d, battleId) => {
      queryClient.invalidateQueries({ queryKey: ['battles', 'participants', battleId] });
      queryClient.invalidateQueries({ queryKey: ['battles', 'ranking', battleId] });
    },
  });
}

export function useLeaveBattle() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (battleId: string) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('battle_participants')
        .delete()
        .eq('battle_id', battleId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, battleId) => {
      queryClient.invalidateQueries({ queryKey: ['battles', 'participants', battleId] });
      queryClient.invalidateQueries({ queryKey: ['battles', 'ranking', battleId] });
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
