import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { useGyms } from '@/hooks/use-gyms';
import { useThemeColors } from '@/lib/theme';

type Props = {
  value: string[];                      // 선택된 gymId 배열
  onChange: (gymIds: string[]) => void;
  placeholder?: string;
};

export function MultiGymPickerField({
  value,
  onChange,
  placeholder = '암장 추가',
}: Props) {
  const c = useThemeColors();
  const { data: allGyms } = useGyms();
  const [showModal, setShowModal] = useState(false);

  const selectedGyms = value
    .map((id) => allGyms?.find((g) => g.id === id))
    .filter((g): g is NonNullable<typeof g> => !!g);

  return (
    <View style={{ gap: 8 }}>
      {/* 선택된 암장 칩 */}
      {selectedGyms.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {selectedGyms.map((gym) => (
            <View
              key={gym.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingLeft: 10,
                paddingRight: 6,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: c.bg.accent,
                borderWidth: 1,
                borderColor: c.brand.primaryLight,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: c.brand.primaryDeep,
                  letterSpacing: -0.2,
                }}
                numberOfLines={1}
              >
                {gym.name}{gym.branch ? ` ${gym.branch}` : ''}
              </Text>
              <Pressable
                onPress={() => onChange(value.filter((id) => id !== gym.id))}
                hitSlop={6}
              >
                <Feather name="x" size={12} color={c.brand.primaryDeep} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* 추가 버튼 */}
      <Pressable onPress={() => setShowModal(true)}>
        {({ pressed }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 11,
              borderRadius: 12,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: c.border.strong,
              backgroundColor: pressed ? c.bg.subtle : 'transparent',
            }}
          >
            <Feather name="plus" size={14} color={c.text.secondary} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: c.text.secondary,
                letterSpacing: -0.2,
              }}
            >
              {placeholder}
            </Text>
          </View>
        )}
      </Pressable>

      <GymPickerModal
        visible={showModal}
        gyms={(allGyms ?? []).filter((g) => !value.includes(g.id))}  // 이미 선택된 건 숨김
        selectedId={null}
        onSelect={(id) => {
          onChange([...value, id]);
          setShowModal(false);
        }}
        onClose={() => setShowModal(false)}
      />
    </View>
  );
}
