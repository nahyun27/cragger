import React from 'react';
import { Pressable, Text } from 'react-native';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-2 rounded-full border ${
        selected
          ? 'border-brand-primary bg-brand-primary'
          : 'border-border-default bg-background-primary'
      }`}
    >
      <Text
        className={`text-sm ${
          selected ? 'text-background-primary font-medium' : 'text-text-primary'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
