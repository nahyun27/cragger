export const CLIMB_COLOR_HEX: Record<string, string> = {
  red: '#E24B4A',
  yellow: '#EF9F27',
  green: '#639922',
  blue: '#378ADD',
  purple: '#7F77DD',
  pink: '#D4537E',
  orange: '#F97316',
  black: '#1a1a1a',
  white: '#f7f7f7',
  gray: '#6B7280',
};

export const CLIMB_COLOR_LABEL: Record<string, string> = {
  red: '빨강',
  yellow: '노랑',
  green: '초록',
  blue: '파랑',
  purple: '보라',
  pink: '분홍',
  orange: '주황',
  black: '검정',
  white: '흰색',
  gray: '회색',
};

export const COLOR_VOTE_THRESHOLD = 10;

export function resolveColorHex(color: string, colorHex?: string | null): string {
  if (colorHex && colorHex.trim()) return colorHex;
  return CLIMB_COLOR_HEX[color.toLowerCase()] ?? '#9CA3AF';
}

export function resolveColorLabel(color: string): string {
  return CLIMB_COLOR_LABEL[color.toLowerCase()] ?? color;
}
