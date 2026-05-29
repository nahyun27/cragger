/**
 * 뱃지 판정 + 신규 획득 INSERT.
 *
 * 사용자 데이터 (attempts/sessions/posts/comments/poll_votes/crew_members/
 * meetup_participants/battles) 를 한 번에 조회 → BADGES 정의를 순회하며 판정 →
 * 이미 user_badges 에 있는 건 제외 → 신규만 INSERT.
 *
 * 사용처:
 *   - 마이페이지 진입 시 한 번 (useBadgeCheck mutation)
 *   - 주요 액션 (세션 저장, 글 작성, 크루 가입 등) onSuccess 콜백
 *
 * RLS:
 *   - ub_insert_self → 본인만 본인 행 INSERT 가능
 *   - SELECT 는 all (남 프로필에서도 뱃지 보임)
 */

import { BADGES, BADGES_BY_KEY, type BadgeDef } from '@/constants/badges';
import { supabase } from '@/lib/supabase';

const SEND_RESULTS = new Set(['send', 'onsight', 'flash', 'redpoint']);

function vGradeToNum(g: string | null): number | null {
  if (!g) return null;
  const m = /^V(\d+)([+-])?$/.exec(g.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return m[2] === '+' ? n + 0.5 : m[2] === '-' ? n - 0.5 : n;
}

function leadGradeToNum(g: string | null): number | null {
  if (!g) return null;
  const m = /^5\.(\d+)([a-d])?$/.exec(g.trim());
  if (!m) return null;
  const main = parseInt(m[1], 10);
  const sub = m[2] ? ('abcd'.indexOf(m[2]) + 1) * 0.2 : 0;
  return main + sub;
}

function isoWeekKey(d: Date): string {
  // 'YYYY-WW' (ISO week). 토요일/일요일 다르게 처리 — 간단히 월요일 기준.
  const t = new Date(d.valueOf());
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const week1 = new Date(t.getFullYear(), 0, 4);
  const wk = 1 + Math.round(((t.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${t.getFullYear()}-${String(wk).padStart(2, '0')}`;
}

function maxConsecutiveWeeks(weekKeys: Set<string>): number {
  // 'YYYY-WW' 키를 (year*53 + week) 정수로 변환 후 연속 길이 계산.
  const nums = Array.from(weekKeys)
    .map((k) => {
      const [y, w] = k.split('-').map((x) => parseInt(x, 10));
      return y * 53 + w;
    })
    .sort((a, b) => a - b);
  if (nums.length === 0) return 0;
  let best = 1;
  let cur = 1;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] - nums[i - 1] === 1) {
      cur += 1;
      if (cur > best) best = cur;
    } else if (nums[i] !== nums[i - 1]) {
      cur = 1;
    }
  }
  return best;
}

type UserBadgeData = {
  totalSends: number;
  totalSessions: number;
  maxV: number;
  maxLead: number;
  // 색깔별 카운트
  colorSendCounts: Map<string, number>;
  // 한 세션에 색깔 수 max
  maxColorsInOneSession: number;
  // 소셜
  hasPost: boolean;
  hasComment: boolean;
  hasPollVote: boolean;
  crewJoined: boolean;
  crewCreated: boolean;
  hasMeetupParticipation: boolean;
  hasBattleParticipation: boolean;
  // 꾸준함
  maxStreakWeeks: number;
};

async function fetchUserData(userId: string): Promise<UserBadgeData> {
  // sessions
  const sessionsP = supabase
    .from('sessions')
    .select('id, session_date')
    .eq('user_id', userId);
  // 소셜 카운트
  const postsP = supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId);
  const commentsP = supabase
    .from('post_comments')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId);
  const pollVotesP = supabase
    .from('poll_votes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  const crewMembershipsP = supabase
    .from('crew_members')
    .select('role')
    .eq('user_id', userId);
  const meetupsP = supabase
    .from('meetup_participants')
    .select('post_id', { count: 'exact', head: true })
    .eq('user_id', userId);
  const battlesP = supabase
    .from('battles')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId);

  const [sessionsR, postsR, commentsR, pollVotesR, crewR, meetupsR, battlesR] = await Promise.all([
    sessionsP, postsP, commentsP, pollVotesP, crewMembershipsP, meetupsP, battlesP,
  ]);

  const sessions = (sessionsR.data ?? []) as Array<{ id: string; session_date: string }>;
  const sessionIds = sessions.map((s) => s.id);

  // attempts (with problem.color via join) — 본인 세션의 시도만
  let attempts: Array<{
    session_id: string;
    result: string;
    climbing_type: string;
    felt_grade: string | null;
    problem: { color: string | null; route_grade: string | null } | null;
  }> = [];
  if (sessionIds.length > 0) {
    const { data: aData } = await supabase
      .from('attempts')
      .select('session_id, result, climbing_type, felt_grade, problem:problems(color, route_grade)')
      .in('session_id', sessionIds);
    attempts = (aData ?? []) as typeof attempts;
  }

  // 집계
  let totalSends = 0;
  let maxV = -1;
  let maxLead = -1;
  const colorSendCounts = new Map<string, number>();
  const colorsPerSession = new Map<string, Set<string>>();

  for (const a of attempts) {
    if (!SEND_RESULTS.has(a.result)) continue;
    totalSends += 1;
    const v = vGradeToNum(a.felt_grade);
    if (v != null && v > maxV) maxV = v;
    if (a.climbing_type === 'lead') {
      const l = leadGradeToNum(a.problem?.route_grade ?? null);
      if (l != null && l > maxLead) maxLead = l;
    }
    const color = a.problem?.color;
    if (color) {
      colorSendCounts.set(color, (colorSendCounts.get(color) ?? 0) + 1);
      const set = colorsPerSession.get(a.session_id) ?? new Set();
      set.add(color);
      colorsPerSession.set(a.session_id, set);
    }
  }

  let maxColorsInOneSession = 0;
  for (const set of colorsPerSession.values()) {
    if (set.size > maxColorsInOneSession) maxColorsInOneSession = set.size;
  }

  // 꾸준함 — 세션 날짜의 주(week) 키
  const weekKeys = new Set<string>();
  for (const s of sessions) {
    weekKeys.add(isoWeekKey(new Date(`${s.session_date}T00:00:00`)));
  }
  const maxStreakWeeks = maxConsecutiveWeeks(weekKeys);

  const crewRows = (crewR.data ?? []) as Array<{ role: string }>;

  return {
    totalSends,
    totalSessions: sessions.length,
    maxV,
    maxLead,
    colorSendCounts,
    maxColorsInOneSession,
    hasPost: (postsR.count ?? 0) > 0,
    hasComment: (commentsR.count ?? 0) > 0,
    hasPollVote: (pollVotesR.count ?? 0) > 0,
    crewJoined: crewRows.length > 0,
    crewCreated: crewRows.some((r) => r.role === 'owner'),
    hasMeetupParticipation: (meetupsR.count ?? 0) > 0,
    hasBattleParticipation: (battlesR.count ?? 0) > 0,
    maxStreakWeeks,
  };
}

function checkBadge(key: string, d: UserBadgeData): boolean {
  switch (key) {
    // 기록
    case 'first_send':    return d.totalSends >= 1;
    case 'send_10':       return d.totalSends >= 10;
    case 'send_50':       return d.totalSends >= 50;
    case 'send_100':      return d.totalSends >= 100;
    case 'send_500':      return d.totalSends >= 500;
    case 'send_1000':     return d.totalSends >= 1000;
    case 'session_10':    return d.totalSessions >= 10;
    case 'session_50':    return d.totalSessions >= 50;
    case 'session_100':   return d.totalSessions >= 100;
    // 그레이드 (볼더링 felt_grade)
    case 'first_v3':      return d.maxV >= 3;
    case 'first_v5':      return d.maxV >= 5;
    case 'first_v7':      return d.maxV >= 7;
    case 'first_v9':      return d.maxV >= 9;
    // 리드 (route_grade)
    case 'first_lead_510':return d.maxLead >= 10;
    case 'first_lead_511':return d.maxLead >= 11;
    case 'first_lead_512':return d.maxLead >= 12;
    // 색깔
    case 'rainbow':       return d.maxColorsInOneSession >= 5;
    case 'color_master':  return Array.from(d.colorSendCounts.values()).some((n) => n >= 20);
    // 소셜
    case 'first_post':    return d.hasPost;
    case 'first_comment': return d.hasComment;
    case 'first_poll_vote': return d.hasPollVote;
    case 'crew_join':     return d.crewJoined;
    case 'crew_create':   return d.crewCreated;
    case 'first_meetup':  return d.hasMeetupParticipation;
    case 'first_battle':  return d.hasBattleParticipation;
    // 꾸준함
    case 'streak_3':      return d.maxStreakWeeks >= 3;
    case 'streak_7':      return d.maxStreakWeeks >= 7;
    case 'streak_30':     return d.maxStreakWeeks >= 30;
    default:              return false;
  }
}

export type BadgeSyncResult = {
  newlyEarned: BadgeDef[];
};

export async function syncBadges(userId: string): Promise<BadgeSyncResult> {
  // 1) 사용자 데이터 수집
  const data = await fetchUserData(userId);

  // 2) 모든 뱃지 평가
  const earnedKeys = BADGES.filter((b) => checkBadge(b.key, data)).map((b) => b.key);

  // 3) 이미 획득한 것 조회
  const { data: existing, error: exErr } = await supabase
    .from('user_badges')
    .select('badge_key')
    .eq('user_id', userId);
  if (exErr) throw new Error(exErr.message);
  const existingSet = new Set(((existing ?? []) as Array<{ badge_key: string }>).map((r) => r.badge_key));

  // 4) 신규만 INSERT
  const newKeys = earnedKeys.filter((k) => !existingSet.has(k));
  if (newKeys.length === 0) return { newlyEarned: [] };

  const rows = newKeys.map((k) => ({ user_id: userId, badge_key: k }));
  const { error: insErr } = await supabase.from('user_badges').insert(rows);
  if (insErr) throw new Error(insErr.message);

  return { newlyEarned: newKeys.map((k) => BADGES_BY_KEY[k]).filter(Boolean) };
}
