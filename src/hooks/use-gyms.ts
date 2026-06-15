import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type GymListItem = {
  id: string;
  name: string;
  branch: string | null;
  city: string;
  district: string | null;
  size_pyeong: number | null;
  has_boulder: boolean;
  has_lead: boolean;
  has_top_rope: boolean;
  has_moonboard: boolean;
  has_kilter: boolean;
  has_tension: boolean;
  logo_url: string | null;
  logo_bg_hex: string | null;
  favorite_count: number;
};

const LIST_COLUMNS =
  'id, name, branch, city, district, size_pyeong, has_boulder, has_lead, has_top_rope, has_moonboard, has_kilter, has_tension, logo_url, logo_bg_hex';

// 첫 글자 우선순위: 한글(0) < 영문(1) < 숫자(2) < 그 외(3).
// 같은 그룹 내에선 한국어 로케일 기준 정렬.
const NAME_COLLATOR = new Intl.Collator('ko-KR', { sensitivity: 'base' });
function nameGroup(name: string): number {
  const ch = name.trim().charAt(0);
  if (!ch) return 9;
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(ch)) return 0;
  if (/[A-Za-z]/.test(ch)) return 1;
  if (/[0-9]/.test(ch)) return 2;
  return 3;
}
export function compareGymName(a: { name: string }, b: { name: string }): number {
  const ga = nameGroup(a.name);
  const gb = nameGroup(b.name);
  if (ga !== gb) return ga - gb;
  return NAME_COLLATOR.compare(a.name, b.name);
}

export function useGyms() {
  return useQuery({
    queryKey: ['gyms'],
    queryFn: async (): Promise<GymListItem[]> => {
      const [gymsRes, popRes] = await Promise.all([
        supabase.from('gyms').select(LIST_COLUMNS).is('closed_at', null),
        supabase.from('gym_popularity').select('gym_id, favorite_count'),
      ]);
      if (gymsRes.error) throw new Error(gymsRes.error.message);
      if (popRes.error) throw new Error(popRes.error.message);
      const popMap = new Map<string, number>();
      for (const r of (popRes.data ?? []) as Array<{ gym_id: string; favorite_count: number }>) {
        popMap.set(r.gym_id, r.favorite_count);
      }
      const rows = ((gymsRes.data ?? []) as Omit<GymListItem, 'favorite_count'>[]).map((g) => ({
        ...g,
        favorite_count: popMap.get(g.id) ?? 0,
      }));
      // 한국어 → 영문 → 숫자 순.
      return rows.sort(compareGymName);
    },
  });
}
