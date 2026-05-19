import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type GymListItem = {
  id: string;
  name: string;
};

export function useGyms() {
  return useQuery({
    queryKey: ['gyms'],
    queryFn: async (): Promise<GymListItem[]> => {
      const { data, error } = await supabase
        .from('gyms')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as GymListItem[];
    },
  });
}
