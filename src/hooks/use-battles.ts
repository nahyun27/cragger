import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { checkBadgesAndNotify } from '@/lib/check-badges-and-notify';
import { supabase } from '@/lib/supabase';

export type BattleType = 'crew_internal' | 'crew_internal_team' | 'crew_vs_crew';
export type BattleStatus = 'scheduled' | 'active' | 'ended' | 'declined';
// 팀전 — multi-team 지원 후로 'a' | 'b' 외에 'c'~'f' 까지 허용.
export type TeamSide = string;
export type ScoreVisibility = 'live' | 'after_end';

// 호스트가 색깔별 점수를 지정 — 순서 = 난이도 순(쉬운 것부터)
// [{ color: 'yellow', points: 5 }, { color: 'green', points: 10 }, ...]
export type ColorGrade = { color: string; points: number };
export type ColorGrades = ColorGrade[];

// 빠른 lookup 용 — color → points
export function colorGradesMap(g: ColorGrades | null | undefined): Record<string, number> {
  const m: Record<string, number> = {};
  if (!g) return m;
  for (const e of g) m[e.color] = e.points;
  return m;
}

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
  battle_date: string;       // YYYY-MM-DD (기록용)
  status: BattleStatus;
  scoring_rules: ScoringRules;
  color_grades: ColorGrades;
  score_visibility: ScoreVisibility;
  team_a_name: string | null;
  team_b_name: string | null;
  team_configs: { key: string; name: string }[] | null;
  created_by: string;
  created_at: string;
  crew: BattleCrewMini | null;
  opponent_crew: BattleCrewMini | null;
  gym: BattleGymMini | null;
};

const BATTLE_COLS =
  'id, battle_type, title, crew_id, opponent_crew_id, gym_id, battle_date, status, scoring_rules, color_grades, score_visibility, team_a_name, team_b_name, team_configs, created_by, created_at, crew:crews!battles_crew_id_fkey(id, name), opponent_crew:crews!battles_opponent_crew_id_fkey(id, name), gym:gyms!battles_gym_id_fkey(id, name, branch)';

// 팀 구성 읽기 — team_configs 우선, 없으면 레거시 team_a_name/team_b_name 사용.
export function resolveTeamConfigs(b: Pick<Battle, 'team_configs' | 'team_a_name' | 'team_b_name'>): { key: string; name: string }[] {
  if (b.team_configs && b.team_configs.length > 0) return b.team_configs;
  return [
    { key: 'a', name: b.team_a_name ?? 'A팀' },
    { key: 'b', name: b.team_b_name ?? 'B팀' },
  ];
}

// 호스트가 수동으로 status 를 바꿈. 날짜는 기록용이라 자동 전환 없음.
export function effectiveStatus(b: Battle): BattleStatus {
  return b.status;
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
  team: TeamSide | null;
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
          'user_id, joined_at, team, user:profiles!battle_participants_user_id_fkey(id, username, display_name, avatar_url, featured_badge_key)',
        )
        .eq('battle_id', battleId!)
        .order('joined_at', { ascending: true });
      if (error) throw new Error(error.message);
      // crew_id 는 별도 조회 (어느 크루 멤버인지)
      const rows = (data ?? []) as Array<{
        user_id: string;
        joined_at: string;
        team: TeamSide | null;
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
  team: TeamSide | null;
  score: number;
  send_count: number;
  color_sends: { color: string; count: number }[];   // 완등 색깔별 카운트 (desc)
};

export type TeamTotal = { team: TeamSide; name: string; score: number; send_count: number };

export type BattleRanking = {
  individuals: BattleScoreEntry[];   // 점수 내림차순
  crewTotals: { crew_id: string; crew_name: string; score: number; send_count: number }[];
  teamTotals: TeamTotal[];           // crew_internal_team 일 때 채워짐
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
          'user_id, team, user:profiles!battle_participants_user_id_fkey(id, username, display_name, avatar_url, featured_badge_key)',
        )
        .eq('battle_id', battleId!);
      if (pErr) throw new Error(pErr.message);
      const participants = (pRows ?? []) as Array<{
        user_id: string;
        team: TeamSide | null;
        user: BattleScoreEntry | null;
      }>;
      if (participants.length === 0) {
        return { individuals: [], crewTotals: emptyCrewTotals(battle), teamTotals: emptyTeamTotals(battle) };
      }
      const userIds = participants.map((p) => p.user_id);
      const userToTeam = new Map<string, TeamSide | null>();
      for (const p of participants) userToTeam.set(p.user_id, p.team);

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
          team: p.team,
          score: 0,
          send_count: 0,
          color_sends: [],
        });
      }
      // 사용자별 색깔 카운트 누적용 — 마지막에 array 로 직렬화.
      const colorCountByUser = new Map<string, Map<string, number>>();

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

        // 점수 누적 — 우선순위: battle.color_grades(host, 직접 점수) > felt_grade × scoring_rules > crowd × scoring_rules
        const cgMap = colorGradesMap(battle.color_grades);
        for (const a of (attempts ?? []) as Array<{
          session_id: string;
          result: string;
          felt_grade: string | null;
          problem: { color: string | null } | null;
        }>) {
          if (!SEND_RESULTS.has(a.result)) continue;
          const color = a.problem?.color ?? null;
          const uid = sessionToUser.get(a.session_id);
          if (!uid) continue;
          const entry = scoreMap.get(uid);
          if (!entry) continue;
          entry.send_count += 1;
          if (color) {
            if (!colorCountByUser.has(uid)) colorCountByUser.set(uid, new Map());
            const m = colorCountByUser.get(uid)!;
            m.set(color, (m.get(color) ?? 0) + 1);
          }
          // 1순위: 호스트가 정한 직접 점수
          if (color && cgMap[color] != null) {
            entry.score += cgMap[color];
            continue;
          }
          // 2/3순위: V grade → scoring_rules
          let v: number | null = vGradeToNum(a.felt_grade);
          if (v == null && color) v = crowdVMap.get(color) ?? null;
          if (v != null) entry.score += vToScore(v, battle.scoring_rules);
        }
      }

      // 색깔별 카운트 직렬화
      for (const [uid, m] of colorCountByUser) {
        const entry = scoreMap.get(uid);
        if (!entry) continue;
        entry.color_sends = Array.from(m.entries())
          .map(([color, count]) => ({ color, count }))
          .sort((x, y) => y.count - x.count);
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

      // 팀별 합산 (crew_internal_team 일 때만 의미 있음). team_configs 우선.
      const configs = resolveTeamConfigs(battle);
      const teamMap: Record<string, { score: number; send_count: number }> = {};
      for (const t of configs) teamMap[t.key] = { score: 0, send_count: 0 };
      for (const p of individuals) {
        if (p.team && teamMap[p.team]) {
          teamMap[p.team].score += p.score;
          teamMap[p.team].send_count += p.send_count;
        }
      }
      const teamTotals: TeamTotal[] = configs.map((t) => ({
        team: t.key,
        name: t.name,
        ...teamMap[t.key],
      }));

      return { individuals, crewTotals, teamTotals };
    },
  });
}

// 내가 이 대결에서 색깔별로 몇 개 완등했는지 — 카드/상세 둘 다에서 씀.
// 대결 날짜 + 대결 암장 + 내 세션 → 완등 attempts 를 color 별로 묶음.
export type MyBattleColorSend = { color: string; count: number };
export type MyBattleSends = {
  total: number;       // 총 완등 개수
  byColor: MyBattleColorSend[];  // 개수 내림차순
};

export function useMyBattleSends(battleId: string | undefined) {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['battles', 'my-sends', battleId, uid] as const,
    enabled: !!battleId && !!uid,
    queryFn: async (): Promise<MyBattleSends> => {
      // 1) battle 로드
      const { data: bRow, error: bErr } = await supabase
        .from('battles')
        .select('id, gym_id, battle_date')
        .eq('id', battleId!)
        .single();
      if (bErr) throw new Error(bErr.message);
      const b = bRow as { id: string; gym_id: string; battle_date: string };

      // 2) 내 세션 (대결 날짜 + 암장)
      const { data: sessions, error: sErr } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', uid!)
        .eq('gym_id', b.gym_id)
        .eq('session_date', b.battle_date);
      if (sErr) throw new Error(sErr.message);
      const sIds = ((sessions ?? []) as Array<{ id: string }>).map((r) => r.id);
      if (sIds.length === 0) return { total: 0, byColor: [] };

      // 3) 해당 세션의 완등 attempts + 색깔
      const { data: attempts, error: aErr } = await supabase
        .from('attempts')
        .select('result, problem:problems(color)')
        .in('session_id', sIds);
      if (aErr) throw new Error(aErr.message);

      const colorCounts = new Map<string, number>();
      let total = 0;
      for (const a of (attempts ?? []) as Array<{
        result: string;
        problem: { color: string | null } | null;
      }>) {
        if (!SEND_RESULTS.has(a.result)) continue;
        total += 1;
        const col = a.problem?.color;
        if (!col) continue;
        colorCounts.set(col, (colorCounts.get(col) ?? 0) + 1);
      }
      const byColor: MyBattleColorSend[] = Array.from(colorCounts.entries())
        .map(([color, count]) => ({ color, count }))
        .sort((x, y) => y.count - x.count);
      return { total, byColor };
    },
  });
}

function emptyTeamTotals(battle: Battle): TeamTotal[] {
  return resolveTeamConfigs(battle).map((t) => ({
    team: t.key,
    name: t.name,
    score: 0,
    send_count: 0,
  }));
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
  colorGrades: ColorGrades;         // {"red": 5, "yellow": 3.5, ...}
  scoreVisibility: ScoreVisibility;
  // crew_internal_team 일 때 — 팀 구성 + 초기 멤버 배정 (옵션, 나중에 추가 가능)
  teamConfigs?: { key: string; name: string; memberIds: string[] }[];
};

export function useCreateBattle() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (args: CreateBattleArgs): Promise<{ id: string }> => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const teamConfigs = args.teamConfigs ?? [];
      const teamConfigsJson = teamConfigs.map((t) => ({ key: t.key, name: t.name }));
      const { data, error } = await supabase
        .from('battles')
        .insert({
          battle_type: args.battleType,
          title: args.title.trim(),
          crew_id: args.crewId,
          opponent_crew_id: args.opponentCrewId,
          gym_id: args.gymId,
          battle_date: args.battleDate,
          status: 'scheduled',
          scoring_rules: args.scoringRules,
          color_grades: args.colorGrades,
          score_visibility: args.scoreVisibility,
          // 레거시 호환 — 첫 2팀만 team_a_name/team_b_name 에도 채움.
          team_a_name: teamConfigs[0]?.name ?? null,
          team_b_name: teamConfigs[1]?.name ?? null,
          team_configs: teamConfigsJson,
          created_by: userId,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      const battleId = (data as { id: string }).id;

      // 초기 팀 배정 (있으면). 미배정 멤버는 나중에 추가 가능.
      const participants: { battle_id: string; user_id: string; team: string }[] = [];
      for (const t of teamConfigs) {
        for (const uid of t.memberIds) {
          participants.push({ battle_id: battleId, user_id: uid, team: t.key });
        }
      }
      if (participants.length > 0) {
        const { error: pErr } = await supabase
          .from('battle_participants')
          .insert(participants);
        if (pErr) throw new Error(pErr.message);
      }
      return { id: battleId };
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

// 호스트가 수동으로 시작/종료
export function useStartBattle() {
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

export function useEndBattle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (battleId: string) => {
      const { error } = await supabase
        .from('battles')
        .update({ status: 'ended' })
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
    mutationFn: async (args: { battleId: string; team?: TeamSide }) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('battle_participants')
        .insert({
          battle_id: args.battleId,
          user_id: userId,
          team: args.team ?? null,
        });
      if (error) {
        if (error.code === '23505') return; // 이미 참가
        throw new Error(error.message);
      }
    },
    onSuccess: (_d, args) => {
      queryClient.invalidateQueries({ queryKey: ['battles', 'participants', args.battleId] });
      queryClient.invalidateQueries({ queryKey: ['battles', 'ranking', args.battleId] });
    },
  });
}

// 팀 변경 (crew_internal_team)
export function useChangeBattleTeam() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (args: { battleId: string; team: TeamSide }) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('battle_participants')
        .update({ team: args.team })
        .eq('battle_id', args.battleId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, args) => {
      queryClient.invalidateQueries({ queryKey: ['battles', 'participants', args.battleId] });
      queryClient.invalidateQueries({ queryKey: ['battles', 'ranking', args.battleId] });
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

// ── 내가 참가한 대결 전체 ─────────────────────────────────────
// 홈 D-day 섹션 + 프로필 이력에서 사용.
export function useMyBattles() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['battles', 'my-battles', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<Battle[]> => {
      const { data: pRows, error: pErr } = await supabase
        .from('battle_participants')
        .select('battle_id')
        .eq('user_id', userId!);
      if (pErr) throw new Error(pErr.message);
      const battleIds = ((pRows ?? []) as Array<{ battle_id: string }>).map((r) => r.battle_id);
      if (battleIds.length === 0) return [];
      const { data, error } = await supabase
        .from('battles')
        .select(BATTLE_COLS)
        .in('id', battleIds)
        .order('battle_date', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Battle[];
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
