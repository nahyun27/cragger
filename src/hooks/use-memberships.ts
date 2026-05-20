import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type MembershipType = 'monthly' | 'period' | 'passes' | 'single';

export type MembershipRow = {
  id: string;
  user_id: string;
  gym_id: string;
  membership_type: MembershipType;
  start_date: string; // YYYY-MM-DD
  end_date: string | null;
  total_passes: number | null;
  used_passes: number;
  price_krw: number | null;
  notes: string | null;
  created_at: string;
  gym: { id: string; name: string; branch: string | null } | null;
};

const SELECT_COLS =
  'id, user_id, gym_id, membership_type, start_date, end_date, total_passes, used_passes, price_krw, notes, created_at, gym:gyms(id, name, branch)';

export function useMemberships() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['memberships', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<MembershipRow[]> => {
      const { data, error } = await supabase
        .from('memberships')
        .select(SELECT_COLS)
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as MembershipRow[];
    },
  });
}

export function useMembership(id: string | undefined) {
  return useQuery({
    queryKey: ['memberships', 'single', id] as const,
    enabled: !!id,
    queryFn: async (): Promise<MembershipRow> => {
      const { data, error } = await supabase
        .from('memberships')
        .select(SELECT_COLS)
        .eq('id', id!)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as MembershipRow;
    },
  });
}

export type CreateMembershipArgs = {
  gymId: string;
  membershipType: MembershipType;
  startDate: string;
  endDate: string | null;
  totalPasses: number | null;
  usedPasses: number;
  priceKrw: number | null;
  notes: string | null;
};

export function useCreateMembership() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (args: CreateMembershipArgs) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('memberships')
        .insert({
          user_id: userId,
          gym_id: args.gymId,
          membership_type: args.membershipType,
          start_date: args.startDate,
          end_date: args.endDate,
          total_passes: args.totalPasses,
          used_passes: args.usedPasses,
          price_krw: args.priceKrw,
          notes: args.notes,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
  });
}

export type UpdateMembershipArgs = CreateMembershipArgs & { id: string };

export function useUpdateMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: UpdateMembershipArgs) => {
      const { error } = await supabase
        .from('memberships')
        .update({
          gym_id: args.gymId,
          membership_type: args.membershipType,
          start_date: args.startDate,
          end_date: args.endDate,
          total_passes: args.totalPasses,
          used_passes: args.usedPasses,
          price_krw: args.priceKrw,
          notes: args.notes,
        })
        .eq('id', args.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
  });
}

export function useDeleteMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('memberships').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
  });
}

// 다회권 1회 차감. CHECK 제약 (used_passes <= total_passes) 가 race를 막아주므로
// 트랜잭션 없이 안전.
export function useUsePass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, current }: { id: string; current: number }) => {
      const { error } = await supabase
        .from('memberships')
        .update({ used_passes: current + 1 })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
  });
}

// ── 날짜 유틸 ───────────────────────────────────────────────
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addMonthsISO(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function daysFromTodayTo(iso: string): number {
  const today = new Date(`${todayISO()}T00:00:00`).getTime();
  const target = new Date(`${iso}T00:00:00`).getTime();
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

// ── 상태 판정 ───────────────────────────────────────────────
export function isMembershipExpired(m: MembershipRow): boolean {
  if (m.membership_type === 'passes') {
    return m.total_passes != null && m.used_passes >= m.total_passes;
  }
  if (m.end_date) {
    return daysFromTodayTo(m.end_date) < 0;
  }
  if (m.membership_type === 'single') {
    return daysFromTodayTo(m.start_date) < 0;
  }
  return false;
}

export function isExpiringSoon(m: MembershipRow): boolean {
  if (isMembershipExpired(m)) return false;
  if (m.membership_type === 'passes') {
    if (m.total_passes == null) return false;
    const remaining = m.total_passes - m.used_passes;
    return remaining > 0 && remaining <= 2;
  }
  if (m.end_date) {
    const d = daysFromTodayTo(m.end_date);
    return d >= 0 && d <= 3;
  }
  return false;
}
