import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type CrewHomeStats = {
  activityRate: number;
  avgVGrade: string | null;
  meetupCountLastMonth: number;
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

      // 3) Attempts (sends only, with felt_grade)
      const { data: attempts, error: aErr } = await supabase
        .from('attempts')
        .select('session_id, felt_grade, result')
        .in('session_id', sessionIds);
      if (aErr) throw new Error(aErr.message);

      // Per-member max V
      const memberMax = new Map<string, number>();
      for (const a of attempts ?? []) {
        if (!SEND_RESULTS.has(a.result as string)) continue;
        const fg = a.felt_grade as string | null;
        if (!fg) continue;
        const n = vGradeToNum(fg);
        if (n == null) continue;
        const uid = sessionToUser.get(a.session_id as string);
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
