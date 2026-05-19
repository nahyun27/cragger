import React from 'react';
import { Text, View } from 'react-native';

type Props = {
  title: string;
  required?: boolean;
  children: React.ReactNode;
};

export function Section({ title, required, children }: Props) {
  return (
    <View className="gap-2">
      <Text className="text-text-secondary text-sm font-medium">
        {title}
        {required && <Text className="text-status-danger"> *</Text>}
      </Text>
      {children}
    </View>
  );
}
