/**
 * 색깔별 체감 V그레이드 투표 페이지.
 *
 * 정책:
 *   - 등록된 색깔(color_schemes) 만 투표 가능. 새 색깔 추가 X.
 *   - 새 색깔이 필요하면 "정보 제보" 페이지로 우회 안내.
 *   - 한 사용자 = 한 색깔에 한 번만 투표 (재투표 = 덮어쓰기).
 */
import { useLocalSearchParams, useRouter } from '@/lib/router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { customAlert } from '@/components/ui/custom-alert';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import { GradePickerModal } from '@/components/vote/grade-picker-modal';
import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import { useGymDetail } from '@/hooks/use-gym-detail';
import { useThemeColors, type ThemeColors } from '@/lib/theme';
import {
  useGymColorAvgs,
  useSubmitGradeVote,
  useVoteableColors,
  type GymColorAvg,
  type VoteableColor,
} from '@/hooks/use-gym-vote';

export default function GymVoteScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
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

  // 정렬: 내가 투표한 색깔 먼저, 그 다음 미투표 (시각적으로 진행도 강조)
  const sortedColors = useMemo(() => {
    if (!colors) return [];
    return [...colors].sort((a, b) => {
      const av = a.currentVote ? 1 : 0;
      const bv = b.currentVote ? 1 : 0;
      return bv - av;
    });
  }, [colors]);

  const votedCount = colors?.filter((x) => x.currentVote).length ?? 0;
  const totalCount = colors?.length ?? 0;

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
      customAlert('투표 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader
        title="난이도 투표"
        subtitle={gym ? `${gym.name}${gym.branch ? ` ${gym.branch}` : ''}` : undefined}
        count={totalCount > 0 ? votedCount : undefined}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={s.list}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
      >
        {/* 안내 hero */}
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <Feather name="thumbs-up" size={16} color={c.brand.primaryDeep} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={s.heroTitle}>색깔별 체감 V그레이드를 평가해주세요</Text>
            <Text style={s.heroDesc}>
              여러 사용자의 평가가 모이면 평균이 만들어져요. 재투표는 덮어쓰기.
            </Text>
          </View>
        </View>

        {isLoading && (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={c.brand.primary} />
          </View>
        )}

        {error && (
          <EmptyState
            icon="alert-triangle"
            tone="danger"
            title="목록을 불러오지 못했어요"
            description={error.message}
          />
        )}

        {colors && colors.length === 0 && (
          <EmptyState
            icon="edit-3"
            tone="muted"
            title="등록된 색깔이 없어요"
            description={'이 암장의 색깔이 아직 등록돼 있지 않아요.\n어떤 색깔이 있는지 제보해주세요!'}
            action={{
              label: '색깔 정보 제보하기',
              icon: 'edit-3',
              onPress: () =>
                router.push({ pathname: '/gym/[id]/suggest', params: { id: id! } } as never),
            }}
          />
        )}

        {colors && colors.length > 0 && (
          <Section title="등록된 색깔" icon="droplet" desc={`${totalCount}개 중 ${votedCount}개 투표 완료`}>
            <View style={{ gap: 4 }}>
              {sortedColors.map((row) => (
                <VoteRow
                  key={row.color}
                  color={row}
                  avg={avgByColor.get(row.color)}
                  onPress={() => setPickerColor(row.color)}
                  c={c}
                />
              ))}
            </View>
          </Section>
        )}

        {/* 제보 안내 — 색깔이 누락됐을 때 자연스럽게 이동할 수 있게 */}
        {colors && colors.length > 0 && (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/gym/[id]/suggest', params: { id: id! } } as never)
            }
          >
            {({ pressed }) => (
              <View style={[s.suggestCard, pressed && { opacity: 0.75 }]}>
                <View style={s.suggestIcon}>
                  <Feather name="plus-circle" size={16} color={c.brand.primaryDeep} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.suggestTitle}>여기 다른 색깔도 있나요?</Text>
                  <Text style={s.suggestDesc}>제보해서 다음 사용자도 평가할 수 있게 해주세요</Text>
                </View>
                <Feather name="chevron-right" size={16} color={c.text.muted} />
              </View>
            )}
          </Pressable>
        )}
      </ScrollView>

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
  color, avg, onPress, c,
}: {
  color: VoteableColor;
  avg: GymColorAvg | undefined;
  onPress: () => void;
  c: ThemeColors;
}) {
  const s = makeStyles(c);
  const hex = resolveColorHex(color.color);
  const label = resolveColorLabel(color.color);
  const needsBorder = ['white', 'yellow', 'lime'].includes(color.color.toLowerCase());
  const voted = !!color.currentVote;
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View style={[s.voteRow, pressed && { backgroundColor: c.bg.subtle }]}>
          <View
            style={[
              s.colorDot,
              { backgroundColor: hex },
              needsBorder ? { borderWidth: 1, borderColor: '#D4D4D8' } : null,
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.colorLabel}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              {voted ? (
                <View style={s.voteChip}>
                  <Feather name="check" size={9} color={c.brand.primaryDeep} />
                  <Text style={s.voteChipText}>{color.currentVote}</Text>
                </View>
              ) : (
                <Text style={s.notVotedText}>아직 평가 안 함</Text>
              )}
              {avg && avg.voteCount > 0 && (
                <Text style={s.avgText}>
                  평균 {avg.avgVGradeLabel} · {avg.voteCount}표
                </Text>
              )}
            </View>
          </View>
          <View style={[s.actionBtn, voted ? s.actionBtnVoted : s.actionBtnFresh]}>
            <Text style={[s.actionBtnText, voted ? s.actionBtnTextVoted : s.actionBtnTextFresh]}>
              {voted ? '수정' : '투표'}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    list: { padding: 18, gap: 16, paddingBottom: 24 },

    heroCard: {
      flexDirection: 'row', gap: 12,
      padding: 14, borderRadius: 14,
      backgroundColor: c.brand.primaryLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.brand.primary + '33',
    },
    heroIcon: {
      width: 32, height: 32, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.bg.card,
    },
    heroTitle: {
      fontSize: 13.5, fontWeight: '900', color: c.brand.primaryDeep, letterSpacing: -0.2,
    },
    heroDesc: { fontSize: 11.5, color: c.text.secondary, fontWeight: '600', lineHeight: 16 },

    voteRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 8, paddingVertical: 10, borderRadius: 12,
    },
    colorDot: {
      width: 30, height: 30, borderRadius: 15,
    },
    colorLabel: {
      fontSize: 14, fontWeight: '900', color: c.text.primary, letterSpacing: -0.2,
    },
    voteChip: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
      backgroundColor: c.brand.primaryLight,
    },
    voteChipText: {
      fontSize: 11, fontWeight: '900', color: c.brand.primaryDeep, letterSpacing: -0.2,
    },
    notVotedText: { fontSize: 11.5, color: c.text.muted, fontWeight: '700' },
    avgText: { fontSize: 11, color: c.text.tertiary, fontWeight: '600' },

    actionBtn: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    },
    actionBtnFresh: { backgroundColor: c.brand.primary },
    actionBtnVoted: {
      backgroundColor: c.bg.subtle,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
    },
    actionBtnText: { fontSize: 12, fontWeight: '900', letterSpacing: -0.2 },
    actionBtnTextFresh: { color: c.brand.onPrimary },
    actionBtnTextVoted: { color: c.text.secondary },

    suggestCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 14, borderRadius: 14,
      borderWidth: 1.5, borderColor: c.brand.primary + '55',
      borderStyle: 'dashed',
      backgroundColor: c.bg.card,
    },
    suggestIcon: {
      width: 34, height: 34, borderRadius: 11,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.brand.primaryLight,
    },
    suggestTitle: {
      fontSize: 13.5, fontWeight: '900', color: c.text.primary, letterSpacing: -0.2,
    },
    suggestDesc: { fontSize: 11.5, color: c.text.tertiary, fontWeight: '700' },
  });
}
