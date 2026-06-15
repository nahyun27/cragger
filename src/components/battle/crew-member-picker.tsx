import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { UserAvatar } from '@/components/ui/user-avatar';
import type { CrewMember } from '@/hooks/use-crews';
import { useThemeColors } from '@/lib/theme';

type Props = {
  visible: boolean;
  members: CrewMember[];           // 크루 전체 멤버
  excludeUserIds: string[];         // 이미 다른 팀에 배정된 ID
  onPick: (userId: string) => void;
  onClose: () => void;
};

export function CrewMemberPicker({
  visible,
  members,
  excludeUserIds,
  onPick,
  onClose,
}: Props) {
  const c = useThemeColors();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const excluded = useMemo(() => new Set(excludeUserIds), [excludeUserIds]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = members.filter((m) => !excluded.has(m.user_id));
    if (!q) return visible;
    return visible.filter((m) => {
      const name = (m.user?.display_name ?? m.user?.username ?? '').toLowerCase();
      return name.includes(q);
    });
  }, [members, excluded, query]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      variant="full"
      title="팀원 추가"
      subtitle="크루 멤버 중에서 선택"
      noScroll
      backgroundColor={c.bg.card}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: c.bg.subtle,
            borderWidth: 1.5,
            borderColor: focused ? c.brand.primary : 'transparent',
          }}
        >
          <Feather
            name="search"
            size={16}
            color={focused ? c.brand.primary : c.text.tertiary}
          />
          <TextInput
            placeholder="이름 검색"
            placeholderTextColor={c.text.tertiary}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ flex: 1, fontSize: 15, color: c.text.primary, padding: 0 }}
          />
        </View>
      </View>
      {filtered.length === 0 ? (
        <View style={{ paddingTop: 60, alignItems: 'center', gap: 8 }}>
          <Feather name="users" size={28} color={c.text.muted} />
          <Text style={{ fontSize: 14, color: c.text.tertiary, fontWeight: '600' }}>
            {excluded.size >= members.length
              ? '모든 멤버가 이미 배정됐어요'
              : '검색 결과가 없어요'}
          </Text>
        </View>
      ) : (
        <View>
          {filtered.map((m, idx) => (
            <Pressable key={m.user_id} onPress={() => onPick(m.user_id)}>
              {({ pressed }) => (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: pressed ? c.bg.subtle : 'transparent',
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: c.border.subtle,
                  }}
                >
                  <View style={{ marginRight: 12 }}>
                    <UserAvatar
                      userKey={m.user_id}
                      username={m.user?.display_name ?? m.user?.username ?? null}
                      avatarUrl={m.user?.avatar_url ?? null}
                      size={36}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: c.text.primary }}>
                      {m.user?.display_name ?? m.user?.username ?? '익명'}
                    </Text>
                    {m.user?.username && m.user?.display_name && (
                      <Text style={{ fontSize: 12, color: c.text.tertiary, marginTop: 2 }}>
                        @{m.user.username}
                      </Text>
                    )}
                  </View>
                  <Feather name="plus" size={18} color={c.brand.primary} />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </Sheet>
  );
}
