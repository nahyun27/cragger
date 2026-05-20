import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { GradePickerModal } from '@/components/vote/grade-picker-modal';
import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import { useGymDetail } from '@/hooks/use-gym-detail';
import {
  useGymColorAvgs,
  useSubmitGradeVote,
  useVoteableColors,
  type GymColorAvg,
  type VoteableColor,
} from '@/hooks/use-gym-vote';

export default function GymVoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: gym } = useGymDetail(id);
  const { data: colors, isLoading, error } = useVoteableColors(id);
  const { data: avgs } = useGymColorAvgs(id);
  const submitVote = useSubmitGradeVote();

  const [pickerColor, setPickerColor] = useState<string | null>(null);
  // 미투표 색깔을 디폴트로 숨김. 사용자가 "난이도 추가" 탭하면 펼침.
  const [showUnvoted, setShowUnvoted] = useState(false);

  const avgByColor = useMemo(() => {
    const m = new Map<string, GymColorAvg>();
    for (const a of avgs ?? []) m.set(a.color, a);
    return m;
  }, [avgs]);

  const { voted, unvoted } = useMemo(() => {
    const v: VoteableColor[] = [];
    const u: VoteableColor[] = [];
    for (const c of colors ?? []) {
      (c.currentVote ? v : u).push(c);
    }
    return { voted: v, unvoted: u };
  }, [colors]);

  const activePickerColorData = useMemo(() => {
    if (!pickerColor) return null;
    return colors?.find((x) => x.color === pickerColor) ?? null;
  }, [pickerColor, colors]);

  const activePickerAvg = pickerColor ? avgByColor.get(pickerColor) : undefined;

  async function handleSubmit(grade: string) {
    if (!id || !pickerColor) return;
    try {
      await submitVote.mutateAsync({ gymId: id, color: pickerColor, grade });
      setPickerColor(null);
    } catch (e) {
      Alert.alert('투표 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold mr-6">
          난이도 투표
        </Text>
      </View>

      {gym && (
        <View className="px-4 pt-3 pb-2">
          <Text className="text-text-primary text-base font-semibold">
            {gym.name}
            {gym.branch ? ` ${gym.branch}` : ''}
          </Text>
          <Text className="text-text-tertiary text-xs mt-0.5">
            이 암장의 색깔별 난이도를 평가해주세요
          </Text>
        </View>
      )}

      {isLoading && (
        <View className="p-6 items-center">
          <ActivityIndicator />
        </View>
      )}

      {error && (
        <View className="mx-4 mb-3 border border-status-danger rounded-md p-3 bg-background-secondary">
          <Text className="text-status-danger">{error.message}</Text>
        </View>
      )}

      {colors && (
        <ScrollView contentContainerClassName="px-4 pb-6">
          {voted.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-text-secondary text-center">
                아직 평가한 색깔이 없어요
              </Text>
              <Text className="text-text-tertiary text-xs text-center mt-1">
                아래 "난이도 추가" 버튼으로 시작하세요
              </Text>
            </View>
          ) : (
            <View>
              {voted.map((c, i) => (
                <View key={c.color}>
                  {i > 0 && <View className="h-px bg-border-subtle" />}
                  <VoteRow color={c} onPress={() => setPickerColor(c.color)} />
                </View>
              ))}
            </View>
          )}

          {unvoted.length > 0 && (
            <Pressable
              onPress={() => setShowUnvoted((v) => !v)}
              className="border border-dashed border-border-default rounded-lg py-3 items-center mt-4 active:opacity-60"
            >
              <Text className="text-text-secondary text-sm font-medium">
                {showUnvoted
                  ? `− 닫기`
                  : `+ 난이도 추가 (${unvoted.length}색)`}
              </Text>
            </Pressable>
          )}

          {showUnvoted && unvoted.length > 0 && (
            <View className="mt-3">
              <Text className="text-text-tertiary text-xs px-1 mb-1">
                아직 평가하지 않은 색깔
              </Text>
              {unvoted.map((c, i) => (
                <View key={c.color}>
                  {i > 0 && <View className="h-px bg-border-subtle" />}
                  <VoteRow color={c} onPress={() => setPickerColor(c.color)} />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <GradePickerModal
        visible={!!pickerColor}
        color={pickerColor ?? ''}
        currentVote={activePickerColorData?.currentVote ?? null}
        avgLabel={activePickerAvg?.avgVGradeLabel ?? null}
        voteCount={activePickerAvg?.voteCount ?? 0}
        isSubmitting={submitVote.isPending}
        onSubmit={handleSubmit}
        onClose={() => setPickerColor(null)}
      />
    </SafeAreaView>
  );
}

function VoteRow({
  color,
  onPress,
}: {
  color: VoteableColor;
  onPress: () => void;
}) {
  const hex = resolveColorHex(color.color);
  const label = resolveColorLabel(color.color);
  const needsBorder = color.color === 'white' || color.color === 'yellow';
  const voted = !!color.currentVote;
  return (
    <View className="flex-row items-center gap-3 py-3">
      <View
        className="w-8 h-8 rounded-full"
        style={{
          backgroundColor: hex,
          ...(needsBorder ? { borderWidth: 1, borderColor: '#D4D4D8' } : null),
        }}
      />
      <View className="flex-1">
        <Text className="text-text-primary font-medium">{label}</Text>
        {voted ? (
          <Text className="text-text-secondary text-xs mt-0.5">
            내 평가: <Text className="font-semibold">{color.currentVote}</Text>
          </Text>
        ) : (
          <Text className="text-text-tertiary text-xs mt-0.5">아직 투표 안 함</Text>
        )}
      </View>
      <Pressable
        onPress={onPress}
        className={`px-3 py-1.5 rounded-md ${
          voted ? 'border border-border-default' : 'bg-brand-primary'
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            voted ? 'text-text-primary' : 'text-background-primary'
          }`}
        >
          {voted ? '수정' : '투표하기'}
        </Text>
      </Pressable>
    </View>
  );
}
