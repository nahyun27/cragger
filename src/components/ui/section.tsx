/**
 * 폼 섹션 — FormCard 를 얇게 감싸서 기존 호출부 호환 유지.
 *
 * 기존:    <Section title="..." required>...</Section>
 * 새 옵션: <Section title="..." icon="user" desc="..." required>...</Section>
 *
 * 시각은 FormCard 한 곳에서 통일 관리.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { FormCard } from '@/components/ui/form';
import { useThemeColors } from '@/lib/theme';

type Props = {
  title: string;
  icon?: keyof typeof Feather.glyphMap;
  desc?: string;
  required?: boolean;
  children: React.ReactNode;
};

export function Section({ title, icon, desc, required, children }: Props) {
  const c = useThemeColors();
  return (
    <FormCard
      title={
        <View style={titleRowStyle}>
          <Text style={[titleTextStyle, { color: c.text.primary }]}>{title}</Text>
          {required ? (
            <Text style={[requiredStyle, { color: c.status.danger }]}> *</Text>
          ) : null}
        </View>
      }
      icon={icon}
      desc={desc}
    >
      {children}
    </FormCard>
  );
}

const titleRowStyle = { flexDirection: 'row' as const, alignItems: 'center' as const };
const titleTextStyle = StyleSheet.create({ t: { fontSize: 13.5, fontWeight: '900' as const, letterSpacing: -0.2 } }).t;
const requiredStyle = StyleSheet.create({ r: { fontSize: 13, fontWeight: '900' as const } }).r;
