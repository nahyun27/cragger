import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Section } from '@/components/ui/section';
import { SHOE_STATUS_LABEL, type ShoeStatus } from '@/hooks/use-shoes';

export type ShoeFormValue = {
  brand: string;
  model: string;
  size: string;
  status: ShoeStatus;
  purchasedAt: string | null; // YYYY-MM-DD
  note: string;
};

export const EMPTY_SHOE_FORM: ShoeFormValue = {
  brand: '',
  model: '',
  size: '',
  status: 'active',
  purchasedAt: null,
  note: '',
};

const STATUS_OPTIONS: ShoeStatus[] = ['active', 'resole_pending', 'retired'];

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYMD(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDisplay(s: string | null): string {
  const d = parseYMD(s);
  if (!d) return '선택 안 함';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

type Props = {
  value: ShoeFormValue;
  onChange: (next: ShoeFormValue) => void;
};

export function ShoeForm({ value, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const purchasedDate = parseYMD(value.purchasedAt);

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="p-4 gap-6"
      keyboardShouldPersistTaps="handled"
    >
      <Section title="브랜드">
        <TextInput
          placeholder="예: 스카르파, 라스포르티바"
          placeholderTextColor="#9CA3AF"
          value={value.brand}
          onChangeText={(t) => onChange({ ...value, brand: t.slice(0, 30) })}
          className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
        />
      </Section>

      <Section title="모델명" required>
        <TextInput
          placeholder="예: 드라고, 솔루션 컴프"
          placeholderTextColor="#9CA3AF"
          value={value.model}
          onChangeText={(t) => onChange({ ...value, model: t.slice(0, 50) })}
          className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
        />
      </Section>

      <Section title="사이즈">
        <TextInput
          placeholder="예: 240, EU38, US7.5"
          placeholderTextColor="#9CA3AF"
          value={value.size}
          onChangeText={(t) => onChange({ ...value, size: t.slice(0, 10) })}
          className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
        />
      </Section>

      <Section title="상태" required>
        <View className="flex-row gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const active = value.status === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => onChange({ ...value, status: opt })}
                className={`flex-1 py-2.5 rounded-md border items-center ${
                  active
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-border-default'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    active ? 'text-brand-primary' : 'text-text-secondary'
                  }`}
                >
                  {SHOE_STATUS_LABEL[opt]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="구매일">
        <View className="flex-row gap-2 items-center">
          <Pressable
            onPress={() => setShowPicker(true)}
            className="flex-1 flex-row items-center justify-between border border-border-default rounded-md px-3 py-2.5 active:opacity-80"
          >
            <Text
              className={
                value.purchasedAt
                  ? 'text-text-primary text-base'
                  : 'text-text-tertiary text-base'
              }
            >
              {formatDisplay(value.purchasedAt)}
            </Text>
            <Feather name="calendar" size={16} color="#64748b" />
          </Pressable>
          {value.purchasedAt && (
            <Pressable
              onPress={() => onChange({ ...value, purchasedAt: null })}
              className="px-3 py-2.5 border border-border-default rounded-md active:opacity-80"
              hitSlop={6}
            >
              <Text className="text-text-tertiary text-sm">지우기</Text>
            </Pressable>
          )}
        </View>
        {showPicker && (
          <DateTimePicker
            value={purchasedDate ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={new Date()}
            onChange={(event, picked) => {
              if (Platform.OS !== 'ios') setShowPicker(false);
              if (event.type === 'dismissed') return;
              if (picked) {
                onChange({ ...value, purchasedAt: formatYMD(picked) });
              }
            }}
          />
        )}
        {Platform.OS === 'ios' && showPicker && (
          <Pressable
            onPress={() => setShowPicker(false)}
            className="self-end px-3 py-1.5 mt-1 active:opacity-60"
          >
            <Text className="text-brand-primary text-sm font-semibold">완료</Text>
          </Pressable>
        )}
      </Section>

      <Section title="메모">
        <TextInput
          placeholder="다운사이즈 폭 / 사용 빈도 / 발 느낌 등"
          placeholderTextColor="#9CA3AF"
          value={value.note}
          onChangeText={(t) => onChange({ ...value, note: t.slice(0, 200) })}
          maxLength={200}
          multiline
          textAlignVertical="top"
          className="border border-border-default rounded-md px-3 py-3 text-text-primary text-base min-h-[100px]"
        />
      </Section>

      <Section title="사진">
        <View className="flex-row items-center gap-2 px-3 py-3 rounded-md bg-background-secondary border border-border-subtle">
          <Feather name="image" size={16} color="#94a3b8" />
          <Text className="text-text-tertiary text-xs">사진 첨부는 준비 중이에요</Text>
        </View>
      </Section>
    </ScrollView>
  );
}
