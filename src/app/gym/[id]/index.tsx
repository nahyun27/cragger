import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import {
  COLOR_VOTE_THRESHOLD,
  resolveColorHex,
  resolveColorLabel,
} from '@/constants/climb-colors';
import { useFavoriteGymIds, useToggleFavorite } from '@/hooks/use-favorites';
import { useGymDetail, type ColorStat } from '@/hooks/use-gym-detail';

export default function GymDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useGymDetail(id);
  const { data: favoriteIds } = useFavoriteGymIds();
  const toggleFavorite = useToggleFavorite();
  const favorited = !!id && !!favoriteIds?.has(id);

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
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </Pressable>
        <Text className="text-text-primary text-base font-bold">암장 정보</Text>
        <Pressable
          onPress={() => {
            if (!id) return;
            toggleFavorite.mutate({ gymId: id, currentlyFavorite: favorited });
          }}
          className="p-2 -mr-2 active:opacity-60"
          hitSlop={8}
        >
          <Feather
            name="star"
            size={24}
            color={favorited ? '#f59e0b' : '#94a3b8'}
            fill={favorited ? '#f59e0b' : 'transparent'}
          />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-5 gap-6">
        {/* Title Section */}
        <View className="gap-1.5">
          <View className="flex-row items-baseline gap-2 flex-wrap">
            <Text className="text-2xl font-extrabold text-text-primary tracking-tight">
              {data.name}
            </Text>
            {data.branch && (
              <Text className="text-lg font-bold text-brand-primary">
                {data.branch}
              </Text>
            )}
          </View>
          {location && (
            <View className="flex-row items-start gap-1.5 mt-1.5">
              <Feather name="map-pin" size={14} color="#64748b" style={{ marginTop: 2 }} />
              <Text className="text-text-secondary text-sm flex-1 leading-5">
                {[location, data.address].filter(Boolean).join(' · ')}
              </Text>
            </View>
          )}
        </View>

        {/* Spec Cards Grid */}
        {(data.size_pyeong || data.floors_count || data.opened_at) && (
          <View className="flex-row gap-3">
            {data.size_pyeong && (
              <View className="flex-1 bg-background-secondary p-3.5 rounded-2xl border border-border-subtle items-center">
                <Feather name="maximize-2" size={16} color="#06b6d4" className="mb-1" />
                <Text className="text-text-tertiary text-[10px] mb-0.5">규모</Text>
                <Text className="text-text-primary text-sm font-bold">{data.size_pyeong}평</Text>
              </View>
            )}
            {data.floors_count && (
              <View className="flex-1 bg-background-secondary p-3.5 rounded-2xl border border-border-subtle items-center">
                <Feather name="layers" size={16} color="#06b6d4" className="mb-1" />
                <Text className="text-text-tertiary text-[10px] mb-0.5">층수</Text>
                <Text className="text-text-primary text-sm font-bold">{data.floors_count}층</Text>
              </View>
            )}
            {data.opened_at && (
              <View className="flex-1 bg-background-secondary p-3.5 rounded-2xl border border-border-subtle items-center">
                <Feather name="calendar" size={16} color="#06b6d4" className="mb-1" />
                <Text className="text-text-tertiary text-[10px] mb-0.5">오픈</Text>
                <Text className="text-text-primary text-sm font-bold">
                  {new Date(data.opened_at).getFullYear()}년
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Tags Section */}
        {allTags.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5">
            {allTags.map((tag) => (
              <View
                key={tag}
                className="px-3 py-1.5 rounded-xl bg-background-secondary border border-border-subtle flex-row items-center gap-1.5"
              >
                <View className="w-1.5 h-1.5 rounded-full bg-brand-primary/60" />
                <Text className="text-text-secondary text-xs font-semibold">{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Description */}
        {data.description && (
          <View className="bg-brand-primary/5 border border-brand-primary/10 rounded-2xl p-4">
            <Text className="text-text-primary text-sm leading-6">
              {data.description}
            </Text>
          </View>
        )}

        {/* Color stats (Difficulty levels) */}
        <View className="gap-3.5">
          <Text className="text-text-primary text-lg font-bold">
            색깔별 체감 난이도
          </Text>
          {data.color_stats.length === 0 ? (
            <View className="p-8 items-center justify-center bg-background-secondary rounded-2xl border border-border-subtle">
              <Feather name="bar-chart-2" size={24} color="#94a3b8" className="mb-2" />
              <Text className="text-text-secondary text-sm">아직 투표가 없습니다</Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {data.color_stats.map((stat) => (
                <ColorStatRow key={stat.color} stat={stat} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky vote button */}
      <View className="px-5 pt-3 pb-3 border-t border-border-subtle bg-background-primary">
        <Pressable
          onPress={() =>
            router.push({ pathname: '/gym/[id]/vote', params: { id: data.id } })
          }
          className="bg-brand-primary rounded-2xl py-4 px-6 items-center flex-row justify-center gap-2 active:opacity-90 shadow-sm"
        >
          <Feather name="thumbs-up" size={16} color="white" />
          <Text className="text-white font-bold text-base">
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
  const needsBorder = stat.color.toLowerCase() === 'white';
  // V0..V8+ → 0..8.5 numeric scale. Spec uses V8+ as the right edge of the track.
  const fillPct =
    stat.avg_v_grade != null ? Math.min(100, Math.max(2, (stat.avg_v_grade / 8.5) * 100)) : 0;

  return (
    <View
      className="flex-row items-center gap-3 p-3 rounded-2xl bg-background-secondary border border-border-subtle"
      style={!hasEnoughVotes && { opacity: 0.65 }}
    >
      {/* Color pill (left) */}
      <View
        className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border"
        style={{
          backgroundColor: hex + '15',
          borderColor: hex,
          flexShrink: 0,
        }}
      >
        <View
          className="w-2.5 h-2.5 rounded-full"
          style={{
            backgroundColor: hex,
            ...(needsBorder ? { borderWidth: 1, borderColor: '#D4D4D8' } : null),
          }}
        />
        <Text
          className="text-xs font-bold"
          style={{ color: needsBorder ? '#1e293b' : hex }}
        >
          {label}
        </Text>
      </View>

      {/* Track with scale labels + knob (middle, grows) */}
      <View className="flex-1 gap-1.5">
        <View className="flex-row justify-between">
          {['V0', 'V2', 'V4', 'V6', 'V8+'].map((g) => (
            <Text
              key={g}
              className="text-text-muted"
              style={{ fontSize: 9, fontWeight: '500', fontFamily: 'Menlo' }}
            >
              {g}
            </Text>
          ))}
        </View>
        <View className="h-1.5 bg-background-tertiary rounded-full relative">
          {hasEnoughVotes && stat.avg_v_grade != null && (
            <>
              <View
                className="absolute left-0 top-0 h-full bg-brand-primary rounded-full"
                style={{ width: `${fillPct}%` }}
              />
              <View
                className="absolute w-3.5 h-3.5 rounded-full bg-brand-primary border-2 border-white"
                style={{
                  left: `${fillPct}%`,
                  top: -4,
                  marginLeft: -7,
                  shadowColor: '#000',
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: 2,
                }}
              />
            </>
          )}
        </View>
      </View>

      {/* Average + vote count (right) */}
      <View className="items-end" style={{ minWidth: 70, flexShrink: 0 }}>
        {hasEnoughVotes && stat.avg_v_grade_label ? (
          <>
            <Text className="text-text-primary text-xs font-extrabold">
              평균 {stat.avg_v_grade_label}
            </Text>
            <Text
              className="text-text-tertiary mt-0.5"
              style={{ fontSize: 10, fontWeight: '600' }}
            >
              {stat.vote_count}표
            </Text>
          </>
        ) : (
          <>
            <Text className="text-text-muted text-xs font-semibold">데이터</Text>
            <Text
              className="text-text-muted mt-0.5"
              style={{ fontSize: 10, fontWeight: '600' }}
            >
              {stat.vote_count}표 · {COLOR_VOTE_THRESHOLD}표 필요
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
