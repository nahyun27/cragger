import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { checkBadgesAndNotify } from '@/lib/check-badges-and-notify';
import { supabase } from '@/lib/supabase';

export type CrewRole = 'owner' | 'member';

export type CrewGym = {
  id: string;
  name: string;
  branch: string | null;
};

export type CrewUserMini = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  featured_badge_key: string | null;
};

export const CREW_REGION_OPTIONS = [
  '서울', '경기', '인천',
  '강원', '충북', '충남', '대전', '세종',
  '전북', '전남', '광주',
  '경북', '경남', '대구', '울산', '부산',
  '제주',
] as const;
export type CrewRegion = typeof CREW_REGION_OPTIONS[number];

export type CrewSummary = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  owner_id: string;
  home_gym_id: string | null;
  home_gym: CrewGym | null;
  image_url: string | null;
  member_count: number;
  created_at: string;
  region: CrewRegion | null;
  is_recruiting: boolean;
};

export type CrewMember = {
  user_id: string;
  role: CrewRole;
  joined_at: string;
  user: CrewUserMini | null;
};

export type CrewDetail = CrewSummary & {
  members: CrewMember[];
  my_role: CrewRole | null;
};

const CREW_COLS =
  'id, name, description, invite_code, owner_id, home_gym_id, image_url, member_count, created_at, region, is_recruiting, home_gym:gyms(id, name, branch)';

// ── 공개 모집 크루 ────────────────────────────────────────────
export function useRecruitingCrews(limit?: number) {
  return useQuery({
    queryKey: ['crews', 'recruiting', limit ?? null] as const,
    staleTime: 60_000,
    queryFn: async (): Promise<CrewSummary[]> => {
      let q = supabase
        .from('crews')
        .select(CREW_COLS)
        .eq('is_recruiting', true)
        .order('created_at', { ascending: false });
      if (limit != null) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CrewSummary[];
    },
  });
}

// ── 커뮤니티용: 모집 + 최근 만들어진 크루 (mix) ───────────────
// 모집 중인 크루 우선, 부족하면 최근 created_at 으로 보충.
export function useDiscoverCrews(limit: number = 10) {
  return useQuery({
    queryKey: ['crews', 'discover', limit] as const,
    staleTime: 60_000,
    queryFn: async (): Promise<CrewSummary[]> => {
      const [recruitingR, recentR] = await Promise.all([
        supabase
          .from('crews')
          .select(CREW_COLS)
          .eq('is_recruiting', true)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('crews')
          .select(CREW_COLS)
          .order('created_at', { ascending: false })
          .limit(limit),
      ]);
      if (recruitingR.error) throw new Error(recruitingR.error.message);
      if (recentR.error) throw new Error(recentR.error.message);
      const recruiting = (recruitingR.data ?? []) as unknown as CrewSummary[];
      const recent = (recentR.data ?? []) as unknown as CrewSummary[];
      const seen = new Set<string>();
      const merged: CrewSummary[] = [];
      for (const c of recruiting) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          merged.push(c);
        }
      }
      for (const c of recent) {
        if (merged.length >= limit) break;
        if (!seen.has(c.id)) {
          seen.add(c.id);
          merged.push(c);
        }
      }
      return merged;
    },
  });
}

// ── 내 크루 목록 ──────────────────────────────────────────────
export function useMyCrews() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['crews', 'mine', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<CrewSummary[]> => {
      // crew_members → crews join
      const { data, error } = await supabase
        .from('crew_members')
        .select(`crew:crews(${CREW_COLS})`)
        .eq('user_id', userId!)
        .order('joined_at', { ascending: false });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<{ crew: CrewSummary | null }>;
      return rows.map((r) => r.crew).filter((c): c is CrewSummary => c !== null);
    },
  });
}

export function useUserCrews(targetUserId: string | undefined) {
  return useQuery({
    queryKey: ['crews', 'user', targetUserId] as const,
    enabled: !!targetUserId,
    queryFn: async (): Promise<CrewSummary[]> => {
      const { data, error } = await supabase
        .from('crew_members')
        .select(`crew:crews(${CREW_COLS})`)
        .eq('user_id', targetUserId!)
        .order('joined_at', { ascending: false });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<{ crew: CrewSummary | null }>;
      return rows.map((r) => r.crew).filter((c): c is CrewSummary => c !== null);
    },
  });
}

// ── 크루 상세 + 멤버 ─────────────────────────────────────────
export function useCrewDetail(crewId: string | undefined) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['crews', 'detail', crewId, userId] as const,
    enabled: !!crewId,
    queryFn: async (): Promise<CrewDetail> => {
      const [crewRes, membersRes] = await Promise.all([
        supabase.from('crews').select(CREW_COLS).eq('id', crewId!).single(),
        supabase
          .from('crew_members')
          .select('user_id, role, joined_at, user:profiles!crew_members_user_id_fkey(id, username, display_name, avatar_url, featured_badge_key)')
          .eq('crew_id', crewId!)
          .order('joined_at', { ascending: true }),
      ]);
      if (crewRes.error) throw new Error(crewRes.error.message);
      if (membersRes.error) throw new Error(membersRes.error.message);
      const crew = crewRes.data as unknown as CrewSummary;
      const members = (membersRes.data ?? []) as unknown as CrewMember[];
      const me = userId ? members.find((m) => m.user_id === userId) ?? null : null;
      return { ...crew, members, my_role: me?.role ?? null };
    },
  });
}

// ── 초대코드로 크루 미리보기 (가입 페이지) ───────────────────
export function useLookupCrewByCode(code: string) {
  const trimmed = code.trim().toUpperCase();
  return useQuery({
    queryKey: ['crews', 'by-code', trimmed] as const,
    enabled: trimmed.length === 6,
    queryFn: async (): Promise<CrewSummary | null> => {
      const { data, error } = await supabase
        .from('crews')
        .select(CREW_COLS)
        .eq('invite_code', trimmed)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as CrewSummary | null;
    },
  });
}

// ── Mutations ────────────────────────────────────────────────
export type CreateCrewArgs = {
  name: string;
  description: string | null;
  homeGymId: string | null;
  region: CrewRegion | null;
};

export function useCreateCrew() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (args: CreateCrewArgs): Promise<{ id: string }> => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');

      // invite_code 는 column default (gen_invite_code()) 가 채움.
      // unique 충돌 (32^6 ~10억) 거의 없지만 한 번 retry.
      let attempt = 0;
      while (attempt < 2) {
        const { data: crewRow, error } = await supabase
          .from('crews')
          .insert({
            name: args.name.trim(),
            description: args.description?.trim() || null,
            owner_id: userId,
            home_gym_id: args.homeGymId,
            region: args.region,
          })
          .select('id')
          .single();
        if (!error && crewRow) {
          const crewId = (crewRow as { id: string }).id;
          // owner 를 멤버로 추가 (트리거가 member_count 증가, default 1 이라
          // owner INSERT 후 2가 됨 → default 0 으로 시작했어야 하지만 이미 default 1.
          // 그래서 INSERT 전에 default 1 인 채로 두고 INSERT 후 1 + 1 = 2 가 됨.
          // 해결: INSERT 직후 member_count 를 1로 reset.
          const { error: mErr } = await supabase
            .from('crew_members')
            .insert({ crew_id: crewId, user_id: userId, role: 'owner' });
          if (mErr) throw new Error(mErr.message);
          await supabase.from('crews').update({ member_count: 1 }).eq('id', crewId);
          return { id: crewId };
        }
        // unique 충돌 (invite_code 또는 다른) 면 한 번 retry
        if (error?.code === '23505' && attempt === 0) {
          attempt += 1;
          continue;
        }
        throw new Error(error?.message ?? '크루 생성 실패');
      }
      throw new Error('크루 생성 실패');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      checkBadgesAndNotify();
    },
  });
}

/**
 * @deprecated 가입 요청 흐름으로 전환됨. useRequestJoinCrew() 사용.
 */

export function useLeaveCrew() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (crewId: string) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('crew_members')
        .delete()
        .eq('crew_id', crewId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
    },
  });
}

export function useKickMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ crewId, userId }: { crewId: string; userId: string }) => {
      const { error } = await supabase
        .from('crew_members')
        .delete()
        .eq('crew_id', crewId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crews', 'detail', vars.crewId] });
      queryClient.invalidateQueries({ queryKey: ['crews', 'mine'] });
    },
  });
}

export type UpdateCrewArgs = {
  crewId: string;
  name?: string;
  description?: string | null;
  homeGymId?: string | null;
  imageUrl?: string | null;
  region?: CrewRegion | null;
  isRecruiting?: boolean;
};

export function useUpdateCrew() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: UpdateCrewArgs) => {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (args.name !== undefined) patch.name = args.name.trim();
      if (args.description !== undefined) patch.description = args.description?.trim() || null;
      if (args.homeGymId !== undefined) patch.home_gym_id = args.homeGymId;
      if (args.region !== undefined) patch.region = args.region;
      if (args.imageUrl !== undefined) patch.image_url = args.imageUrl;
      if (args.isRecruiting !== undefined) patch.is_recruiting = args.isRecruiting;
      const { error } = await supabase.from('crews').update(patch).eq('id', args.crewId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crews', 'detail', vars.crewId] });
      queryClient.invalidateQueries({ queryKey: ['crews', 'mine'] });
    },
  });
}

// owner 위임 + 본인 탈퇴 (옵션). 트랜잭션 없이 순차 — 부분 실패 시
// caller 가 inconsistency 인지 가능 (rare, MVP 수용).
export function useTransferAndLeave() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async ({
      crewId,
      newOwnerId,
      alsoLeave,
    }: {
      crewId: string;
      newOwnerId: string;
      alsoLeave: boolean;
    }) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      if (newOwnerId === userId) throw new Error('자기 자신에게 위임할 수 없어요');

      // 1) 새 owner 의 crew_members.role → 'owner'
      const { error: e1 } = await supabase
        .from('crew_members')
        .update({ role: 'owner' })
        .eq('crew_id', crewId)
        .eq('user_id', newOwnerId);
      if (e1) throw new Error(e1.message);

      // 2) 본인 crew_members.role → 'member'
      const { error: e2 } = await supabase
        .from('crew_members')
        .update({ role: 'member' })
        .eq('crew_id', crewId)
        .eq('user_id', userId);
      if (e2) throw new Error(e2.message);

      // 3) crews.owner_id 변경
      const { error: e3 } = await supabase
        .from('crews')
        .update({ owner_id: newOwnerId, updated_at: new Date().toISOString() })
        .eq('id', crewId);
      if (e3) throw new Error(e3.message);

      // 4) (옵션) 본인 탈퇴
      if (alsoLeave) {
        const { error: e4 } = await supabase
          .from('crew_members')
          .delete()
          .eq('crew_id', crewId)
          .eq('user_id', userId);
        if (e4) throw new Error(e4.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
    },
  });
}

export function useDeleteCrew() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (crewId: string) => {
      const { error } = await supabase.from('crews').delete().eq('id', crewId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
    },
  });
}
