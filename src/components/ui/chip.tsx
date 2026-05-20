import React from 'react';
import { Pressable, Text } from 'react-native';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
};

export function Chip({ label, selected, onPress, icon }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-2 rounded-full border flex-row items-center gap-1.5 ${
        selected
          ? 'border-brand-primary bg-brand-primary'
          : 'border-border-default bg-background-primary'
      }`}
    >
      {icon}
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
