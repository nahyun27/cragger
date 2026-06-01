import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type FootShape = 'egyptian' | 'greek' | 'roman' | 'square';
export type FootWidth = 'narrow' | 'normal' | 'wide' | 'very_wide';
export type InstepHeight = 'low' | 'normal' | 'high';
export type ArchType = 'flat' | 'normal' | 'high';

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  instagram_handle: string | null;
  height_cm: number | null;
  reach_cm: number | null;
  weight_kg: number | null;
  weight_visible: boolean;
  climbing_start_date: string | null;
  foot_length_mm: number | null;
  shoe_size_mm: number | null;
  foot_shape: FootShape | null;
  foot_width: FootWidth | null;
  instep_height: InstepHeight | null;
  arch_type: ArchType | null;
  is_private: boolean;
  featured_badge_key: string | null;
};

const PROFILE_COLUMNS =
  'id, username, display_name, avatar_url, bio, instagram_handle, height_cm, reach_cm, weight_kg, weight_visible, climbing_start_date, foot_length_mm, shoe_size_mm, foot_shape, foot_width, instep_height, arch_type, is_private, featured_badge_key';

export function useProfile() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['profiles', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', userId!)
        .single();
      if (error) throw new Error(error.message);
      return data as Profile;
    },
  });
}

// 다른 사용자의 공개 프로필 — RLS 가 profiles_select_all 이라 누구나 조회 가능.
export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profiles', 'public', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', userId!)
        .single();
      if (error) throw new Error(error.message);
      return data as Profile;
    },
  });
}

export type UpdateProfileArgs = {
  username?: string;
  instagramHandle?: string | null;
  displayName?: string | null;
  bio?: string | null;
  heightCm?: number | null;
  reachCm?: number | null;
  weightKg?: number | null;
  weightVisible?: boolean;
  climbingStartDate?: string | null;
  avatarUrl?: string | null;
  footLengthMm?: number | null;
  shoeSizeMm?: number | null;
  footShape?: FootShape | null;
  footWidth?: FootWidth | null;
  instepHeight?: InstepHeight | null;
  archType?: ArchType | null;
  isPrivate?: boolean;
  featuredBadgeKey?: string | null;
};

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (args: UpdateProfileArgs) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const patch: Record<string, unknown> = {};
      if (args.username !== undefined) patch.username = args.username;
      if (args.instagramHandle !== undefined) patch.instagram_handle = args.instagramHandle;
      if (args.displayName !== undefined) patch.display_name = args.displayName;
      if (args.bio !== undefined) patch.bio = args.bio;
      if (args.heightCm !== undefined) patch.height_cm = args.heightCm;
      if (args.reachCm !== undefined) patch.reach_cm = args.reachCm;
      if (args.weightKg !== undefined) patch.weight_kg = args.weightKg;
      if (args.weightVisible !== undefined) patch.weight_visible = args.weightVisible;
      if (args.climbingStartDate !== undefined) patch.climbing_start_date = args.climbingStartDate;
      if (args.avatarUrl !== undefined) patch.avatar_url = args.avatarUrl;
      if (args.footLengthMm !== undefined) patch.foot_length_mm = args.footLengthMm;
      if (args.shoeSizeMm !== undefined) patch.shoe_size_mm = args.shoeSizeMm;
      if (args.footShape !== undefined) patch.foot_shape = args.footShape;
      if (args.footWidth !== undefined) patch.foot_width = args.footWidth;
      if (args.instepHeight !== undefined) patch.instep_height = args.instepHeight;
      if (args.archType !== undefined) patch.arch_type = args.archType;
      if (args.isPrivate !== undefined) patch.is_private = args.isPrivate;
      if (args.featuredBadgeKey !== undefined) patch.featured_badge_key = args.featuredBadgeKey;
      const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
      if (error) {
        // Postgres unique violation on username
        if (error.code === '23505' || /username/i.test(error.message)) {
          throw new Error('이미 사용 중인 닉네임이에요');
        }
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

// Username availability check (debounced from the caller).
// Returns true if available (no other user owns it), false if taken,
// null while loading or for invalid input.
export function useCheckUsername(candidate: string, currentUsername: string | null) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  const trimmed = candidate.trim();
  const isOwn = trimmed.length > 0 && trimmed === currentUsername;
  const valid = trimmed.length >= 2 && trimmed.length <= 30;
  return useQuery({
    queryKey: ['username-check', trimmed] as const,
    enabled: !!userId && valid && !isOwn,
    staleTime: 30_000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmed)
        .limit(1);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<{ id: string }>;
      return rows.length === 0 || rows[0].id === userId;
    },
  });
}
