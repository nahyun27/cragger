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
import { useGymDetail, type ColorScheme, type ColorStat } from '@/hooks/use-gym-detail';

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

        {/* Difficulty — official + crowd vote merged */}
        <View className="gap-3.5">
          <View className="flex-row items-end justify-between">
            <Text className="text-text-primary text-lg font-bold">난이도</Text>
            <Text className="text-text-tertiary text-xs">공식 / 체감 평균</Text>
          </View>
          {data.color_schemes.length === 0 && data.color_stats.length === 0 ? (
            <View className="p-8 items-center justify-center bg-background-secondary rounded-2xl border border-border-subtle">
              <Feather name="bar-chart-2" size={24} color="#94a3b8" className="mb-2" />
              <Text className="text-text-secondary text-sm">아직 난이도 데이터가 없습니다</Text>
            </View>
          ) : (
            <View className="bg-background-secondary border border-border-subtle rounded-2xl p-3 gap-1.5">
              {mergeColorRows(data.color_schemes, data.color_stats).map((row) => (
                <ColorRow key={row.color} row={row} />
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

type MergedColorRow = {
  color: string;
  hex: string;
  scheme: ColorScheme | null;
  stat: ColorStat | null;
};

function mergeColorRows(
  schemes: ColorScheme[],
  stats: ColorStat[],
): MergedColorRow[] {
  const statMap = new Map(stats.map((s) => [s.color.toLowerCase(), s]));
  const schemeMap = new Map(schemes.map((s) => [s.color.toLowerCase(), s]));
  const seen = new Set<string>();
  const out: MergedColorRow[] = [];

  // 1) 공식 색깔 체계 순서대로 (order_index)
  for (const sch of schemes) {
    const key = sch.color.toLowerCase();
    seen.add(key);
    out.push({
      color: sch.color,
      hex: sch.color_hex ?? resolveColorHex(sch.color),
      scheme: sch,
      stat: statMap.get(key) ?? null,
    });
  }

  // 2) 공식엔 없지만 투표만 있는 색깔 (체감만 모인 케이스) — 평균 V 오름차순
  const orphanStats = stats
    .filter((s) => !seen.has(s.color.toLowerCase()))
    .slice()
    .sort((a, b) => (a.avg_v_grade ?? -1) - (b.avg_v_grade ?? -1));
  for (const st of orphanStats) {
    out.push({
      color: st.color,
      hex: resolveColorHex(st.color),
      scheme: null,
      stat: st,
    });
  }

  return out;
}

// 'V3-V4', 'Vb-V0-', 'V0+', 'V-4', 'Vb' 등 → 슬라이더용 숫자 (0~8.5 범위).
// 못 읽으면 null.
function parseOfficialV(label: string | null): number | null {
  if (!label) return null;
  const tokens = label.split(/[-~]/).map((s) => s.trim()).filter(Boolean);
  if (tokens.length === 0) return null;
  const nums = tokens.map(tokenToNum).filter((n): n is number => n != null);
  if (nums.length === 0) return null;
  // 범위 표기 (V3-V4) 는 평균, 단일 (V3) 은 그대로
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function tokenToNum(tok: string): number | null {
  // 'Vb' → 0 (베이스), 'V0+' → 0.5, 'V0-' → -0.5, 'V3' → 3, 'V-4' 는 미해석 → null
  const m = /^V(b|B|\d+)([+\-])?$/.exec(tok);
  if (!m) return null;
  const body = m[1];
  const suffix = m[2];
  const base = body.toLowerCase() === 'b' ? 0 : parseInt(body, 10);
  if (Number.isNaN(base)) return null;
  if (suffix === '+') return base + 0.5;
  if (suffix === '-') return base - 0.5;
  return base;
}

function ColorRow({ row }: { row: MergedColorRow }) {
  const label = resolveColorLabel(row.color);
  const needsBorder = ['white', 'yellow', 'lime'].includes(row.color.toLowerCase());
  const stat = row.stat;
  const hasEnoughVotes = stat != null && stat.vote_count >= COLOR_VOTE_THRESHOLD;

  // 효과 V: 투표 충분하면 voted, 아니면 공식 라벨에서 파싱
  const officialV = parseOfficialV(row.scheme?.official_label ?? null);
  const effectiveV = hasEnoughVotes ? (stat?.avg_v_grade ?? null) : officialV;
  const fillPct =
    effectiveV != null
      ? Math.min(100, Math.max(0, (effectiveV / 8.5) * 100))
      : null;

  const rightLabel = hasEnoughVotes
    ? stat?.avg_v_grade_label ?? null
    : row.scheme?.official_label ?? null;
  const subText = hasEnoughVotes && stat ? `${stat.vote_count}표` : null;

  return (
    <View className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl bg-background-primary">
      {/* Color circle */}
      <View
        className="w-8 h-8 rounded-full"
        style={[
          { backgroundColor: row.hex },
          needsBorder ? { borderWidth: 1, borderColor: '#D4D4D8' } : null,
        ]}
      />

      {/* Name */}
      <View style={{ width: 60 }}>
        <Text className="text-text-primary text-sm font-bold">{label}</Text>
      </View>

      {/* Slider */}
      <View className="flex-1">
        <View className="h-1.5 bg-background-tertiary rounded-full relative">
          {fillPct != null && (
            <>
              <View
                className="absolute left-0 top-0 h-full bg-brand-primary rounded-full"
                style={{ width: `${fillPct}%`, opacity: hasEnoughVotes ? 1 : 0.45 }}
              />
              <View
                className="absolute w-3 h-3 rounded-full bg-brand-primary border-2 border-white"
                style={{
                  left: `${fillPct}%`,
                  top: -3,
                  marginLeft: -6,
                  opacity: hasEnoughVotes ? 1 : 0.6,
                }}
              />
            </>
          )}
        </View>
      </View>

      {/* Right — V label + vote count if any */}
      <View className="items-end" style={{ minWidth: 64 }}>
        {rightLabel ? (
          <Text
            className="text-text-primary text-xs font-extrabold"
            style={!hasEnoughVotes ? { opacity: 0.55 } : undefined}
          >
            {rightLabel}
          </Text>
        ) : (
          <Text className="text-text-muted text-[10px] font-semibold">—</Text>
        )}
        {subText && (
          <Text className="text-text-tertiary" style={{ fontSize: 10, fontWeight: '600' }}>
            {subText}
          </Text>
        )}
      </View>
    </View>
  );
}

