import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type JoinRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export type CrewJoinRequest = {
  id: string;
  crew_id: string;
  user_id: string;
  message: string | null;
  status: JoinRequestStatus;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  crew: {
    id: string;
    name: string;
    image_url: string | null;
  } | null;
};

const REQUEST_COLS =
  'id, crew_id, user_id, message, status, created_at, decided_at, decided_by, user:profiles!crew_join_requests_user_id_fkey(id, username, display_name, avatar_url), crew:crews(id, name, image_url)';

// ── 내 pending 요청 목록 ─────────────────────────────────────
export function useMyJoinRequests() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['crew-requests', 'mine', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<CrewJoinRequest[]> => {
      const { data, error } = await supabase
        .from('crew_join_requests')
        .select(REQUEST_COLS)
        .eq('user_id', userId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CrewJoinRequest[];
    },
  });
}

// ── 크루의 pending 요청 목록 (크루장 전용 — RLS 가 보장) ────────
export function useCrewJoinRequests(crewId: string | undefined) {
  return useQuery({
    queryKey: ['crew-requests', 'crew', crewId] as const,
    enabled: !!crewId,
    queryFn: async (): Promise<CrewJoinRequest[]> => {
      const { data, error } = await supabase
        .from('crew_join_requests')
        .select(REQUEST_COLS)
        .eq('crew_id', crewId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CrewJoinRequest[];
    },
  });
}

// ── 가입 요청 보내기 ─────────────────────────────────────────
export function useRequestJoinCrew() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (args: { code: string; message?: string }): Promise<{ crewId: string }> => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const trimmed = args.code.trim().toUpperCase();
      if (trimmed.length !== 6) throw new Error('초대코드는 6자리');

      // 1) 코드 → crew lookup
      const { data: crew, error: lookupErr } = await supabase
        .from('crews')
        .select('id')
        .eq('invite_code', trimmed)
        .maybeSingle();
      if (lookupErr) throw new Error(lookupErr.message);
      if (!crew) throw new Error('코드를 확인해주세요');
      const crewId = (crew as { id: string }).id;

      // 2) 이미 멤버인지 체크
      const { data: existing } = await supabase
        .from('crew_members')
        .select('user_id')
        .eq('crew_id', crewId)
        .eq('user_id', userId)
        .maybeSingle();
      if (existing) throw new Error('이미 가입한 크루입니다');

      // 3) request INSERT
      const { error: insErr } = await supabase
        .from('crew_join_requests')
        .insert({
          crew_id: crewId,
          user_id: userId,
          message: args.message?.trim() || null,
          status: 'pending',
        });
      if (insErr) {
        if (insErr.code === '23505') throw new Error('이미 요청을 보냈어요. 크루장 승인 대기 중입니다.');
        throw new Error(insErr.message);
      }
      return { crewId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-requests'] });
    },
  });
}

// ── 수락 / 거절 / 취소 ────────────────────────────────────────
export function useAcceptJoinRequest() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('crew_join_requests')
        .update({ status: 'accepted', decided_at: new Date().toISOString(), decided_by: userId })
        .eq('id', requestId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-requests'] });
      queryClient.invalidateQueries({ queryKey: ['crews'] });
    },
  });
}

export function useRejectJoinRequest() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('crew_join_requests')
        .update({ status: 'rejected', decided_at: new Date().toISOString(), decided_by: userId })
        .eq('id', requestId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-requests'] });
    },
  });
}

export function useCancelJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('crew_join_requests')
        .update({ status: 'cancelled', decided_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-requests'] });
    },
  });
}
