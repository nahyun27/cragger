import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  COLOR_VOTE_THRESHOLD,
  resolveColorHex,
  resolveColorLabel,
} from '@/constants/climb-colors';
import { useGymDetail, type ColorStat } from '@/hooks/use-gym-detail';

export default function GymDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useGymDetail(id);
  const [favorited, setFavorited] = useState(false);

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center"
        edges={['top', 'bottom']}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center p-6"
        edges={['top', 'bottom']}
      >
        <Text className="text-status-danger text-center mb-4">
          {error?.message ?? '암장을 찾을 수 없어요'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="border border-border-default rounded-md px-4 py-2"
        >
          <Text className="text-text-primary">돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const sports = [
    data.has_boulder && '볼더링',
    data.has_lead && '리드',
    data.has_top_rope && '탑로프',
    data.has_speed && '스피드',
    data.has_auto_belay && '오토빌레이',
  ].filter(Boolean) as string[];

  const boards = [
    data.has_moonboard && '문보드',
    data.has_kilter && '킬터',
    data.has_tension && '텐션',
  ].filter(Boolean) as string[];

  const allTags = [...sports, ...boards];

  const location = [data.city, data.district].filter(Boolean).join(' ');
  const sizeLine = [
    data.size_pyeong ? `${data.size_pyeong}평` : null,
    data.floors_count ? `${data.floors_count}층` : null,
    data.opened_at ? `${new Date(data.opened_at).getFullYear()}년 오픈` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-2 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2" hitSlop={8}>
          <Text className="text-text-primary text-2xl">←</Text>
        </Pressable>
        <View className="flex-1 items-center px-2">
          <Text
            className="text-text-primary text-base font-semibold"
            numberOfLines={1}
          >
            {data.name}
          </Text>
          {data.branch && (
            <Text className="text-text-tertiary text-xs" numberOfLines={1}>
              {data.branch}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => setFavorited((v) => !v)}
          className="p-2"
          hitSlop={8}
        >
          <Text className="text-2xl">{favorited ? '★' : '☆'}</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
        {/* Meta */}
        <View className="gap-1">
          {location && (
            <Text className="text-text-secondary">
              {[location, data.address].filter(Boolean).join(' · ')}
            </Text>
          )}
          {sizeLine && (
            <Text className="text-text-secondary text-sm">{sizeLine}</Text>
          )}
          {allTags.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5 mt-2">
              {allTags.map((tag) => (
                <View
                  key={tag}
                  className="px-2 py-0.5 rounded-full bg-background-secondary"
                >
                  <Text className="text-text-secondary text-xs">{tag}</Text>
                </View>
              ))}
            </View>
          )}
          {data.description && (
            <Text className="text-text-primary mt-3 leading-5">
              {data.description}
            </Text>
          )}
        </View>

        {/* Color stats */}
        <View className="gap-3">
          <Text className="text-text-primary text-lg font-bold">
            색깔별 체감 난이도
          </Text>
          {data.color_stats.length === 0 ? (
            <View className="p-6 items-center bg-background-secondary rounded-md">
              <Text className="text-text-secondary">아직 투표가 없습니다</Text>
            </View>
          ) : (
            <View className="gap-3">
              {data.color_stats.map((stat) => (
                <ColorStatRow key={stat.color} stat={stat} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky vote button */}
      <View className="px-4 pt-2 pb-2 border-t border-border-subtle">
        <Pressable
          onPress={() =>
            Alert.alert('투표', '난이도 투표 화면은 별도 작업입니다.')
          }
          className="bg-brand-primary rounded-md p-4 items-center"
        >
          <Text className="text-background-primary font-semibold">
            이 암장 난이도 투표하기
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ColorStatRow({ stat }: { stat: ColorStat }) {
  const hex = resolveColorHex(stat.color);
  const label = resolveColorLabel(stat.color);
  const hasEnoughVotes = stat.vote_count >= COLOR_VOTE_THRESHOLD;
  const dotIndex =
    stat.avg_v_grade !== null
      ? Math.min(4, Math.max(0, Math.floor(stat.avg_v_grade / 2)))
      : null;
  const needsBorder = stat.color.toLowerCase() === 'white';

  return (
    <View className="flex-row items-center gap-3">
      <View
        className="w-8 h-8 rounded-full"
        style={{
          backgroundColor: hex,
          ...(needsBorder ? { borderWidth: 1, borderColor: '#D4D4D8' } : null),
        }}
      />
      <View className="flex-1">
        <Text className="text-text-primary font-medium">{label}</Text>
        {hasEnoughVotes && dotIndex !== null ? (
          <View className="flex-row items-center gap-1.5 mt-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                className={
                  i === dotIndex
                    ? 'w-2.5 h-2.5 rounded-full bg-brand-primary'
                    : 'w-2 h-2 rounded-full bg-background-tertiary'
                }
              />
            ))}
            <Text className="text-text-secondary text-xs ml-2">
              평균 {stat.avg_v_grade_label} · {stat.vote_count}표
            </Text>
          </View>
        ) : (
          <Text className="text-text-tertiary text-xs mt-1">
            데이터 모으는 중 ({stat.vote_count}표)
          </Text>
        )}
      </View>
    </View>
  );
}
