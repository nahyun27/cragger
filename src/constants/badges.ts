// 뱃지 정의 (코드 상수, DB 마스터 없음).
// 카테고리: 기록(record) / 그레이드(grade) / 소셜(social) / 꾸준함(streak)
// 정의 변경 시 기존 user_badges 행은 그대로 — badge_key 만 일치하면 카드에 보임.

export type BadgeCategory = 'record' | 'grade' | 'social' | 'streak';

export type BadgeDef = {
  key: string;
  category: BadgeCategory;
  name: string;
  hint: string;        // 미획득 시 표시되는 조건 힌트
  icon: string;        // emoji 1자
  color: string;       // accent (라이트/다크 공통 — 정체성)
  bg: string;          // accent 배경
};

export const BADGES: BadgeDef[] = [
  // ── 기록 (record) ─────────────────────────────────────────
  { key: 'first_send',    category: 'record', name: '첫 완등',     hint: '완등 1개', icon: 'target', color: '#92400e', bg: '#fef3c7' },
  { key: 'send_100',      category: 'record', name: '완등 100',    hint: '완등 100개', icon: 'medal-100', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'send_500',      category: 'record', name: '완등 500',    hint: '완등 500개', icon: 'medal-500', color: '#ca8a04', bg: '#fef9c3' },
  { key: 'send_1000',     category: 'record', name: '완등 1000',   hint: '완등 1,000개', icon: 'medal-1000', color: '#0e7490', bg: '#cffafe' },
  { key: 'session_10',    category: 'record', name: '세션 10',     hint: '세션 10회', icon: 'session-10', color: '#2563eb', bg: '#dbeafe' },
  { key: 'session_50',    category: 'record', name: '세션 50',     hint: '세션 50회', icon: 'session-50', color: '#1d4ed8', bg: '#bfdbfe' },
  { key: 'session_100',   category: 'record', name: '세션 100',    hint: '세션 100회', icon: 'session-100', color: '#1e40af', bg: '#93c5fd' },
  { key: 'rainbow',       category: 'record', name: '레인보우',    hint: '한 세션에 5색 이상 완등', icon: 'rainbow', color: '#0891b2', bg: '#cffafe' },
  { key: 'color_master',  category: 'record', name: '컬러 마스터', hint: '한 색깔 20 완등', icon: 'palette', color: '#7c3aed', bg: '#ede9fe' },

  // ── 그레이드 (grade) ───────────────────────────────────────
  { key: 'first_v0',      category: 'grade',  name: 'V0 클라이머', hint: 'V0 첫 완등', icon: 'V0', color: '#ef4444', bg: '#fef2f2' },
  { key: 'first_v1',      category: 'grade',  name: 'V1 클라이머', hint: 'V1 첫 완등', icon: 'V1', color: '#f97316', bg: '#fff7ed' },
  { key: 'first_v2',      category: 'grade',  name: 'V2 클라이머', hint: 'V2 첫 완등', icon: 'V2', color: '#eab308', bg: '#fefce8' },
  { key: 'first_v3',      category: 'grade',  name: 'V3 클라이머', hint: 'V3 첫 완등', icon: 'V3', color: '#22c55e', bg: '#f0fdf4' },
  { key: 'first_v4',      category: 'grade',  name: 'V4 클라이머', hint: 'V4 첫 완등', icon: 'V4', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'first_v5',      category: 'grade',  name: 'V5 클라이머', hint: 'V5 첫 완등', icon: 'V5', color: '#4f46e5', bg: '#e0e7ff' },
  { key: 'first_v6',      category: 'grade',  name: 'V6 클라이머', hint: 'V6 첫 완등', icon: 'V6', color: '#a855f7', bg: '#faf5ff' },
  { key: 'first_v7',      category: 'grade',  name: 'V7 클라이머', hint: 'V7 첫 완등', icon: 'V7', color: '#92400e', bg: '#fef3c7' },
  { key: 'first_v8',      category: 'grade',  name: 'V8 클라이머', hint: 'V8 첫 완등', icon: 'V8', color: '#64748b', bg: '#f8fafc' },
  { key: 'first_v9',      category: 'grade',  name: 'V9 클라이머', hint: 'V9 첫 완등', icon: 'V9', color: '#0f172a', bg: '#f1f5f9' },
  { key: 'first_lead_510',category: 'grade',  name: '5.10 돌파',   hint: '5.10 첫 완등', icon: '5.10', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'first_lead_511',category: 'grade',  name: '5.11 돌파',   hint: '5.11 첫 완등', icon: '5.11', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'first_lead_512',category: 'grade',  name: '5.12 돌파',   hint: '5.12 첫 완등', icon: '5.12', color: '#7c3aed', bg: '#ede9fe' },

  // ── 소셜 (social) ─────────────────────────────────────────
  { key: 'first_post',    category: 'social', name: '첫 글',       hint: '첫 게시글 작성', icon: 'edit-2', color: '#16a34a', bg: '#dcfce7' },
  { key: 'first_comment', category: 'social', name: '첫 댓글',     hint: '첫 댓글 작성', icon: 'message-circle', color: '#0891b2', bg: '#cffafe' },
  { key: 'first_poll_vote',category:'social', name: '첫 투표',     hint: '첫 투표 참여', icon: 'pie-chart', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'crew_join',     category: 'social', name: '크루 가입',   hint: '크루 가입', icon: 'users', color: '#06b6d4', bg: '#cffafe' },
  { key: 'crew_create',   category: 'social', name: '크루장',      hint: '크루 만들기', icon: 'flag', color: '#d97706', bg: '#fef3c7' },
  { key: 'first_meetup',  category: 'social', name: '첫 모임',     hint: '첫 모임 참여', icon: 'coffee', color: '#dc2626', bg: '#fee2e2' },
  { key: 'first_battle',  category: 'social', name: '첫 대결',     hint: '첫 대결 참여', icon: 'battle-shield', color: '#7c3aed', bg: '#ede9fe' },

  // ── 꾸준함 (streak) ───────────────────────────────────────
  { key: 'streak_3',      category: 'streak', name: '3주 연속',    hint: '3주 연속 등반', icon: 'streak-3', color: '#16a34a', bg: '#dcfce7' },
  { key: 'streak_7',      category: 'streak', name: '7주 연속',    hint: '7주 연속 등반', icon: 'streak-7', color: '#f59e0b', bg: '#fef3c7' },
  { key: 'streak_30',     category: 'streak', name: '30주 연속',   hint: '30주 연속 등반', icon: 'streak-30', color: '#dc2626', bg: '#fee2e2' },
];

export const BADGES_BY_KEY: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.key, b]),
);

export const BADGE_CATEGORY_LABEL: Record<BadgeCategory, string> = {
  record: '기록',
  grade:  '그레이드',
  social: '소셜',
  streak: '꾸준함',
};
