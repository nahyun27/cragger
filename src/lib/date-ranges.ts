// Date range helpers — YYYY-MM-DD strings, matching the sessions.session_date column.

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const from = ymd(year, month, 1);
  const to = month === 12 ? ymd(year + 1, 1, 1) : ymd(year, month + 1, 1);
  return { from, to };
}

export function yearRange(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year + 1}-01-01` };
}

export function currentMonth(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function currentYear(): number {
  return new Date().getFullYear();
}

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function formatMonth(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

export function formatYear(year: number): string {
  return `${year}년`;
}

export function formatDateLong(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}.${m}.${day} (${KO_WEEKDAYS[d.getDay()]})`;
}
