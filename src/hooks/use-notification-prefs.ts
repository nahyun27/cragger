/**
 * 알림 채널 on/off — profiles.notification_prefs JSONB 에 저장.
 *   { "gym_submission_new": false, ... }
 * 누락 = 켜짐 (default true).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type NotifPrefs = Record<string, boolean>;

export function useNotifPrefs() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['notification-prefs', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<NotifPrefs> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_prefs')
        .eq('id', userId!)
        .single();
      if (error) throw new Error(error.message);
      return ((data as { notification_prefs: NotifPrefs | null })?.notification_prefs ?? {}) as NotifPrefs;
    },
  });
}

export function useSetNotifPref() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { key: string; value: boolean }) => {
      if (!userId) throw new Error('Not authenticated');
      // 현재 값 가져와서 머지
      const { data: cur, error: getErr } = await supabase
        .from('profiles')
        .select('notification_prefs')
        .eq('id', userId)
        .single();
      if (getErr) throw new Error(getErr.message);
      const next: NotifPrefs = {
        ...((cur as { notification_prefs: NotifPrefs | null })?.notification_prefs ?? {}),
        [args.key]: args.value,
      };
      const { error } = await supabase
        .from('profiles')
        .update({ notification_prefs: next })
        .eq('id', userId);
      if (error) throw new Error(error.message);
      return next;
    },
    onMutate: async (args) => {
      const key = ['notification-prefs', userId] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<NotifPrefs>(key) ?? {};
      queryClient.setQueryData<NotifPrefs>(key, { ...prev, [args.key]: args.value });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['notification-prefs', userId], ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-prefs', userId] });
    },
  });
}
