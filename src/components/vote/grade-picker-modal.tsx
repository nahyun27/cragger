import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';

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
    <Sheet
      visible={visible}
      onClose={onClose}
      variant="full"
      title={`${label} 난이도 투표`}
      footer={
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
      }
    >
      <View className="gap-6">
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

        <Pressable onPress={onClose} className="items-center py-2">
          <Text className="text-text-tertiary text-sm underline">잘 모르겠어요</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}
