import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type SupportCategory =
  | 'general'
  | 'bug'
  | 'feature'
  | 'account'
  | 'gym_data'
  | 'other';

export type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'cancelled';

export type SupportInquiry = {
  id: string;
  user_id: string;
  category: SupportCategory;
  subject: string;
  body: string;
  contact_email: string | null;
  status: SupportStatus;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export const CATEGORY_LABEL: Record<SupportCategory, string> = {
  general: '일반 문의',
  bug: '버그 신고',
  feature: '기능 제안',
  account: '계정/로그인',
  gym_data: '암장 정보 오류',
  other: '기타',
};

export const STATUS_LABEL: Record<SupportStatus, string> = {
  open: '접수됨',
  in_progress: '확인 중',
  resolved: '답변 완료',
  cancelled: '취소됨',
};

const COLS =
  'id, user_id, category, subject, body, contact_email, status, admin_response, responded_at, created_at, updated_at';

export function useMySupportInquiries() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['support', 'mine', uid] as const,
    enabled: !!uid,
    queryFn: async (): Promise<SupportInquiry[]> => {
      const { data, error } = await supabase
        .from('support_inquiries')
        .select(COLS)
        .eq('user_id', uid!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as SupportInquiry[];
    },
  });
}

export type CreateInquiryArgs = {
  category: SupportCategory;
  subject: string;
  body: string;
  contactEmail?: string | null;
};

export function useCreateSupportInquiry() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (args: CreateInquiryArgs): Promise<SupportInquiry> => {
      const uid = session?.user.id;
      if (!uid) throw new Error('로그인이 필요해요');
      const { data, error } = await supabase
        .from('support_inquiries')
        .insert({
          user_id: uid,
          category: args.category,
          subject: args.subject.trim(),
          body: args.body.trim(),
          contact_email: args.contactEmail?.trim() || null,
        })
        .select(COLS)
        .single();
      if (error) throw new Error(error.message);
      return data as SupportInquiry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support', 'mine'] });
    },
  });
}

export function useCancelSupportInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('support_inquiries')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support', 'mine'] });
    },
  });
}
