import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import {
  useUnvotePoll,
  useVotePoll,
  type PollOption,
  type PollWithMyVote,
} from '@/hooks/use-polls';

type Props = {
  poll: PollWithMyVote;
};

function isClosed(closesAt: string | null): boolean {
  if (!closesAt) return false;
  return new Date(closesAt).getTime() < Date.now();
}

function formatCloses(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${m}.${day} ${hh}:${mi}`;
}

export function PollWidget({ poll }: Props) {
  const vote = useVotePoll();
  const unvote = useUnvotePoll();
  const closed = isClosed(poll.closes_at);
  const hasVoted = poll.my_option_ids.size > 0;
  const showResults = hasVoted || closed;
  const busy = vote.isPending || unvote.isPending;

  // unique voters 추정: is_multi 면 total_votes 가 중복. 우선 표기는
  // "참여 N표" 로 단순. 정확한 unique 카운트는 별도 쿼리 필요해 일단 보류.
  const totalLabel = poll.is_multi
    ? `${poll.total_votes}표`
    : `${poll.total_votes}명 참여`;

  function handlePick(opt: PollOption) {
    if (closed || busy) return;
    const already = poll.my_option_ids.has(opt.id);
    if (poll.is_multi) {
      if (already) {
        unvote.mutate({ pollId: poll.id, optionId: opt.id });
      } else {
        vote.mutate({ pollId: poll.id, optionId: opt.id, clearExisting: false });
      }
    } else {
      // 단일 선택
      if (already) {
        // 같은 옵션 다시 누르면 취소
        unvote.mutate({ pollId: poll.id, optionId: opt.id });
      } else {
        vote.mutate({ pollId: poll.id, optionId: opt.id, clearExisting: true });
      }
    }
  }

  return (
    <View style={{
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 14,
      padding: 12,
      gap: 10,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Feather name="bar-chart-2" size={14} color="#06b6d4" />
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
          {poll.question}
        </Text>
        {busy && <ActivityIndicator size="small" color="#06b6d4" />}
      </View>

      <View style={{ gap: 6 }}>
        {poll.options.map((opt) => (
          <PollOptionRow
            key={opt.id}
            opt={opt}
            total={poll.total_votes}
            picked={poll.my_option_ids.has(opt.id)}
            showResults={showResults}
            closed={closed}
            onPress={() => handlePick(opt)}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8' }}>
          {totalLabel}
        </Text>
        {poll.is_multi && (
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8' }}>
            · 복수 선택
          </Text>
        )}
        {closed ? (
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>
            · 마감됨
          </Text>
        ) : poll.closes_at ? (
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8' }}>
            · {formatCloses(poll.closes_at)} 마감
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function PollOptionRow({
  opt,
  total,
  picked,
  showResults,
  closed,
  onPress,
}: {
  opt: PollOption;
  total: number;
  picked: boolean;
  showResults: boolean;
  closed: boolean;
  onPress: () => void;
}) {
  const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0;

  if (showResults) {
    return (
      <Pressable
        onPress={closed ? undefined : onPress}
        disabled={closed}
        style={({ pressed }) => [{ opacity: closed ? 1 : pressed ? 0.85 : 1 }]}
      >
        <View
          style={{
            position: 'relative',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: picked ? '#06b6d4' : '#e2e8f0',
            backgroundColor: '#ffffff',
            overflow: 'hidden',
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          {/* 비율 바 (배경) */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${pct}%`,
              backgroundColor: picked ? '#cffafe' : '#f1f5f9',
            }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {picked && <Feather name="check" size={12} color="#0e7490" />}
            <Text
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: picked ? '800' : '700',
                color: picked ? '#0e7490' : '#475569',
              }}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: picked ? '#0e7490' : '#64748b',
              }}
            >
              {pct}%
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  // 미투표 + 미마감
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 11,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: '#e2e8f0',
          backgroundColor: '#ffffff',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
          {opt.label}
        </Text>
      </View>
    </Pressable>
  );
}
