import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { SessionCategory } from '@/constants/session-category';
import { useAuth } from '@/lib/auth-context';
import {
  cancelWorkoutReminderForPlan,
  scheduleWorkoutReminder,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

export type SessionPlan = {
  id: string;
  planned_date: string;
  planned_time: string | null;
  notes: string | null;
  completed_session_id: string | null;
  category: SessionCategory | null;
  gym: {
    id: string;
    name: string;
    branch: string | null;
    logo_url: string | null;
    logo_bg_hex: string | null;
  } | null;
};

export type SessionPlansResult = {
  plans: SessionPlan[];
  byDate: Record<string, SessionPlan[]>;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function startOfMonth(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`;
}

function startOfNextMonth(year: number, month: number): string {
  if (month === 12) return `${year + 1}-01-01`;
  return `${year}-${pad2(month + 1)}-01`;
}

// 한 달치 계획 조회 (캘린더 표시용).
export function useMonthlyPlans(year: number, month: number) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['session_plans', userId, 'monthly', year, month] as const,
    enabled: !!userId,
    queryFn: async (): Promise<SessionPlansResult> => {
      const from = startOfMonth(year, month);
      const to = startOfNextMonth(year, month);
      const { data, error } = await supabase
        .from('session_plans')
        .select(
          'id, planned_date, planned_time, notes, completed_session_id, category, gym:gyms(id, name, branch, logo_url, logo_bg_hex)',
        )
        .eq('user_id', userId!)
        .gte('planned_date', from)
        .lt('planned_date', to)
        .order('planned_date', { ascending: true })
        .order('planned_time', { ascending: true, nullsFirst: false });
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as SessionPlan[];
      const byDate: Record<string, SessionPlan[]> = {};
      for (const p of rows) {
        if (!byDate[p.planned_date]) byDate[p.planned_date] = [];
        byDate[p.planned_date].push(p);
      }
      return { plans: rows, byDate };
    },
  });
}

type CreatePlanInput = {
  gymId: string | null;
  gymName: string;                // 알림 본문에 노출 (gym 없으면 '운동' 등)
  plannedDate: string;            // 'YYYY-MM-DD'
  plannedTime?: string | null;    // 'HH:mm' 또는 null
  notes?: string | null;
  category?: SessionCategory | null;
};

export function useCreatePlan() {
  const qc = useQueryClient();
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;

  return useMutation({
    mutationFn: async (input: CreatePlanInput) => {
      if (!userId) throw new Error('로그인이 필요해요');
      const { data, error } = await supabase
        .from('session_plans')
        .insert({
          user_id: userId,
          gym_id: input.gymId ?? null,
          planned_date: input.plannedDate,
          planned_time: input.plannedTime ?? null,
          notes: input.notes?.trim() ? input.notes.trim() : null,
          category: input.category ?? null,
        })
        .select('id, planned_date')
        .single();
      if (error) throw new Error(error.message);
      // 로컬 D-day 알림 예약. 권한·시점 등 실패 시 조용히 패스.
      void scheduleWorkoutReminder({
        planId: data.id,
        gymName: input.gymName,
        plannedDate: input.plannedDate,
        plannedTime: input.plannedTime ?? null,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session_plans', userId, 'monthly'] });
    },
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;

  return useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase.from('session_plans').delete().eq('id', planId);
      if (error) throw new Error(error.message);
      void cancelWorkoutReminderForPlan(planId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session_plans', userId, 'monthly'] });
    },
  });
}
