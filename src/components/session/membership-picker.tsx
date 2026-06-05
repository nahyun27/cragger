/**
 * 회원권 picker — 선택된 암장의 사용 가능한 회원권 중 하나를 고르거나 "사용 안 함".
 * passes 타입은 잔여 차감 미리보기 (현재 남은 / 사용 후 남은).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import {
  daysFromTodayTo,
  useActiveMembershipsForGym,
  type MembershipRow,
} from '@/hooks/use-memberships';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

const TYPE_LABEL: Record<MembershipRow['membership_type'], string> = {
  monthly: '월간',
  period: '기간',
  passes: '다회권',
  single: '1회권',
};

const TYPE_ICON: Record<MembershipRow['membership_type'], 'calendar' | 'clock' | 'credit-card' | 'tag'> = {
  monthly: 'calendar',
  period: 'clock',
  passes: 'credit-card',
  single: 'tag',
};

export type MembershipPickerProps = {
  gymId: string | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function MembershipPicker({ gymId, selectedId, onSelect }: MembershipPickerProps) {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { data: memberships, isLoading } = useActiveMembershipsForGym(gymId ?? undefined);

  if (!gymId) {
    return (
      <View style={s.hint}>
        <Feather name="info" size={11} color={c.text.muted} />
        <Text style={s.hintText}>암장을 먼저 선택해 주세요</Text>
      </View>
    );
  }

  if (isLoading) {
    return null;
  }

  const list = memberships ?? [];

  if (list.length === 0) {
    return (
      <View style={s.hint}>
        <Feather name="info" size={11} color={c.text.muted} />
        <Text style={s.hintText}>이 암장에 등록된 회원권이 없어요</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {/* "사용 안 함" 옵션 */}
      <PickerRow
        active={selectedId === null}
        onPress={() => onSelect(null)}
        c={c}
        leading={
          <View style={[s.iconBox, { backgroundColor: c.bg.subtle }]}>
            <Feather name="slash" size={14} color={c.text.tertiary} />
          </View>
        }
        title="회원권 사용 안 함"
        desc="이번 기록은 별도 결제 / 게스트 패스 등"
      />

      {list.map((m) => (
        <MembershipRowPicker
          key={m.id}
          membership={m}
          active={selectedId === m.id}
          willSelect={!selectedId && false}
          onPress={() => onSelect(m.id)}
          c={c}
        />
      ))}
    </View>
  );
}

function MembershipRowPicker({
  membership, active, onPress, c,
}: {
  membership: MembershipRow;
  active: boolean;
  willSelect: boolean;
  onPress: () => void;
  c: ThemeColors;
}) {
  const s = makeStyles(c);
  const typeLabel = TYPE_LABEL[membership.membership_type];
  const icon = TYPE_ICON[membership.membership_type];

  // 보조 정보 — 종류별로 다름
  let desc = '';
  if (membership.membership_type === 'passes' && membership.total_passes != null) {
    const remaining = membership.total_passes - membership.used_passes;
    const afterUse = Math.max(remaining - 1, 0);
    desc = `${remaining}회 남음 → 사용 후 ${afterUse}회`;
  } else if (membership.end_date) {
    const d = daysFromTodayTo(membership.end_date);
    desc = d > 0 ? `${d}일 남음` : '오늘 종료';
  } else if (membership.membership_type === 'single') {
    desc = membership.start_date.replace(/-/g, '.');
  }

  return (
    <PickerRow
      active={active}
      onPress={onPress}
      c={c}
      leading={
        <View
          style={[
            s.iconBox,
            { backgroundColor: active ? c.brand.primary : c.brand.primaryLight },
          ]}
        >
          <Feather
            name={icon}
            size={14}
            color={active ? c.brand.onPrimary : c.brand.primaryDeep}
          />
        </View>
      }
      title={typeLabel}
      desc={desc}
    />
  );
}

function PickerRow({
  active, onPress, c, leading, title, desc,
}: {
  active: boolean;
  onPress: () => void;
  c: ThemeColors;
  leading: React.ReactNode;
  title: string;
  desc?: string;
}) {
  const s = makeStyles(c);
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View
          style={[
            s.row,
            active && s.rowActive,
            pressed && { opacity: 0.7 },
          ]}
        >
          {leading}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text
              style={[
                s.rowTitle,
                active && { color: c.brand.primaryDeep },
              ]}
            >
              {title}
            </Text>
            {desc ? <Text style={s.rowDesc}>{desc}</Text> : null}
          </View>
          {active ? (
            <Feather name="check-circle" size={18} color={c.brand.primary} />
          ) : (
            <View style={s.radioOuter} />
          )}
        </View>
      )}
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    hint: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingVertical: 8, paddingHorizontal: 10,
      borderRadius: 10, backgroundColor: c.bg.subtle,
    },
    hintText: { fontSize: 11.5, color: c.text.tertiary, fontWeight: '600' },
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 11, paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth, borderColor: c.border.subtle,
      backgroundColor: c.bg.card,
    },
    rowActive: {
      backgroundColor: c.brand.primaryLight,
      borderColor: c.brand.primary,
      borderWidth: 1.5,
    },
    iconBox: {
      width: 30, height: 30, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    rowTitle: { fontSize: 13.5, fontWeight: '900', color: c.text.primary, letterSpacing: -0.2 },
    rowDesc: { fontSize: 11.5, color: c.text.tertiary, fontWeight: '700', marginTop: 2 },
    radioOuter: {
      width: 18, height: 18, borderRadius: 9,
      borderWidth: 1.5, borderColor: c.border.strong,
    },
  });
}
