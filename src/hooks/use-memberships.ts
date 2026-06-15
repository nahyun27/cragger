import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import {
  cancelMembershipExpiryReminders,
  scheduleMembershipExpiryReminders,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

export type MembershipType = 'monthly' | 'period' | 'passes' | 'single';

export type MembershipRow = {
  id: string;
  user_id: string;
  gym_id: string;                              // primary (backward compat)
  gym_ids: string[];                           // 다중 암장 지원
  name: string | null;                         // 사용자 지정 이름 (T-pass 등)
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
  'id, user_id, gym_id, gym_ids, name, membership_type, start_date, end_date, total_passes, used_passes, price_krw, notes, created_at, gym:gyms(id, name, branch)';

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

// 특정 암장의 사용 가능한(만료 안 된) 회원권. 세션 기록 시 picker 에 노출.
export function useActiveMembershipsForGym(gymId: string | undefined) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['memberships', 'active', userId, gymId] as const,
    enabled: !!userId && !!gymId,
    queryFn: async (): Promise<MembershipRow[]> => {
      // gym_ids 배열에 포함되거나 (다중 암장), gym_id 가 일치 (단일 — 레거시)
      const { data, error } = await supabase
        .from('memberships')
        .select(SELECT_COLS)
        .eq('user_id', userId!)
        .or(`gym_id.eq.${gymId!},gym_ids.cs.{${gymId!}}`)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      const all = (data ?? []) as unknown as MembershipRow[];
      return all.filter((m) => !isMembershipExpired(m));
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
  gymIds: string[];               // 1개 이상. 첫 원소를 gym_id 로도 저장 (backward compat)
  gymName: string;                // 만료 알림 본문에 사용 (멀티면 name 또는 첫 암장)
  name: string | null;            // 사용자 지정 이름 (T-pass 등)
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
      if (args.gymIds.length === 0) throw new Error('암장을 1개 이상 선택해주세요');
      const { data, error } = await supabase
        .from('memberships')
        .insert({
          user_id: userId,
          gym_id: args.gymIds[0],        // backward compat — 첫 암장
          gym_ids: args.gymIds,
          name: args.name?.trim() ? args.name.trim() : null,
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
      // D-7, D-1 만료 알림 예약 (end_date 있을 때만 — 횟수권은 skip)
      if (args.endDate) {
        void scheduleMembershipExpiryReminders({
          membershipId: (data as { id: string }).id,
          gymName: args.gymName,
          endDate: args.endDate,
        });
      }
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
      if (args.gymIds.length === 0) throw new Error('암장을 1개 이상 선택해주세요');
      const { error } = await supabase
        .from('memberships')
        .update({
          gym_id: args.gymIds[0],
          gym_ids: args.gymIds,
          name: args.name?.trim() ? args.name.trim() : null,
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
      // 만료일 변경됐을 수 있으니 기존 알림 취소 후 재예약.
      await cancelMembershipExpiryReminders(args.id);
      if (args.endDate) {
        void scheduleMembershipExpiryReminders({
          membershipId: args.id,
          gymName: args.gymName,
          endDate: args.endDate,
        });
      }
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
      void cancelMembershipExpiryReminders(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
  });
}

// 회원권 사용 이력 — sessions.membership_id 로 연결된 세션 목록
export type MembershipUsageRow = {
  session_id: string;
  session_date: string;
  gym: { id: string; name: string; branch: string | null } | null;
  send_count: number;
};

export function useMembershipUsage(membershipId: string | undefined) {
  return useQuery({
    queryKey: ['memberships', 'usage', membershipId] as const,
    enabled: !!membershipId,
    queryFn: async (): Promise<MembershipUsageRow[]> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, session_date, gym:gyms(id, name, branch)')
        .eq('membership_id', membershipId!)
        .order('session_date', { ascending: false });
      if (error) throw new Error(error.message);
      const sessions = (data ?? []) as Array<{
        id: string;
        session_date: string;
        gym: { id: string; name: string; branch: string | null } | null;
      }>;
      if (sessions.length === 0) return [];
      // 각 세션의 완등 수 (boulder+lead 합산)
      const ids = sessions.map((s) => s.id);
      const { data: attempts } = await supabase
        .from('attempts')
        .select('session_id, result')
        .in('session_id', ids);
      const SEND = new Set(['send', 'flash', 'onsight', 'redpoint']);
      const sendCount = new Map<string, number>();
      for (const a of (attempts ?? []) as Array<{ session_id: string; result: string }>) {
        if (SEND.has(a.result)) {
          sendCount.set(a.session_id, (sendCount.get(a.session_id) ?? 0) + 1);
        }
      }
      return sessions.map((s) => ({
        session_id: s.id,
        session_date: s.session_date,
        gym: s.gym,
        send_count: sendCount.get(s.id) ?? 0,
      }));
    },
  });
}

// 회원권 사용 시점에 연결 가능한 후보 세션 — 해당 회원권의 암장(들)에서
// 최근 21일 안에 진행된, 아직 membership_id 가 없는 세션.
export type UnlinkedSessionRow = {
  id: string;
  session_date: string;
  gym: { id: string; name: string; branch: string | null } | null;
};

export function useUnlinkedSessionsForMembership(membership: MembershipRow | undefined) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['memberships', 'unlinked', membership?.id, userId] as const,
    enabled: !!membership && !!userId,
    queryFn: async (): Promise<UnlinkedSessionRow[]> => {
      if (!membership) return [];
      // 회원권에 등록된 모든 암장 (gym_ids 우선, 없으면 gym_id)
      const gymIds =
        (membership.gym_ids?.length ?? 0) > 0
          ? membership.gym_ids
          : membership.gym_id
          ? [membership.gym_id]
          : [];
      if (gymIds.length === 0) return [];
      // 21일 전부터
      const since = new Date();
      since.setDate(since.getDate() - 21);
      const sinceISO = since.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('sessions')
        .select('id, session_date, gym:gyms(id, name, branch)')
        .eq('user_id', userId!)
        .in('gym_id', gymIds)
        .is('membership_id', null)
        .gte('session_date', sinceISO)
        .order('session_date', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as UnlinkedSessionRow[];
    },
  });
}

// 회원권 차감 + 옵션으로 세션 연결.
// sessionId 가 있으면 해당 세션 membership_id 도 갱신.
export function useUsePass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      current,
      sessionId,
    }: {
      id: string;
      current: number;
      sessionId?: string;
    }) => {
      const { error } = await supabase
        .from('memberships')
        .update({ used_passes: current + 1 })
        .eq('id', id);
      if (error) throw new Error(error.message);
      if (sessionId) {
        const { error: linkErr } = await supabase
          .from('sessions')
          .update({ membership_id: id })
          .eq('id', sessionId);
        if (linkErr) throw new Error(linkErr.message);
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['memberships', 'usage', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['memberships', 'unlinked'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
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
