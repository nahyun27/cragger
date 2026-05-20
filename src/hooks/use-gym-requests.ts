import { useMutation } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type SubmitGymRequestArgs = {
  name: string;
  branch: string | null;
  locationHint: string | null;
  note: string | null;
};

export function useSubmitGymRequest() {
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (args: SubmitGymRequestArgs) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase.from('gym_requests').insert({
        user_id: userId,
        name: args.name,
        branch: args.branch,
        location_hint: args.locationHint,
        note: args.note,
      });
      if (error) throw new Error(error.message);
    },
  });
}
