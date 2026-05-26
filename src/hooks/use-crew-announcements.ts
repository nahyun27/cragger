import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type CrewAnnouncementAuthor = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type CrewAnnouncement = {
  id: string;
  crew_id: string;
  author_id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  author: CrewAnnouncementAuthor | null;
};

const ANNOUNCEMENT_COLS =
  'id, crew_id, author_id, title, body, pinned, created_at, author:profiles!crew_announcements_author_id_fkey(id, username, display_name, avatar_url)';

export function useCrewAnnouncements(crewId: string | undefined) {
  return useQuery({
    queryKey: ['crew-announcements', crewId] as const,
    enabled: !!crewId,
    queryFn: async (): Promise<CrewAnnouncement[]> => {
      const { data, error } = await supabase
        .from('crew_announcements')
        .select(ANNOUNCEMENT_COLS)
        .eq('crew_id', crewId!)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CrewAnnouncement[];
    },
  });
}

export type CreateAnnouncementArgs = {
  crewId: string;
  title: string;
  body: string;
  pinned?: boolean;
};

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (args: CreateAnnouncementArgs) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase.from('crew_announcements').insert({
        crew_id: args.crewId,
        author_id: userId,
        title: args.title.trim(),
        body: args.body.trim(),
        pinned: args.pinned ?? false,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crew-announcements', vars.crewId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase
        .from('crew_announcements')
        .delete()
        .eq('id', announcementId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-announcements'] });
    },
  });
}
