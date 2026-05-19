import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
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

export function useActiveSession() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['sessions', userId, 'active'] as const,
    enabled: !!userId,
    queryFn: async (): Promise<{ id: string } | null> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', userId!)
        .eq('session_date', today)
        .is('completed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async ({ gymId }: { gymId: string }): Promise<{ id: string }> => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          gym_id: gymId,
          session_date: today,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useCompleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
