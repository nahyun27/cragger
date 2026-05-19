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
};

const LIST_COLUMNS =
  'id, name, branch, city, district, size_pyeong, has_boulder, has_lead, has_top_rope, has_moonboard, has_kilter, has_tension';

export function useGyms() {
  return useQuery({
    queryKey: ['gyms'],
    queryFn: async (): Promise<GymListItem[]> => {
      const { data, error } = await supabase
        .from('gyms')
        .select(LIST_COLUMNS)
        .order('name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as GymListItem[];
    },
  });
}
