import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { GymListItem } from '@/hooks/use-gyms';

type Props = {
  visible: boolean;
  gyms: GymListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export function GymPickerModal({ visible, gyms, selectedId, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return gyms;
    return gyms.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.branch ?? '').toLowerCase().includes(q) ||
        g.city.toLowerCase().includes(q),
    );
  }, [gyms, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
        <View className="flex-row items-center px-2 py-2 border-b border-border-subtle">
          <Pressable onPress={onClose} className="p-2" hitSlop={8}>
            <Text className="text-text-primary text-2xl">×</Text>
          </Pressable>
          <Text className="flex-1 text-center text-text-primary text-base font-semibold">
            암장 선택
          </Text>
          <View className="w-10" />
        </View>
        <View className="px-4 pt-3 pb-2">
          <TextInput
            placeholder="이름·지점·지역 검색"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            className="border border-border-default rounded-md px-3 py-2.5 text-text-primary text-base"
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item.id)}
              className={`flex-row items-center justify-between px-4 py-3 border-b border-border-subtle ${
                item.id === selectedId ? 'bg-background-secondary' : ''
              }`}
            >
              <View>
                <View className="flex-row items-baseline gap-2">
                  <Text className="text-text-primary text-base font-medium">{item.name}</Text>
                  {item.branch && (
                    <Text className="text-text-secondary text-sm">{item.branch}</Text>
                  )}
                </View>
                <Text className="text-text-tertiary text-xs">
                  {[item.city, item.district].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {item.id === selectedId && (
                <Text className="text-brand-primary text-lg">●</Text>
              )}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}
