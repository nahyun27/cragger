import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type ShoeStatus = 'active' | 'retired' | 'resole_pending';

export const SHOE_STATUS_LABEL: Record<ShoeStatus, string> = {
  active: '사용중',
  retired: '은퇴',
  resole_pending: '리솔 대기',
};

export type ClimbingShoe = {
  id: string;
  user_id: string;
  brand: string | null;
  model: string;
  size: string | null;
  status: ShoeStatus;
  purchased_at: string | null;
  image_url: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  'id, user_id, brand, model, size, status, purchased_at, image_url, note, created_at, updated_at';

// ── List ────────────────────────────────────────────────────
export function useShoes() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['shoes', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<ClimbingShoe[]> => {
      const { data, error } = await supabase
        .from('climbing_shoes')
        .select(COLUMNS)
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ClimbingShoe[];
    },
  });
}

// ── Single ──────────────────────────────────────────────────
export function useShoe(shoeId: string | undefined) {
  return useQuery({
    queryKey: ['shoes', 'single', shoeId] as const,
    enabled: !!shoeId,
    queryFn: async (): Promise<ClimbingShoe> => {
      const { data, error } = await supabase
        .from('climbing_shoes')
        .select(COLUMNS)
        .eq('id', shoeId!)
        .single();
      if (error) throw new Error(error.message);
      return data as ClimbingShoe;
    },
  });
}

// ── Mutations ───────────────────────────────────────────────
export type ShoeInput = {
  brand: string | null;
  model: string;
  size: string | null;
  status: ShoeStatus;
  purchasedAt: string | null;
  note: string | null;
};

export function useCreateShoe() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (args: ShoeInput): Promise<{ id: string }> => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const model = args.model.trim();
      if (!model) throw new Error('모델명을 입력하세요');
      const { data, error } = await supabase
        .from('climbing_shoes')
        .insert({
          user_id: userId,
          brand: args.brand?.trim() || null,
          model,
          size: args.size?.trim() || null,
          status: args.status,
          purchased_at: args.purchasedAt,
          note: args.note?.trim() || null,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoes'] });
    },
  });
}

export function useUpdateShoe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shoeId, ...args }: ShoeInput & { shoeId: string }) => {
      const model = args.model.trim();
      if (!model) throw new Error('모델명을 입력하세요');
      const { error } = await supabase
        .from('climbing_shoes')
        .update({
          brand: args.brand?.trim() || null,
          model,
          size: args.size?.trim() || null,
          status: args.status,
          purchased_at: args.purchasedAt,
          note: args.note?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shoeId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoes'] });
    },
  });
}

export function useDeleteShoe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shoeId: string) => {
      const { error } = await supabase
        .from('climbing_shoes')
        .delete()
        .eq('id', shoeId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoes'] });
    },
  });
}
