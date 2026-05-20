import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  instagram_handle: string | null;
};

export function useProfile() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['profiles', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, instagram_handle')
        .eq('id', userId!)
        .single();
      if (error) throw new Error(error.message);
      return data as Profile;
    },
  });
}

export type UpdateProfileArgs = {
  instagramHandle?: string | null;
  displayName?: string | null;
  bio?: string | null;
};

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (args: UpdateProfileArgs) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const patch: Record<string, unknown> = {};
      if (args.instagramHandle !== undefined) patch.instagram_handle = args.instagramHandle;
      if (args.displayName !== undefined) patch.display_name = args.displayName;
      if (args.bio !== undefined) patch.bio = args.bio;
      const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}
