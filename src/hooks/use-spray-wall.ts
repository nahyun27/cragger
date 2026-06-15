import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type SprayWallPhoto = {
  id: string;
  gym_id: string;
  photo_url: string;
  display_order: number;
  uploaded_by: string | null;
  created_at: string;
};

export type HoldType = 'start' | 'middle' | 'top' | 'foot';
export type ProblemType = 'boulder' | 'endurance';

export type SprayWallHold = {
  id: string;
  problem_id: string;
  hold_type: HoldType;
  marker_x: number;
  marker_y: number;
  notes: string | null;
  created_at: string;
};

export type SprayWallProblem = {
  id: string;
  gym_id: string;
  photo_id: string | null;
  created_by: string | null;
  number: number;
  name: string | null;
  description: string | null;
  color: string | null;
  problem_type: ProblemType;
  created_at: string;
  holds: SprayWallHold[];
};

export type SprayWallSendEntry = {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  tries: number;
};

export type GymColorScheme = {
  color: string;
  color_hex: string | null;
  official_label: string | null;
  order_index: number;
};

// ── 사진 목록 ──────────────────────────────────────────────────
export function useSprayWallPhotos(gymId: string | undefined) {
  return useQuery({
    queryKey: ['spray-wall', gymId, 'photos'] as const,
    enabled: !!gymId,
    queryFn: async (): Promise<SprayWallPhoto[]> => {
      const { data, error } = await supabase
        .from('spray_wall_photos')
        .select('*')
        .eq('gym_id', gymId!)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as SprayWallPhoto[];
    },
  });
}

// ── 문제 목록 (홀드 포함) ────────────────────────────────────────
export function useSprayWallProblems(gymId: string | undefined, photoId?: string | null) {
  return useQuery({
    queryKey: ['spray-wall', gymId, 'problems', photoId ?? 'all'] as const,
    enabled: !!gymId,
    queryFn: async (): Promise<SprayWallProblem[]> => {
      let q = supabase
        .from('spray_wall_problems')
        .select('*, holds:spray_wall_holds(*)')
        .eq('gym_id', gymId!);
      if (photoId) q = q.eq('photo_id', photoId);
      const { data, error } = await q.order('number', { ascending: true });
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown[]).map((p: unknown) => {
        const row = p as Record<string, unknown>;
        const holds = ((row.holds as SprayWallHold[] | null) ?? [])
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        return {
          ...row,
          holds,
          problem_type: (row.problem_type as ProblemType) ?? 'boulder',
        } as SprayWallProblem;
      });
    },
  });
}

// ── 단일 문제 (홀드 포함) ────────────────────────────────────────
export function useSprayWallProblem(problemId: string | undefined) {
  return useQuery({
    queryKey: ['spray-wall', 'problem', problemId] as const,
    enabled: !!problemId,
    queryFn: async (): Promise<SprayWallProblem> => {
      const { data, error } = await supabase
        .from('spray_wall_problems')
        .select('*, holds:spray_wall_holds(*)')
        .eq('id', problemId!)
        .single();
      if (error) throw new Error(error.message);
      const row = data as Record<string, unknown>;
      const holds = ((row.holds as SprayWallHold[] | null) ?? [])
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return {
        ...row,
        holds,
        problem_type: (row.problem_type as ProblemType) ?? 'boulder',
      } as SprayWallProblem;
    },
  });
}

// ── 암장 색깔 체계 ────────────────────────────────────────────
export function useGymColorSchemes(gymId: string | undefined) {
  return useQuery({
    queryKey: ['gyms', gymId, 'color-schemes'] as const,
    enabled: !!gymId,
    queryFn: async (): Promise<GymColorScheme[]> => {
      const { data, error } = await supabase
        .from('gym_color_schemes')
        .select('color, color_hex, official_label, order_index')
        .eq('gym_id', gymId!)
        .order('order_index', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as GymColorScheme[];
    },
  });
}

// ── 문제 + 홀드 추가 ──────────────────────────────────────────
export function useAddSprayWallProblem(gymId: string) {
  const { session: authSession } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      photoId: string;
      number: number;
      name?: string | null;
      description?: string;
      color?: string | null;
      problemType: ProblemType;
      holds: { holdType: HoldType; markerX: number; markerY: number; notes?: string }[];
    }): Promise<SprayWallProblem> => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('로그인이 필요해요.');
      if (input.holds.length === 0) throw new Error('홀드를 1개 이상 배치해주세요.');

      const { data: problem, error: pErr } = await supabase
        .from('spray_wall_problems')
        .insert({
          gym_id: gymId,
          photo_id: input.photoId,
          created_by: userId,
          number: input.number,
          name: input.name ?? null,
          description: input.description ?? null,
          color: input.color ?? null,
          problem_type: input.problemType,
        })
        .select()
        .single();
      if (pErr) throw new Error(pErr.message);

      const { error: hErr } = await supabase
        .from('spray_wall_holds')
        .insert(
          input.holds.map((h) => ({
            problem_id: (problem as { id: string }).id,
            hold_type: h.holdType,
            marker_x: h.markerX,
            marker_y: h.markerY,
            notes: h.notes ?? null,
          }))
        );
      if (hErr) throw new Error(hErr.message);

      return { ...(problem as Omit<SprayWallProblem, 'holds'>), holds: [] };
    },
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ['spray-wall', gymId, 'problems', vars.photoId] });
      qc.invalidateQueries({ queryKey: ['spray-wall', gymId, 'problems', 'all'] });
    },
  });
}

// ── 문제 수정 ────────────────────────────────────────────────
export function useUpdateSprayWallProblem(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      problemId: string;
      name?: string | null;
      color?: string | null;
      description?: string | null;
      problemType?: ProblemType;
    }) => {
      const patch: Record<string, unknown> = {};
      if ('name' in input) patch.name = input.name;
      if ('color' in input) patch.color = input.color;
      if ('description' in input) patch.description = input.description;
      if (input.problemType) patch.problem_type = input.problemType;
      const { error } = await supabase
        .from('spray_wall_problems')
        .update(patch)
        .eq('id', input.problemId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['spray-wall', 'problem', vars.problemId] });
      qc.invalidateQueries({ queryKey: ['spray-wall', gymId, 'problems', 'all'] });
    },
  });
}

// ── 홀드 위치 수정 ────────────────────────────────────────────
export function useUpdateSprayWallHold(problemId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      holdId: string;
      markerX?: number;
      markerY?: number;
      notes?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if (input.markerX !== undefined) patch.marker_x = input.markerX;
      if (input.markerY !== undefined) patch.marker_y = input.markerY;
      if ('notes' in input) patch.notes = input.notes;
      const { error } = await supabase
        .from('spray_wall_holds')
        .update(patch)
        .eq('id', input.holdId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spray-wall', 'problem', problemId] });
    },
  });
}

// ── 홀드 삭제 ────────────────────────────────────────────────
export function useDeleteSprayWallHold(problemId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (holdId: string) => {
      const { error } = await supabase
        .from('spray_wall_holds')
        .delete()
        .eq('id', holdId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spray-wall', 'problem', problemId] });
    },
  });
}

// ── 기존 문제에 홀드 추가 (수정 모드) ────────────────────────
export function useAddHoldsToExistingProblem(gymId: string, problemId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (holds: { holdType: HoldType; markerX: number; markerY: number; notes?: string }[]) => {
      if (!problemId || holds.length === 0) return;
      const { error } = await supabase
        .from('spray_wall_holds')
        .insert(
          holds.map((h) => ({
            problem_id: problemId,
            hold_type: h.holdType,
            marker_x: h.markerX,
            marker_y: h.markerY,
            notes: h.notes ?? null,
          }))
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spray-wall', 'problem', problemId] });
      qc.invalidateQueries({ queryKey: ['spray-wall', gymId, 'problems', 'all'] });
    },
  });
}

// ── 문제 삭제 (홀드 cascade) ───────────────────────────────────
export function useDeleteSprayWallProblem(gymId: string, photoId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (problemId: string): Promise<void> => {
      const { error } = await supabase
        .from('spray_wall_problems')
        .delete()
        .eq('id', problemId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spray-wall', gymId, 'problems', photoId ?? 'all'] });
      qc.invalidateQueries({ queryKey: ['spray-wall', gymId, 'problems', 'all'] });
    },
  });
}

// ── 문제 완등 목록 ────────────────────────────────────────────
export function useSprayWallProblemSends(problemId: string | undefined) {
  return useQuery({
    queryKey: ['spray-wall', 'problem', problemId, 'sends'] as const,
    enabled: !!problemId,
    queryFn: async (): Promise<SprayWallSendEntry[]> => {
      const { data: rows, error: aErr } = await supabase
        .from('attempts')
        .select('tries, session:sessions(user_id)')
        .eq('spray_wall_problem_id', problemId!)
        .eq('result', 'send');
      if (aErr) throw new Error(aErr.message);

      const entries = (rows ?? []) as Array<{ tries: number; session: { user_id: string } | null }>;
      const byUser = new Map<string, number>();
      for (const r of entries) {
        const uid = r.session?.user_id;
        if (!uid) continue;
        const prev = byUser.get(uid);
        if (prev === undefined || r.tries < prev) byUser.set(uid, r.tries);
      }
      const userIds = Array.from(byUser.keys());
      if (userIds.length === 0) return [];

      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds);
      if (pErr) throw new Error(pErr.message);

      const profileMap = new Map(
        ((profiles ?? []) as Array<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null }>)
          .map((p) => [p.id, p])
      );
      return userIds.map((uid) => {
        const p = profileMap.get(uid);
        return {
          userId: uid,
          displayName: p?.display_name ?? null,
          username: p?.username ?? null,
          avatarUrl: p?.avatar_url ?? null,
          tries: byUser.get(uid) ?? 1,
        };
      });
    },
  });
}

// ── 사진 삭제 ─────────────────────────────────────────────────
export function useDeleteSprayWallPhoto(gymId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: string): Promise<void> => {
      const { error } = await supabase
        .from('spray_wall_photos')
        .delete()
        .eq('id', photoId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spray-wall', gymId, 'photos'] });
      qc.invalidateQueries({ queryKey: ['spray-wall', gymId, 'problems', 'all'] });
    },
  });
}
