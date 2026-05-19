import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type SessionRow = {
  id: string;
  user_id: string;
  gym_id: string | null;
  session_date: string;
  duration_min: number | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  gym: { id: string; name: string; branch: string | null } | null;
};

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', sessionId] as const,
    enabled: !!sessionId,
    queryFn: async (): Promise<SessionRow> => {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          'id, user_id, gym_id, session_date, duration_min, notes, created_at, completed_at, gym:gyms(id, name, branch)',
        )
        .eq('id', sessionId!)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as SessionRow;
    },
  });
}
