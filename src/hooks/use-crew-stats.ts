import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type CrewHomeStats = {
  activityRate: number;
  avgVGrade: string | null;
  meetupCountLastMonth: number;
};

export type CrewActiveMember = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'member';
  sessionCount: number;  // 활동률 — 최근 30일 세션 수
};

export type GradeBucket = {
  vGrade: string;
  vNum: number;
  count: number;
};

export type CrewGradeDistribution = {
  buckets: GradeBucket[];
  myVNum: number | null;
};

const SEND_RESULTS = new Set(['send', 'onsight', 'flash', 'redpoint']);

function vGradeToNum(g: string): number | null {
  const m = /^V(\d+)([+-])?$/.exec(g.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const suffix = m[2];
  if (suffix === '+') return n + 0.5;
  if (suffix === '-') return n - 0.5;
  return n;
}

function numToVGrade(n: number): string {
  if (n % 1 === 0) return `V${n}`;
  if (n % 1 === 0.5) return `V${Math.floor(n)}+`;
  return `V${Math.round(n)}`;
}

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function lastMonthRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m = now.getMonth() === 0 ? 12 : now.getMonth();
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  return { from, to };
}

export function useCrewHomeStats(crewId: string | undefined) {
  return useQuery({
    queryKey: ['crew-home-stats', crewId] as const,
    enabled: !!crewId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CrewHomeStats> => {
      // 1) Members
      const { data: members, error: mErr } = await supabase
        .from('crew_members')
        .select('user_id')
        .eq('crew_id', crewId!);
      if (mErr) throw new Error(mErr.message);
      const memberIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
      if (memberIds.length === 0) {
        return { activityRate: 0, avgVGrade: null, meetupCountLastMonth: 0 };
      }

      // 2) Sessions last 30 days (for activity rate)
      const cutoff = thirtyDaysAgo();
      const { data: sessions, error: sErr } = await supabase
        .from('sessions')
        .select('id, user_id')
        .in('user_id', memberIds)
        .gte('session_date', cutoff);
      if (sErr) throw new Error(sErr.message);
      const activeUsers = new Set((sessions ?? []).map((s: { user_id: string }) => s.user_id));
      const activityRate = Math.round((activeUsers.size / memberIds.length) * 100);

      // 3) Attempts for grade average (sends only)
      const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id);
      let avgVGrade: string | null = null;
      if (sessionIds.length > 0) {
        const { data: attempts, error: aErr } = await supabase
          .from('attempts')
          .select('felt_grade, result')
          .in('session_id', sessionIds);
        if (aErr) throw new Error(aErr.message);
        let sum = 0;
        let cnt = 0;
        for (const a of attempts ?? []) {
          if (!SEND_RESULTS.has(a.result as string)) continue;
          const fg = a.felt_grade as string | null;
          if (!fg) continue;
          const n = vGradeToNum(fg);
          if (n != null) {
            sum += n;
            cnt += 1;
          }
        }
        if (cnt > 0) avgVGrade = numToVGrade(Math.round(sum / cnt));
      }

      // 4) Meetups last month
      const { from, to } = lastMonthRange();
      const { count: meetupCount, error: pErr } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('crew_id', crewId!)
        .eq('post_type', 'meetup')
        .gte('meetup_at', from)
        .lt('meetup_at', to);
      if (pErr) throw new Error(pErr.message);

      return {
        activityRate,
        avgVGrade,
        meetupCountLastMonth: meetupCount ?? 0,
      };
    },
  });
}

export function useCrewGradeDistribution(crewId: string | undefined) {
  const { session: authSession } = useAuth();
  const meId = authSession?.user.id;
  return useQuery({
    queryKey: ['crew-grade-dist', crewId] as const,
    enabled: !!crewId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CrewGradeDistribution> => {
      // 1) Members
      const { data: members, error: mErr } = await supabase
        .from('crew_members')
        .select('user_id')
        .eq('crew_id', crewId!);
      if (mErr) throw new Error(mErr.message);
      const memberIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
      if (memberIds.length === 0) return { buckets: [], myVNum: null };

      // 2) All sessions for members
      const { data: sessions, error: sErr } = await supabase
        .from('sessions')
        .select('id, user_id')
        .in('user_id', memberIds);
      if (sErr) throw new Error(sErr.message);
      const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id);
      const sessionToUser = new Map<string, string>();
      for (const s of (sessions ?? []) as Array<{ id: string; user_id: string }>) sessionToUser.set(s.id, s.user_id);

      if (sessionIds.length === 0) return { buckets: [], myVNum: null };

      // 3) Attempts (sends only) + problem.color/gym_id for crowd-V fallback
      const { data: attempts, error: aErr } = await supabase
        .from('attempts')
        .select('session_id, felt_grade, result, problem:problems(color, gym_id)')
        .in('session_id', sessionIds);
      if (aErr) throw new Error(aErr.message);

      type AttemptRow = {
        session_id: string;
        felt_grade: string | null;
        result: string;
        problem: { color: string | null; gym_id: string | null } | null;
      };

      // crowd V그레이드 lookup — (gym_id, color) → avg_v_grade
      const gymColorPairs = new Set<string>();
      for (const a of (attempts ?? []) as AttemptRow[]) {
        if (a.problem?.gym_id && a.problem.color) {
          gymColorPairs.add(`${a.problem.gym_id}:${a.problem.color}`);
        }
      }
      const crowdVMap = new Map<string, number>();
      if (gymColorPairs.size > 0) {
        const gymIds = Array.from(new Set(Array.from(gymColorPairs).map((p) => p.split(':')[0])));
        const { data: statsRows } = await supabase
          .from('gym_color_grade_stats')
          .select('gym_id, color, avg_v_grade')
          .in('gym_id', gymIds);
        for (const r of (statsRows ?? []) as Array<{
          gym_id: string; color: string; avg_v_grade: number | null;
        }>) {
          if (r.avg_v_grade != null) crowdVMap.set(`${r.gym_id}:${r.color}`, r.avg_v_grade);
        }
      }

      // Per-member max V — felt_grade 우선, 없으면 crowd 평균
      const memberMax = new Map<string, number>();
      for (const a of (attempts ?? []) as AttemptRow[]) {
        if (!SEND_RESULTS.has(a.result)) continue;
        let n = vGradeToNum(a.felt_grade ?? '');
        if (n == null && a.problem?.gym_id && a.problem.color) {
          n = crowdVMap.get(`${a.problem.gym_id}:${a.problem.color}`) ?? null;
        }
        if (n == null) continue;
        const uid = sessionToUser.get(a.session_id);
        if (!uid) continue;
        const prev = memberMax.get(uid);
        if (prev == null || n > prev) memberMax.set(uid, n);
      }

      // Grade buckets — count members per integer V grade
      const bucketMap = new Map<number, number>();
      for (const [, maxV] of memberMax) {
        const rounded = Math.round(maxV);
        bucketMap.set(rounded, (bucketMap.get(rounded) ?? 0) + 1);
      }
      const buckets: GradeBucket[] = Array.from(bucketMap.entries())
        .map(([vNum, count]) => ({ vGrade: `V${vNum}`, vNum, count }))
        .sort((a, b) => a.vNum - b.vNum);

      const myVNum = meId ? (memberMax.get(meId) ?? null) : null;

      return { buckets, myVNum: myVNum != null ? Math.round(myVNum) : null };
    },
  });
}

// ── 활동률 기반 멤버 순위 (홈 탭 멤버 가로 스크롤용) ─────────────
// 크루장 맨 앞, 그 외 최근 30일 세션 수 내림차순.
export function useCrewActiveMembers(crewId: string | undefined) {
  return useQuery({
    queryKey: ['crew-active-members', crewId] as const,
    enabled: !!crewId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CrewActiveMember[]> => {
      // 1) 멤버 + 프로필
      const { data: members, error: mErr } = await supabase
        .from('crew_members')
        .select(
          'user_id, role, user:profiles!crew_members_user_id_fkey(id, username, display_name, avatar_url)',
        )
        .eq('crew_id', crewId!);
      if (mErr) throw new Error(mErr.message);
      const rows = (members ?? []) as Array<{
        user_id: string;
        role: 'owner' | 'admin' | 'member';
        user: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
      }>;
      if (rows.length === 0) return [];

      // 2) 최근 30일 세션 — 멤버별 카운트
      const cutoff = thirtyDaysAgo();
      const userIds = rows.map((r) => r.user_id);
      const { data: sessions, error: sErr } = await supabase
        .from('sessions')
        .select('user_id')
        .in('user_id', userIds)
        .gte('session_date', cutoff);
      if (sErr) throw new Error(sErr.message);
      const sessionCounts = new Map<string, number>();
      for (const s of (sessions ?? []) as Array<{ user_id: string }>) {
        sessionCounts.set(s.user_id, (sessionCounts.get(s.user_id) ?? 0) + 1);
      }

      const list: CrewActiveMember[] = rows
        .filter((r) => r.user != null)
        .map((r) => ({
          user_id: r.user_id,
          username: r.user!.username,
          display_name: r.user!.display_name,
          avatar_url: r.user!.avatar_url,
          role: r.role,
          sessionCount: sessionCounts.get(r.user_id) ?? 0,
        }));

      // 크루장 맨 앞, 그 외 sessionCount 내림차순 → 동률은 username
      list.sort((a, b) => {
        if (a.role === 'owner' && b.role !== 'owner') return -1;
        if (b.role === 'owner' && a.role !== 'owner') return 1;
        if (b.sessionCount !== a.sessionCount) return b.sessionCount - a.sessionCount;
        return a.username.localeCompare(b.username);
      });

      return list;
    },
  });
}
