import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

// gyms 행에 머지될 수 있는 모든 필드. UI 에서 부분 입력 가능.
export type GymChanges = {
  city?: string;
  district?: string;
  address?: string;
  size_pyeong?: number;
  floors_count?: number;
  opened_at?: string;          // YYYY-MM-DD
  description?: string;
  parking_info?: string;
  phone?: string;
  website_url?: string;
  instagram_handle?: string;
  has_boulder?: boolean;
  has_lead?: boolean;
  has_top_rope?: boolean;
  has_speed?: boolean;
  has_auto_belay?: boolean;
  has_moonboard?: boolean;
  has_kilter?: boolean;
  has_tension?: boolean;
  has_shower?: boolean;
  has_locker?: boolean;
  has_parking?: boolean;
  logo_url?: string;
  logo_bg_hex?: string | null;  // '#000000' | '#ffffff' | 기타 hex | null = 기본 카드 배경
  // 색깔 구성 — 승인 시 gym_color_schemes 에 INSERT/DELETE
  add_colors?: string[];
  remove_colors?: string[];
  // 색깔 순서 — 승인 시 gym_color_schemes.order_index 갱신 (배열 인덱스 그대로 사용)
  color_order?: string[];
};

export type GymSubmissionGymMini = {
  id: string;
  name: string;
  branch: string | null;
};

export type GymSubmissionUserMini = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type GymSubmission = {
  id: string;
  gym_id: string | null;
  submitter_id: string;
  changes: GymChanges;
  note: string | null;
  status: SubmissionStatus;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  admin_notes: string | null;
  gym: GymSubmissionGymMini | null;
  submitter: GymSubmissionUserMini | null;
};

const SUBMISSION_COLS =
  'id, gym_id, submitter_id, changes, note, status, created_at, decided_at, decided_by, admin_notes, gym:gyms(id, name, branch), submitter:profiles!gym_submissions_submitter_id_fkey(id, username, display_name, avatar_url)';

// ── 내 is_admin 여부 ─────────────────────────────────────────
export function useIsAdmin() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['profile', 'is-admin', userId] as const,
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId!)
        .single();
      if (error) throw new Error(error.message);
      return !!(data as { is_admin: boolean }).is_admin;
    },
  });
}

// ── 제보 보내기 (기존 암장 수정 또는 신규 제안) ───────────────
// gymId 가 null 이면 신규 암장 제안 — changes 에 name, city 필수.
export function useSubmitGymInfo() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (args: {
      gymId: string | null;
      changes: GymChanges;
      note?: string;
    }): Promise<{ id: string }> => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const keys = Object.keys(args.changes);
      if (args.gymId == null) {
        // 신규 제안 — name + city 필수
        const c = args.changes as Record<string, unknown>;
        if (!c.name || !c.city) {
          throw new Error('새 암장 제안은 이름과 시/도가 필수예요');
        }
      } else if (keys.length === 0 && !args.note?.trim()) {
        throw new Error('수정할 항목이나 메모를 1개 이상 입력해주세요');
      }
      const { data, error } = await supabase
        .from('gym_submissions')
        .insert({
          gym_id: args.gymId,
          submitter_id: userId,
          changes: args.changes,
          note: args.note?.trim() || null,
          status: 'pending',
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gym-submissions'] });
    },
  });
}

// ── 단일 제보 (내 제보 또는 admin) ───────────────────────────
export function useGymSubmission(submissionId: string | undefined) {
  return useQuery({
    queryKey: ['gym-submissions', 'detail', submissionId] as const,
    enabled: !!submissionId,
    queryFn: async (): Promise<GymSubmission> => {
      const { data, error } = await supabase
        .from('gym_submissions')
        .select(SUBMISSION_COLS)
        .eq('id', submissionId!)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as GymSubmission;
    },
  });
}

// ── 내 제보 내역 ────────────────────────────────────────────
export function useMyGymSubmissions() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['gym-submissions', 'mine', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<GymSubmission[]> => {
      const { data, error } = await supabase
        .from('gym_submissions')
        .select(SUBMISSION_COLS)
        .eq('submitter_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as GymSubmission[];
    },
  });
}

// ── 관리자 — pending 제보 전체 ───────────────────────────────
export function usePendingGymSubmissions(enabled: boolean) {
  return useQuery({
    queryKey: ['gym-submissions', 'pending'] as const,
    enabled,
    queryFn: async (): Promise<GymSubmission[]> => {
      const { data, error } = await supabase
        .from('gym_submissions')
        .select(SUBMISSION_COLS)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as GymSubmission[];
    },
  });
}

// ── 관리자 — 승인 / 거절 ───────────────────────────────────
export function useApproveGymSubmission() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('gym_submissions')
        .update({
          status: 'approved',
          decided_at: new Date().toISOString(),
          decided_by: userId,
        })
        .eq('id', submissionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gym-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
    },
  });
}

export function useRejectGymSubmission() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (args: { submissionId: string; adminNotes?: string }) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('gym_submissions')
        .update({
          status: 'rejected',
          decided_at: new Date().toISOString(),
          decided_by: userId,
          admin_notes: args.adminNotes?.trim() || null,
        })
        .eq('id', args.submissionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gym-submissions'] });
    },
  });
}
