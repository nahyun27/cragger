import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

// 암벽화 EU 사이즈 — 33 ~ 49, 0.5 단위.
const EU_SIZES: string[] = (() => {
  const out: string[] = [];
  for (let n = 66; n <= 98; n += 1) {
    const v = n / 2;
    out.push(Number.isInteger(v) ? `EU ${v}` : `EU ${v.toFixed(1)}`);
  }
  return out;
})();

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
      style={s.scrollView}
      contentContainerStyle={s.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Section title="브랜드">
        <TextInput
          placeholder="예: 스카르파, 라스포르티바"
          placeholderTextColor="#94a3b8"
          value={value.brand}
          onChangeText={(t) => onChange({ ...value, brand: t.slice(0, 30) })}
          style={s.textInput}
        />
      </Section>

      <Section title="모델명" required>
        <TextInput
          placeholder="예: 드라고, 솔루션 컴프"
          placeholderTextColor="#94a3b8"
          value={value.model}
          onChangeText={(t) => onChange({ ...value, model: t.slice(0, 50) })}
          style={s.textInput}
        />
      </Section>

      <Section title="사이즈">
        <SizePicker
          value={value.size}
          onSelect={(next) => onChange({ ...value, size: next })}
        />
      </Section>

      <Section title="상태" required>
        <View style={s.rowGap8}>
          {STATUS_OPTIONS.map((opt) => {
            const active = value.status === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => onChange({ ...value, status: opt })}
                style={s.flex1}
              >
                {({ pressed }) => (
                  <View style={[
                    s.statusChip,
                    active ? s.statusChipActive : s.statusChipInactive,
                    pressed && s.btnPressed
                  ]}>
                    <Text style={[
                      s.statusChipText,
                      active ? s.statusChipTextActive : s.statusChipTextInactive
                    ]}>
                      {SHOE_STATUS_LABEL[opt]}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="구매일">
        <View style={s.rowCenterGap8}>
          <Pressable
            onPress={() => setShowPicker(true)}
            style={s.flex1}
          >
            {({ pressed }) => (
              <View style={[
                s.datePickerBox,
                pressed && s.btnPressed
              ]}>
                <Text style={value.purchasedAt ? s.dateTextActive : s.dateTextPlaceholder}>
                  {formatDisplay(value.purchasedAt)}
                </Text>
                <Feather name="calendar" size={15} color="#64748b" />
              </View>
            )}
          </Pressable>
          
          {value.purchasedAt && (
            <Pressable
              onPress={() => onChange({ ...value, purchasedAt: null })}
              hitSlop={6}
            >
              {({ pressed }) => (
                <View style={[s.clearBtn, pressed && s.btnPressed]}>
                  <Text style={s.clearBtnText}>지우기</Text>
                </View>
              )}
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
            hitSlop={6}
          >
            {({ pressed }) => (
              <View style={[s.doneBtn, pressed && s.btnPressed]}>
                <Text style={s.doneBtnText}>완료</Text>
              </View>
            )}
          </Pressable>
        )}
      </Section>

      <Section title="메모">
        <TextInput
          placeholder="다운사이즈 폭 / 사용 빈도 / 발 느낌 등"
          placeholderTextColor="#94a3b8"
          value={value.note}
          onChangeText={(t) => onChange({ ...value, note: t.slice(0, 200) })}
          maxLength={200}
          multiline
          textAlignVertical="top"
          style={s.textAreaInput}
        />
      </Section>

      <Section title="사진">
        <View style={s.photoBanner}>
          <Feather name="image" size={15} color="#94a3b8" />
          <Text style={s.photoBannerText}>사진 첨부는 준비 중이에요</Text>
        </View>
      </Section>
    </ScrollView>
  );
}

function SizePicker({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const selectedIndex = EU_SIZES.indexOf(value);

  useEffect(() => {
    if (!open) return;
    // 선택된 위치로 스크롤 (대략적으로 — 항목당 50px)
    const t = setTimeout(() => {
      if (selectedIndex >= 0) {
        scrollRef.current?.scrollTo({ y: Math.max(0, selectedIndex * 50 - 100), animated: false });
      }
    }, 30);
    return () => clearTimeout(t);
  }, [open, selectedIndex]);

  return (
    <>
      <Pressable onPress={() => setOpen(true)}>
        {({ pressed }) => (
          <View style={[s.datePickerBox, pressed && s.btnPressed]}>
            <Text style={value ? s.dateTextActive : s.dateTextPlaceholder}>
              {value || 'EU 사이즈 선택'}
            </Text>
            <Feather name="chevron-down" size={15} color="#64748b" />
          </View>
        )}
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={s.sheetContainer} edges={['top', 'bottom']}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>EU 사이즈 선택</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              {({ pressed }) => (
                <View style={[s.sheetCloseBtn, pressed && s.btnPressed]}>
                  <Feather name="x" size={20} color="#0f172a" />
                </View>
              )}
            </Pressable>
          </View>
          <ScrollView ref={scrollRef} contentContainerStyle={s.sheetList}>
            {EU_SIZES.map((size) => {
              const active = size === value;
              return (
                <Pressable
                  key={size}
                  onPress={() => {
                    onSelect(size);
                    setOpen(false);
                  }}
                >
                  {({ pressed }) => (
                    <View style={[s.sheetRow, pressed && s.btnPressed]}>
                      <View style={s.sheetCheckSlot}>
                        {active && <Feather name="check" size={16} color="#0f172a" />}
                      </View>
                      <Text style={[s.sheetRowText, active && s.sheetRowTextActive]}>
                        {size}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  sheetContainer: { flex: 1, backgroundColor: '#ffffff' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  sheetList: { paddingVertical: 8, paddingHorizontal: 8 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 10,
  },
  sheetCheckSlot: { width: 24, alignItems: 'center' },
  sheetRowText: { fontSize: 16, fontWeight: '500', color: '#0f172a', marginLeft: 4 },
  sheetRowTextActive: { fontWeight: '800' },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 20,
  },
  flex1: {
    flex: 1,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  textAreaInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    minHeight: 110,
    lineHeight: 20,
  },
  rowGap8: {
    flexDirection: 'row',
    gap: 8,
  },
  rowCenterGap8: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.985 }],
  },
  statusChip: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipActive: {
    borderColor: '#06b6d4',
    backgroundColor: '#ecfeff',
  },
  statusChipInactive: {
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusChipTextActive: {
    color: '#0891b2',
  },
  statusChipTextInactive: {
    color: '#475569',
  },
  datePickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateTextActive: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  dateTextPlaceholder: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  clearBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#cffafe',
    borderRadius: 8,
  },
  doneBtnText: {
    color: '#0891b2',
    fontSize: 12,
    fontWeight: '800',
  },
  photoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  photoBannerText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
});
