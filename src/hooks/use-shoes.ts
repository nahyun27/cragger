import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type ShoeStatus = 'active' | 'retired' | 'resole_pending';

export const SHOE_STATUS_LABEL: Record<ShoeStatus, string> = {
  active: '사용중',
  retired: '은퇴',
  resole_pending: '리솔 대기',
};

export type OwnershipStatus = 'owned' | 'resale_size' | 'resale_fit';
export type WantedFit = 'performance' | 'comfort';
export type FitPerception =
  | 'much_smaller'
  | 'slightly_smaller'
  | 'perfect'
  | 'slightly_larger'
  | 'much_larger';
export type Stiffness = 'very_soft' | 'soft' | 'normal' | 'stiff' | 'very_stiff';
export type Stretch = 'none' | 'little' | 'normal' | 'much' | 'very_much';

export const OWNERSHIP_LABEL: Record<OwnershipStatus, string> = {
  owned: '현재 보유 중',
  resale_size: '사이즈 미스로 처분(예정)',
  resale_fit: '내 족형에 안맞아서 처분(예정)',
};
export const WANTED_FIT_LABEL: Record<WantedFit, { label: string; sub: string }> = {
  performance: { label: '퍼포먼스 핏', sub: '타이트하게 신음' },
  comfort: { label: '컴포트 핏', sub: '편안하게 신음' },
};
export const FIT_PERCEPTION_LABEL: Record<FitPerception, string> = {
  much_smaller: '의도보다 훨씬 작음',
  slightly_smaller: '의도보다 약간 작음',
  perfect: '딱 좋음',
  slightly_larger: '의도보다 약간 큼',
  much_larger: '의도보다 훨씬 큼',
};
export const FIT_PERCEPTION_SHORT: Record<FitPerception, string> = {
  much_smaller: '훨씬 작음',
  slightly_smaller: '약간 작음',
  perfect: '딱 맞음',
  slightly_larger: '약간 큼',
  much_larger: '훨씬 큼',
};
export const STIFFNESS_LABEL: Record<Stiffness, string> = {
  very_soft: '매우 부드러움',
  soft: '부드러움',
  normal: '보통',
  stiff: '딱딱함',
  very_stiff: '매우 딱딱함',
};
export const STRETCH_LABEL: Record<Stretch, string> = {
  none: '전혀 안 늘어남',
  little: '거의 안 늘어남',
  normal: '보통',
  much: '잘 늘어남',
  very_much: '매우 잘 늘어남',
};

export const USAGE_OPTIONS = [
  '자연 볼더링',
  '자연 리드',
  '실내 볼더링',
  '인공 리드',
  '다목적',
  '크랙',
  '슬랩',
  '오버행',
  '스피드',
  '멀티피치',
] as const;

export const FIT_FEATURE_OPTIONS = [
  '발볼 넓음',
  '발볼 좁음',
  '뒤꿈치 잘 맞음',
  '뒤꿈치 헐렁함',
  '엄지 압박',
  '발등 압박',
  '아치 잘 맞음',
] as const;

export type RatingKey =
  | 'overall'
  | 'edging'
  | 'smearing'
  | 'toehook'
  | 'heelhook'
  | 'sensitivity'
  | 'comfort'
  | 'durability'
  | 'value'
  | 'design';

export const RATING_LABEL: Record<RatingKey, { label: string; sub: string }> = {
  overall: { label: '전반적 평점', sub: '이 신발의 전체적인 만족도는 어떤가요?' },
  edging: { label: '에징', sub: '작은 홀드에 서는 능력' },
  smearing: { label: '스미어링', sub: '마찰력으로 밀착하는 능력' },
  toehook: { label: '토훅', sub: '발끝으로 거는 능력' },
  heelhook: { label: '힐훅', sub: '뒤꿈치로 거는 능력' },
  sensitivity: { label: '감도', sub: '홀드를 느끼는 정도' },
  comfort: { label: '편안함', sub: '장시간 착용 시 편안함' },
  durability: { label: '내구성', sub: '밑창·갑피 마모 저항성' },
  value: { label: '가성비', sub: '가격 대비 만족도' },
  design: { label: '디자인', sub: '외관 디자인 만족도' },
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
  // Review fields
  ownership_status: OwnershipStatus | null;
  wanted_fit: WantedFit | null;
  fit_perception: FitPerception | null;
  stiffness: Stiffness | null;
  stretch: Stretch | null;
  usages: string[];
  fit_features: string[];
  is_primary: boolean;
  rating_overall: number | null;
  rating_edging: number | null;
  rating_smearing: number | null;
  rating_toehook: number | null;
  rating_heelhook: number | null;
  rating_sensitivity: number | null;
  rating_comfort: number | null;
  rating_durability: number | null;
  rating_value: number | null;
  rating_design: number | null;
};

const COLUMNS =
  'id, user_id, brand, model, size, status, purchased_at, image_url, note, created_at, updated_at, ownership_status, wanted_fit, fit_perception, stiffness, stretch, usages, fit_features, is_primary, rating_overall, rating_edging, rating_smearing, rating_toehook, rating_heelhook, rating_sensitivity, rating_comfort, rating_durability, rating_value, rating_design';

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
        .order('is_primary', { ascending: false })
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
  ownershipStatus: OwnershipStatus | null;
  wantedFit: WantedFit | null;
  fitPerception: FitPerception | null;
  stiffness: Stiffness | null;
  stretch: Stretch | null;
  usages: string[];
  fitFeatures: string[];
  isPrimary: boolean;
  ratingOverall: number | null;
  ratingEdging: number | null;
  ratingSmearing: number | null;
  ratingToehook: number | null;
  ratingHeelhook: number | null;
  ratingSensitivity: number | null;
  ratingComfort: number | null;
  ratingDurability: number | null;
  ratingValue: number | null;
  ratingDesign: number | null;
};

function toRow(args: ShoeInput) {
  return {
    brand: args.brand?.trim() || null,
    model: args.model.trim(),
    size: args.size?.trim() || null,
    status: args.status,
    purchased_at: args.purchasedAt,
    note: args.note?.trim() || null,
    ownership_status: args.ownershipStatus,
    wanted_fit: args.wantedFit,
    fit_perception: args.fitPerception,
    stiffness: args.stiffness,
    stretch: args.stretch,
    usages: args.usages,
    fit_features: args.fitFeatures,
    is_primary: args.isPrimary,
    rating_overall: args.ratingOverall,
    rating_edging: args.ratingEdging,
    rating_smearing: args.ratingSmearing,
    rating_toehook: args.ratingToehook,
    rating_heelhook: args.ratingHeelhook,
    rating_sensitivity: args.ratingSensitivity,
    rating_comfort: args.ratingComfort,
    rating_durability: args.ratingDurability,
    rating_value: args.ratingValue,
    rating_design: args.ratingDesign,
  };
}

// 한 사용자에 주력 신발은 1켤레만. is_primary=true 로 세팅하기 전에
// 동일 사용자의 다른 신발 is_primary 를 모두 false 로 클리어.
async function clearOtherPrimary(userId: string, exceptShoeId: string | null) {
  let q = supabase
    .from('climbing_shoes')
    .update({ is_primary: false })
    .eq('user_id', userId)
    .eq('is_primary', true);
  if (exceptShoeId) q = q.neq('id', exceptShoeId);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export function useCreateShoe() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (args: ShoeInput): Promise<{ id: string }> => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const row = toRow(args);
      if (!row.model) throw new Error('모델명을 입력하세요');
      if (row.is_primary) await clearOtherPrimary(userId, null);
      const { data, error } = await supabase
        .from('climbing_shoes')
        .insert({ user_id: userId, ...row })
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
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async ({ shoeId, ...args }: ShoeInput & { shoeId: string }) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const row = toRow(args);
      if (!row.model) throw new Error('모델명을 입력하세요');
      if (row.is_primary) await clearOtherPrimary(userId, shoeId);
      const { error } = await supabase
        .from('climbing_shoes')
        .update({ ...row, updated_at: new Date().toISOString() })
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
