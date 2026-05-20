import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';

// V0 ~ V8+ + 사이마다 + variants = 17개. 3 col 그리드에 flex-wrap (마지막 줄 2 cell).
// 'V8+'는 V8 이상 묶음.
const GRADES = [
  'V0', 'V0+',
  'V1', 'V1+',
  'V2', 'V2+',
  'V3', 'V3+',
  'V4', 'V4+',
  'V5', 'V5+',
  'V6', 'V6+',
  'V7', 'V7+',
  'V8+',
] as const;

// anchoring 회피: vote count 10 미만이면 평균 안 보여줌.
const SHOW_AVG_THRESHOLD = 10;

type Props = {
  visible: boolean;
  color: string;
  currentVote: string | null;
  avgLabel: string | null;
  voteCount: number;
  isSubmitting: boolean;
  onSubmit: (grade: string) => Promise<void>;
  onClose: () => void;
};

export function GradePickerModal({
  visible,
  color,
  currentVote,
  avgLabel,
  voteCount,
  isSubmitting,
  onSubmit,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<string | null>(currentVote);

  // 모달 새로 열릴 때마다 현재 투표값으로 초기화
  useEffect(() => {
    if (visible) setSelected(currentVote);
  }, [visible, currentVote]);

  const hex = resolveColorHex(color);
  const label = resolveColorLabel(color);
  const needsBorder = color === 'white' || color === 'yellow';
  const showAvg = voteCount >= SHOW_AVG_THRESHOLD && avgLabel;

  async function handleSubmit() {
    if (!selected || isSubmitting) return;
    await onSubmit(selected);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
        <View className="flex-row items-center px-2 py-2 border-b border-border-subtle">
          <Pressable onPress={onClose} className="p-2" hitSlop={8}>
            <Text className="text-text-primary text-2xl">×</Text>
          </Pressable>
          <Text className="flex-1 text-center text-text-primary text-base font-semibold">
            {label} 난이도 투표
          </Text>
          <View className="w-10" />
        </View>

        <View className="flex-1 px-6 pt-8 gap-6">
          {/* 큰 색깔 원 + 이름 */}
          <View className="items-center gap-3">
            <View
              className="w-24 h-24 rounded-full"
              style={{
                backgroundColor: hex,
                ...(needsBorder ? { borderWidth: 1, borderColor: '#D4D4D8' } : null),
              }}
            />
            <Text className="text-text-primary text-2xl font-bold">{label}</Text>
          </View>

          {/* 현재 평균 */}
          <View className="items-center">
            {showAvg ? (
              <Text className="text-text-secondary">
                현재 평균 <Text className="font-bold text-text-primary">{avgLabel}</Text>
                {' · '}
                {voteCount}명 투표
              </Text>
            ) : (
              <Text className="text-text-tertiary text-sm">
                아직 데이터 모으는 중 ({voteCount}명)
              </Text>
            )}
          </View>

          {/* V그레이드 3x3 */}
          <View className="gap-2">
            <Text className="text-text-secondary text-sm font-medium">
              내 체감 난이도
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {GRADES.map((g) => {
                const active = selected === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => setSelected(g)}
                    disabled={isSubmitting}
                    style={{ width: '31.5%' }}
                    className={`py-4 rounded-md border items-center ${
                      active
                        ? 'border-brand-primary bg-brand-primary'
                        : 'border-border-default bg-background-primary'
                    }`}
                  >
                    <Text
                      className={`text-lg font-bold ${
                        active ? 'text-background-primary' : 'text-text-primary'
                      }`}
                    >
                      {g}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* "잘 모르겠어요" */}
          <Pressable onPress={onClose} className="items-center py-2">
            <Text className="text-text-tertiary text-sm underline">잘 모르겠어요</Text>
          </Pressable>
        </View>

        {/* 제출 */}
        <View className="px-4 pt-2 pb-2 border-t border-border-subtle">
          <Pressable
            onPress={handleSubmit}
            disabled={!selected || isSubmitting}
            className={`rounded-md p-4 items-center ${
              !selected ? 'bg-background-tertiary' : 'bg-brand-primary'
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`font-semibold ${
                  !selected ? 'text-text-muted' : 'text-background-primary'
                }`}
              >
                투표 제출
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
