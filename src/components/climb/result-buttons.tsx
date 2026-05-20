import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

// "완등 / 미완 / 폴" 3버튼. 색깔이 선택돼야 활성화.
// 완등=send, 미완=tries만 누적, 폴=fall로 저장.
export type ResultChoice = 'send' | 'miwan' | 'fall';

type Props = {
  disabled?: boolean;
  pending?: boolean;
  onPress: (choice: ResultChoice) => void;
};

export function ResultButtons({ disabled, pending, onPress }: Props) {
  return (
    <View className="flex-row gap-2">
      <ResultButton
        label="완등"
        tone="success"
        disabled={disabled}
        pending={pending}
        onPress={() => onPress('send')}
      />
      <ResultButton
        label="미완"
        tone="neutral"
        disabled={disabled}
        pending={pending}
        onPress={() => onPress('miwan')}
      />
      <ResultButton
        label="폴"
        tone="danger"
        disabled={disabled}
        pending={pending}
        onPress={() => onPress('fall')}
      />
    </View>
  );
}

type Tone = 'success' | 'neutral' | 'danger';

function ResultButton({
  label,
  tone,
  disabled,
  pending,
  onPress,
}: {
  label: string;
  tone: Tone;
  disabled?: boolean;
  pending?: boolean;
  onPress: () => void;
}) {
  const palette = TONE[tone];
  const isOff = disabled || pending;
  return (
    <Pressable
      onPress={onPress}
      disabled={isOff}
      className={`flex-1 py-3.5 rounded-[10px] items-center active:opacity-85 ${
        isOff ? 'bg-background-tertiary' : palette.bg
      }`}
    >
      {pending ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text
          className={`text-base font-bold ${
            isOff ? 'text-text-muted' : palette.text
          }`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const TONE: Record<Tone, { bg: string; text: string }> = {
  success: { bg: 'bg-status-success', text: 'text-white' },
  neutral: { bg: 'bg-background-tertiary', text: 'text-text-primary' },
  danger: { bg: 'bg-status-danger', text: 'text-white' },
};
