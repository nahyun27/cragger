import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  const avgByColor = useMemo(() => {
    const m = new Map<string, GymColorAvg>();
    for (const a of avgs ?? []) m.set(a.color, a);
    return m;
  }, [avgs]);

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
      <View className="flex-row items-center px-2 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2" hitSlop={8}>
          <Text className="text-text-primary text-2xl">←</Text>
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold">
          난이도 투표
        </Text>
        <View className="w-10" />
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
        <FlatList
          data={colors}
          keyExtractor={(item) => item.color}
          renderItem={({ item }) => (
            <VoteRow color={item} onPress={() => setPickerColor(item.color)} />
          )}
          contentContainerClassName="px-4 pb-6"
          ItemSeparatorComponent={() => <View className="h-px bg-border-subtle" />}
        />
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
