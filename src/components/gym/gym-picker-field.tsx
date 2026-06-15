import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { FormPressable } from '@/components/ui/form';
import { GymPickerModal } from '@/components/session/gym-picker-modal';
import { useGyms } from '@/hooks/use-gyms';
import { useThemeColors } from '@/lib/theme';

type Props = {
  value: string | null;
  onChange: (gymId: string | null) => void;
  placeholder?: string;
  leadingIcon?: React.ComponentProps<typeof Feather>['name'];
  clearable?: boolean;
  disabled?: boolean;
};

export function GymPickerField({
  value,
  onChange,
  placeholder = '암장 선택',
  leadingIcon = 'map-pin',
  clearable = false,
  disabled,
}: Props) {
  const c = useThemeColors();
  const { data: allGyms } = useGyms();
  const [showModal, setShowModal] = useState(false);

  const selectedGym = allGyms?.find((g) => g.id === value) ?? null;
  const displayValue = selectedGym
    ? `${selectedGym.name}${selectedGym.branch ? ` ${selectedGym.branch}` : ''}`
    : null;

  const trailingNode =
    clearable && selectedGym ? (
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onChange(null);
        }}
        hitSlop={6}
      >
        <Feather name="x" size={16} color={c.text.muted} />
      </Pressable>
    ) : (
      <Feather name="chevron-down" size={16} color={c.text.muted} />
    );

  return (
    <>
      <FormPressable
        onPress={() => setShowModal(true)}
        leadingIcon={leadingIcon}
        placeholder={placeholder}
        value={displayValue}
        trailingNode={trailingNode}
        disabled={disabled}
      />
      <GymPickerModal
        visible={showModal}
        gyms={allGyms ?? []}
        selectedId={value}
        onSelect={(id) => {
          onChange(id);
          setShowModal(false);
        }}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
