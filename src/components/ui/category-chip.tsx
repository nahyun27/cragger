import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import {
  SESSION_CATEGORIES,
  SESSION_CATEGORIES_BY_KEY,
  type SessionCategory,
} from '@/constants/session-category';

/** 표시 전용 작은 칩 */
export function CategoryChip({
  category,
  size = 'sm',
}: {
  category: SessionCategory;
  size?: 'xs' | 'sm';
}) {
  const meta = SESSION_CATEGORIES_BY_KEY[category];
  if (!meta) return null;
  const isXs = size === 'xs';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: isXs ? 5 : 7,
        paddingVertical: isXs ? 1 : 2.5,
        borderRadius: 999,
        backgroundColor: meta.bg,
      }}
    >
      <Feather name={meta.icon} size={isXs ? 8 : 10} color={meta.fg} />
      <Text
        style={{
          fontSize: isXs ? 9 : 10.5,
          fontWeight: '900',
          color: meta.fg,
          letterSpacing: -0.2,
        }}
      >
        {meta.label}
      </Text>
    </View>
  );
}

/** 선택용 칩 그리드 (단일 선택, null 허용) */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: SessionCategory | null;
  onChange: (v: SessionCategory | null) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {SESSION_CATEGORIES.map((c) => {
        const active = value === c.key;
        return (
          <Pressable
            key={c.key}
            onPress={() => onChange(active ? null : c.key)}
          >
            {({ pressed }) => (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: active ? c.bg : 'transparent',
                  borderWidth: 1.5,
                  borderColor: active ? c.fg : '#cbd5e1',
                  opacity: pressed ? 0.7 : 1,
                }}
              >
                <Feather name={c.icon} size={12} color={active ? c.fg : '#64748b'} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: active ? c.fg : '#475569',
                    letterSpacing: -0.2,
                  }}
                >
                  {c.label}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
