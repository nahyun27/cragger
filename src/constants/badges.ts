// 뱃지 정의 (코드 상수, DB 마스터 없음).
// 카테고리: 기록(record) / 그레이드(grade) / 색깔(color) / 소셜(social) / 꾸준함(streak)
// 정의 변경 시 기존 user_badges 행은 그대로 — badge_key 만 일치하면 카드에 보임.

export type BadgeCategory = 'record' | 'grade' | 'color' | 'social' | 'streak';

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
  { key: 'first_send',    category: 'record', name: '첫 완등',     hint: '완등 1개', icon: '🎯', color: '#06b6d4', bg: '#cffafe' },
  { key: 'send_10',       category: 'record', name: '완등 10',     hint: '완등 10개', icon: '🔟', color: '#0891b2', bg: '#cffafe' },
  { key: 'send_50',       category: 'record', name: '완등 50',     hint: '완등 50개', icon: '⚡', color: '#0e7490', bg: '#a5f3fc' },
  { key: 'send_100',      category: 'record', name: '완등 100',    hint: '완등 100개', icon: '💯', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'send_500',      category: 'record', name: '완등 500',    hint: '완등 500개', icon: '🏆', color: '#d97706', bg: '#fef3c7' },
  { key: 'send_1000',     category: 'record', name: '완등 1000',   hint: '완등 1,000개', icon: '👑', color: '#b45309', bg: '#fde68a' },
  { key: 'session_10',    category: 'record', name: '세션 10',     hint: '세션 10회', icon: '📅', color: '#2563eb', bg: '#dbeafe' },
  { key: 'session_50',    category: 'record', name: '세션 50',     hint: '세션 50회', icon: '🗓️', color: '#1d4ed8', bg: '#bfdbfe' },
  { key: 'session_100',   category: 'record', name: '세션 100',    hint: '세션 100회', icon: '🔥', color: '#1e40af', bg: '#93c5fd' },

  // ── 그레이드 (grade) ───────────────────────────────────────
  { key: 'first_v3',      category: 'grade',  name: 'V3 돌파',     hint: 'V3 첫 완등', icon: 'V3', color: '#22c55e', bg: '#dcfce7' },
  { key: 'first_v5',      category: 'grade',  name: 'V5 돌파',     hint: 'V5 첫 완등', icon: 'V5', color: '#4f46e5', bg: '#e0e7ff' },
  { key: 'first_v7',      category: 'grade',  name: 'V7 돌파',     hint: 'V7 첫 완등', icon: 'V7', color: '#9333ea', bg: '#f3e8ff' },
  { key: 'first_v9',      category: 'grade',  name: 'V9 돌파',     hint: 'V9 첫 완등', icon: 'V9', color: '#c026d3', bg: '#fae8ff' },
  { key: 'first_lead_510',category: 'grade',  name: '5.10 돌파',   hint: '5.10 첫 완등', icon: '5.10', color: '#ea580c', bg: '#fed7aa' },
  { key: 'first_lead_511',category: 'grade',  name: '5.11 돌파',   hint: '5.11 첫 완등', icon: '5.11', color: '#dc2626', bg: '#fecaca' },
  { key: 'first_lead_512',category: 'grade',  name: '5.12 돌파',   hint: '5.12 첫 완등', icon: '5.12', color: '#991b1b', bg: '#fca5a5' },

  // ── 색깔 (color) ──────────────────────────────────────────
  { key: 'rainbow',       category: 'color',  name: '레인보우',    hint: '한 세션에 5색 이상 완등', icon: '🌈', color: '#0891b2', bg: '#cffafe' },
  { key: 'color_master',  category: 'color',  name: '컬러 마스터', hint: '한 색깔 20 완등', icon: '🎨', color: '#7c3aed', bg: '#ede9fe' },

  // ── 소셜 (social) ─────────────────────────────────────────
  { key: 'first_post',    category: 'social', name: '첫 글',       hint: '첫 게시글 작성', icon: '✍️', color: '#16a34a', bg: '#dcfce7' },
  { key: 'first_comment', category: 'social', name: '첫 댓글',     hint: '첫 댓글 작성', icon: '💬', color: '#0891b2', bg: '#cffafe' },
  { key: 'first_poll_vote',category:'social', name: '첫 투표',     hint: '첫 투표 참여', icon: '🗳️', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'crew_join',     category: 'social', name: '크루 가입',   hint: '크루 가입', icon: '🤝', color: '#06b6d4', bg: '#cffafe' },
  { key: 'crew_create',   category: 'social', name: '크루장',      hint: '크루 만들기', icon: '🏗️', color: '#d97706', bg: '#fef3c7' },
  { key: 'first_meetup',  category: 'social', name: '첫 모임',     hint: '첫 모임 참여', icon: '🎉', color: '#dc2626', bg: '#fee2e2' },
  { key: 'first_battle',  category: 'social', name: '첫 대결',     hint: '첫 대결 참여', icon: '⚔️', color: '#7c3aed', bg: '#ede9fe' },

  // ── 꾸준함 (streak) ───────────────────────────────────────
  { key: 'streak_3',      category: 'streak', name: '3주 연속',    hint: '3주 연속 등반', icon: '🌱', color: '#16a34a', bg: '#dcfce7' },
  { key: 'streak_7',      category: 'streak', name: '7주 연속',    hint: '7주 연속 등반', icon: '🌳', color: '#15803d', bg: '#bbf7d0' },
  { key: 'streak_30',     category: 'streak', name: '30주 연속',   hint: '30주 연속 등반', icon: '🏔️', color: '#166534', bg: '#86efac' },
];

export const BADGES_BY_KEY: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.key, b]),
);

export const BADGE_CATEGORY_LABEL: Record<BadgeCategory, string> = {
  record: '기록',
  grade:  '그레이드',
  color:  '색깔',
  social: '소셜',
  streak: '꾸준함',
};
