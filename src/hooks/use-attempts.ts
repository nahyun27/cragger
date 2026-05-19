import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type ClimbingType = 'boulder' | 'lead' | 'board';
export type AttemptResult = 'onsight' | 'flash' | 'send' | 'project' | 'fall';

export type Attempt = {
  id: string;
  session_id: string;
  problem_id: string | null;
  climbing_type: ClimbingType;
  result: AttemptResult;
  tries: number;
  felt_grade: string | null;
  notes: string | null;
  created_at: string;
  problem: { id: string; color: string } | null;
};

export function useAttempts(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'attempts'] as const,
    enabled: !!sessionId,
    queryFn: async (): Promise<Attempt[]> => {
      const { data, error } = await supabase
        .from('attempts')
        .select(
          'id, session_id, problem_id, climbing_type, result, tries, felt_grade, notes, created_at, problem:problems(id, color)',
        )
        .eq('session_id', sessionId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Attempt[];
    },
  });
}
