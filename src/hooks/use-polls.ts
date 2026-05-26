import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type PollOption = {
  id: string;
  poll_id: string;
  label: string;
  order_index: number;
  vote_count: number;
};

export type Poll = {
  id: string;
  post_id: string;
  question: string;
  is_multi: boolean;
  closes_at: string | null;
  created_at: string;
  options: PollOption[];
};

export type PollWithMyVote = Poll & {
  my_option_ids: Set<string>;  // 내가 찍은 option id 집합
  total_votes: number;          // sum(option.vote_count). is_multi 면 unique user 가 아님.
};

// ── 단일 post 의 poll 조회 ────────────────────────────────────
export function usePoll(postId: string | undefined) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['polls', postId, userId ?? null] as const,
    enabled: !!postId,
    queryFn: async (): Promise<PollWithMyVote | null> => {
      const { data: pollRow, error: pErr } = await supabase
        .from('post_polls')
        .select('id, post_id, question, is_multi, closes_at, created_at, options:poll_options(id, poll_id, label, order_index, vote_count)')
        .eq('post_id', postId!)
        .maybeSingle();
      if (pErr) throw new Error(pErr.message);
      if (!pollRow) return null;

      const poll = pollRow as unknown as Poll;
      const options = [...poll.options].sort((a, b) => a.order_index - b.order_index);
      const total = options.reduce((acc, o) => acc + o.vote_count, 0);

      let myOptionIds = new Set<string>();
      if (userId) {
        const { data: myVotes, error: vErr } = await supabase
          .from('poll_votes')
          .select('option_id')
          .eq('poll_id', poll.id)
          .eq('user_id', userId);
        if (vErr) throw new Error(vErr.message);
        myOptionIds = new Set(
          ((myVotes ?? []) as Array<{ option_id: string }>).map((v) => v.option_id),
        );
      }

      return { ...poll, options, my_option_ids: myOptionIds, total_votes: total };
    },
  });
}

// ── poll 생성 (글쓰기 끝 단계) ────────────────────────────────
export type CreatePollArgs = {
  postId: string;
  question: string;
  isMulti: boolean;
  closesAt: string | null;
  options: string[];  // label 들 (2~6개)
};

export function useCreatePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: CreatePollArgs) => {
      const labels = args.options.map((s) => s.trim()).filter((s) => s.length > 0);
      if (labels.length < 2) throw new Error('선택지를 2개 이상 입력하세요');
      if (labels.length > 6) throw new Error('선택지는 최대 6개');

      const { data: pollRow, error: pErr } = await supabase
        .from('post_polls')
        .insert({
          post_id: args.postId,
          question: args.question.trim(),
          is_multi: args.isMulti,
          closes_at: args.closesAt,
        })
        .select('id')
        .single();
      if (pErr) throw new Error(pErr.message);
      const pollId = (pollRow as { id: string }).id;

      const { error: oErr } = await supabase.from('poll_options').insert(
        labels.map((label, i) => ({
          poll_id: pollId,
          label,
          order_index: i,
        })),
      );
      if (oErr) throw new Error(oErr.message);
      return { pollId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}

// ── 투표 ─────────────────────────────────────────────────────
// 단일 선택이면 caller 가 기존 표 DELETE 후 INSERT (clearExisting=true).
// 복수 선택이면 그냥 INSERT (이미 표 있어도 다른 옵션).
export function useVotePoll() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async ({
      pollId,
      optionId,
      clearExisting,
    }: {
      pollId: string;
      optionId: string;
      clearExisting: boolean;
    }) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');

      if (clearExisting) {
        const { error: dErr } = await supabase
          .from('poll_votes')
          .delete()
          .eq('poll_id', pollId)
          .eq('user_id', userId);
        if (dErr) throw new Error(dErr.message);
      }

      const { error: iErr } = await supabase
        .from('poll_votes')
        .insert({ poll_id: pollId, option_id: optionId, user_id: userId });
      if (iErr && iErr.code !== '23505') {
        // 23505 = unique (중복 투표 시도). race 면 무시.
        throw new Error(iErr.message);
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}

// ── 투표 취소 (단일 옵션) ─────────────────────────────────────
export function useUnvotePoll() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: string; optionId: string }) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('option_id', optionId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}
