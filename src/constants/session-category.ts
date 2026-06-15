/**
 * 세션/계획 카테고리 — 그 날 운동의 성격.
 * 개별 시도의 climbing_type (boulder/lead/board) 과는 다른 차원.
 */
import type { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export type SessionCategory = 'boulder' | 'lead' | 'board' | 'endurance' | 'strength';

export type CategoryMeta = {
  key: SessionCategory;
  label: string;
  /** 작은 칩용 — Feather */
  icon: React.ComponentProps<typeof Feather>['name'];
  /** 셀용 큰 표현 아이콘 — MaterialCommunityIcons (선명한 표현) */
  cellIcon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  /** 진한 글자/아이콘 색 */
  fg: string;
  /** 옅은 배경 색 (칩) */
  bg: string;
};

export const SESSION_CATEGORIES: CategoryMeta[] = [
  { key: 'boulder',   label: '볼더',   icon: 'box',         cellIcon: 'shape-square-rounded-plus', fg: '#0e7490', bg: '#cffafe' },
  { key: 'lead',      label: '리드',   icon: 'trending-up', cellIcon: 'rope',                       fg: '#c2410c', bg: '#ffedd5' },
  { key: 'board',     label: '보드',   icon: 'grid',        cellIcon: 'grid',                       fg: '#6d28d9', bg: '#ede9fe' },
  { key: 'endurance', label: '지구력', icon: 'activity',    cellIcon: 'run-fast',                   fg: '#15803d', bg: '#dcfce7' },
  { key: 'strength',  label: '근력',   icon: 'zap',         cellIcon: 'arm-flex',                   fg: '#b45309', bg: '#fef3c7' },
];

export const SESSION_CATEGORIES_BY_KEY: Record<SessionCategory, CategoryMeta> =
  SESSION_CATEGORIES.reduce(
    (acc, c) => {
      acc[c.key] = c;
      return acc;
    },
    {} as Record<SessionCategory, CategoryMeta>,
  );
