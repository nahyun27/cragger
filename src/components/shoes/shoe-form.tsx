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
import {
  FIT_FEATURE_OPTIONS,
  FIT_PERCEPTION_LABEL,
  OWNERSHIP_LABEL,
  RATING_LABEL,
  SHOE_STATUS_LABEL,
  STIFFNESS_LABEL,
  STRETCH_LABEL,
  USAGE_OPTIONS,
  WANTED_FIT_LABEL,
  type FitPerception,
  type OwnershipStatus,
  type RatingKey,
  type ShoeStatus,
  type Stiffness,
  type Stretch,
  type WantedFit,
} from '@/hooks/use-shoes';

export type ShoeFormValue = {
  brand: string;
  model: string;
  size: string;
  status: ShoeStatus;
  purchasedAt: string | null; // YYYY-MM-DD
  note: string;
  ownershipStatus: OwnershipStatus | null;
  wantedFit: WantedFit | null;
  fitPerception: FitPerception | null;
  stiffness: Stiffness | null;
  stretch: Stretch | null;
  usages: string[];
  fitFeatures: string[];
  isPrimary: boolean;
  ratings: Record<RatingKey, number | null>;
};

const EMPTY_RATINGS: Record<RatingKey, number | null> = {
  overall: null,
  edging: null,
  smearing: null,
  toehook: null,
  heelhook: null,
  sensitivity: null,
  comfort: null,
  durability: null,
  value: null,
  design: null,
};

export const EMPTY_SHOE_FORM: ShoeFormValue = {
  brand: '',
  model: '',
  size: '',
  status: 'active',
  purchasedAt: null,
  note: '',
  ownershipStatus: 'owned',
  wantedFit: null,
  fitPerception: null,
  stiffness: null,
  stretch: null,
  usages: [],
  fitFeatures: [],
  isPrimary: false,
  ratings: { ...EMPTY_RATINGS },
};

const STATUS_OPTIONS: ShoeStatus[] = ['active', 'resole_pending', 'retired'];
const OWNERSHIP_OPTIONS: OwnershipStatus[] = ['owned', 'resale_size', 'resale_fit'];
const WANTED_FIT_OPTIONS: WantedFit[] = ['performance', 'comfort'];
const FIT_PERCEPTION_OPTIONS: FitPerception[] = [
  'much_smaller',
  'slightly_smaller',
  'perfect',
  'slightly_larger',
  'much_larger',
];
const STIFFNESS_OPTIONS: Stiffness[] = ['very_soft', 'soft', 'normal', 'stiff', 'very_stiff'];
const STRETCH_OPTIONS: Stretch[] = ['none', 'little', 'normal', 'much', 'very_much'];
const RATING_DETAILS: RatingKey[] = [
  'edging',
  'smearing',
  'toehook',
  'heelhook',
  'sensitivity',
  'comfort',
  'durability',
  'value',
  'design',
];

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
        <BrandPicker
          value={value.brand}
          onChange={(next) => onChange({ ...value, brand: next })}
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

      <Section title="소유 상태">
        <View style={s.chipWrap}>
          {OWNERSHIP_OPTIONS.map((opt) => {
            const active = value.ownershipStatus === opt;
            return (
              <Pressable
                key={opt}
                onPress={() =>
                  onChange({
                    ...value,
                    ownershipStatus: active ? null : opt,
                  })
                }
              >
                {({ pressed }) => (
                  <View
                    style={[
                      s.chip,
                      active ? s.chipActive : s.chipInactive,
                      pressed && s.btnPressed,
                    ]}
                  >
                    {active && (
                      <Feather name="check" size={12} color="#0891b2" />
                    )}
                    <Text
                      style={[
                        s.chipText,
                        active ? s.chipTextActive : s.chipTextInactive,
                      ]}
                    >
                      {OWNERSHIP_LABEL[opt]}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="사이즈" required>
        <SizePicker
          value={value.size}
          onSelect={(next) => onChange({ ...value, size: next })}
        />
      </Section>

      <Section title="원했던 핏 스타일">
        <View style={s.rowGap8}>
          {WANTED_FIT_OPTIONS.map((opt) => {
            const active = value.wantedFit === opt;
            const meta = WANTED_FIT_LABEL[opt];
            return (
              <Pressable
                key={opt}
                onPress={() =>
                  onChange({ ...value, wantedFit: active ? null : opt })
                }
                style={s.flex1}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      s.bigCard,
                      active && s.bigCardActive,
                      pressed && s.btnPressed,
                    ]}
                  >
                    <Text
                      style={[
                        s.bigCardLabel,
                        active && s.bigCardLabelActive,
                      ]}
                    >
                      {meta.label}
                    </Text>
                    <Text style={s.bigCardSub}>{meta.sub}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section
        title={
          value.size
            ? `내 발에 느껴지는 ${value.size} 사이즈의 핏은?`
            : '내 발에 느껴지는 핏은?'
        }
      >
        <View style={s.radio5Row}>
          {FIT_PERCEPTION_OPTIONS.map((opt) => {
            const active = value.fitPerception === opt;
            return (
              <Pressable
                key={opt}
                onPress={() =>
                  onChange({
                    ...value,
                    fitPerception: active ? null : opt,
                  })
                }
                style={s.radio5Col}
              >
                {({ pressed }) => (
                  <View
                    style={[s.radio5Cell, pressed && { opacity: 0.7 }]}
                  >
                    <View
                      style={[s.radioDot, active && s.radioDotActive]}
                    />
                    <Text
                      style={[
                        s.radio5Label,
                        active && s.radio5LabelActive,
                      ]}
                      numberOfLines={2}
                    >
                      {FIT_PERCEPTION_LABEL[opt]}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="부드러움 / 딱딱함">
        <View style={s.radio5Row}>
          {STIFFNESS_OPTIONS.map((opt) => {
            const active = value.stiffness === opt;
            return (
              <Pressable
                key={opt}
                onPress={() =>
                  onChange({ ...value, stiffness: active ? null : opt })
                }
                style={s.radio5Col}
              >
                {({ pressed }) => (
                  <View
                    style={[s.radio5Cell, pressed && { opacity: 0.7 }]}
                  >
                    <View
                      style={[s.radioDot, active && s.radioDotActive]}
                    />
                    <Text
                      style={[
                        s.radio5Label,
                        active && s.radio5LabelActive,
                      ]}
                      numberOfLines={2}
                    >
                      {STIFFNESS_LABEL[opt]}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="길들여지는 정도 (늘어남)">
        <View style={s.radio5Row}>
          {STRETCH_OPTIONS.map((opt) => {
            const active = value.stretch === opt;
            return (
              <Pressable
                key={opt}
                onPress={() =>
                  onChange({ ...value, stretch: active ? null : opt })
                }
                style={s.radio5Col}
              >
                {({ pressed }) => (
                  <View
                    style={[s.radio5Cell, pressed && { opacity: 0.7 }]}
                  >
                    <View
                      style={[s.radioDot, active && s.radioDotActive]}
                    />
                    <Text
                      style={[
                        s.radio5Label,
                        active && s.radio5LabelActive,
                      ]}
                      numberOfLines={2}
                    >
                      {STRETCH_LABEL[opt]}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="용도 (복수 선택)">
        <MultiPillRow
          options={USAGE_OPTIONS as unknown as string[]}
          selected={value.usages}
          onToggle={(next) => onChange({ ...value, usages: next })}
        />
      </Section>

      <Section title="핏 특징 (복수 선택)">
        <MultiPillRow
          options={FIT_FEATURE_OPTIONS as unknown as string[]}
          selected={value.fitFeatures}
          onToggle={(next) => onChange({ ...value, fitFeatures: next })}
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

      <Section title="전반적 평점">
        <Text style={s.ratingSubLabel}>
          {RATING_LABEL.overall.sub}
        </Text>
        <RatingBar
          value={value.ratings.overall}
          onChange={(v) =>
            onChange({
              ...value,
              ratings: { ...value.ratings, overall: v },
            })
          }
        />
      </Section>

      <View style={s.sectionDivider} />
      <Text style={s.subsectionTitle}>성능 평가</Text>

      {RATING_DETAILS.map((key) => (
        <Section title={RATING_LABEL[key].label} key={key}>
          <Text style={s.ratingSubLabel}>{RATING_LABEL[key].sub}</Text>
          <RatingBar
            value={value.ratings[key]}
            onChange={(v) =>
              onChange({
                ...value,
                ratings: { ...value.ratings, [key]: v },
              })
            }
          />
        </Section>
      ))}

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

      <Pressable
        onPress={() => onChange({ ...value, isPrimary: !value.isPrimary })}
      >
        {({ pressed }) => (
          <View style={[s.primaryToggle, pressed && s.btnPressed]}>
            <View style={s.primaryToggleLeft}>
              <Text style={s.primaryToggleStar}>⭐</Text>
              <Text style={s.primaryToggleLabel}>주력 신발로 지정</Text>
            </View>
            <View
              style={[
                s.toggleTrack,
                value.isPrimary && s.toggleTrackActive,
              ]}
            >
              <View
                style={[
                  s.toggleThumb,
                  value.isPrimary && s.toggleThumbActive,
                ]}
              />
            </View>
          </View>
        )}
      </Pressable>

      <Section title="사진">
        <View style={s.photoBanner}>
          <Feather name="image" size={15} color="#94a3b8" />
          <Text style={s.photoBannerText}>사진 첨부는 준비 중이에요</Text>
        </View>
      </Section>
    </ScrollView>
  );
}

const BRAND_PRESETS = [
  'La Sportiva',
  'Scarpa',
  'Tenaya',
  'Mad Rock',
  'Evolv',
  'Black Diamond',
  'Butora',
  'Unparallel',
  'So iLL',
] as const;

function BrandPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isPreset = (BRAND_PRESETS as readonly string[]).includes(value);
  const isCustom = value !== '' && !isPreset;

  return (
    <>
      <Pressable onPress={() => setOpen(true)}>
        {({ pressed }) => (
          <View style={[s.datePickerBox, pressed && s.btnPressed]}>
            <Text style={value ? s.dateTextActive : s.dateTextPlaceholder}>
              {value || '브랜드 선택'}
            </Text>
            <Feather name="chevron-down" size={15} color="#64748b" />
          </View>
        )}
      </Pressable>

      {isCustom && (
        <TextInput
          placeholder="브랜드명 직접 입력"
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={(t) => onChange(t.slice(0, 30))}
          style={[s.textInput, { marginTop: 10 }]}
        />
      )}

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={s.sheetContainer} edges={['top', 'bottom']}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>브랜드 선택</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              {({ pressed }) => (
                <View style={[s.sheetCloseBtn, pressed && s.btnPressed]}>
                  <Feather name="x" size={20} color="#0f172a" />
                </View>
              )}
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.sheetList}>
            {BRAND_PRESETS.map((b) => {
              const active = !isCustom && value === b;
              return (
                <Pressable
                  key={b}
                  onPress={() => {
                    onChange(b);
                    setOpen(false);
                  }}
                >
                  {({ pressed }) => (
                    <View style={[s.sheetRow, pressed && s.btnPressed]}>
                      <View style={s.sheetCheckSlot}>
                        {active && <Feather name="check" size={16} color="#0f172a" />}
                      </View>
                      <Text style={[s.sheetRowText, active && s.sheetRowTextActive]}>
                        {b}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => {
                if (isPreset) onChange('');
                setOpen(false);
              }}
            >
              {({ pressed }) => (
                <View style={[s.sheetRow, pressed && s.btnPressed]}>
                  <View style={s.sheetCheckSlot}>
                    {isCustom && <Feather name="check" size={16} color="#0f172a" />}
                  </View>
                  <Text style={[s.sheetRowText, isCustom && s.sheetRowTextActive]}>
                    직접입력
                  </Text>
                </View>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function MultiPillRow({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (next: string[]) => void;
}) {
  return (
    <View style={s.chipWrap}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            onPress={() =>
              onToggle(active ? selected.filter((x) => x !== opt) : [...selected, opt])
            }
          >
            {({ pressed }) => (
              <View
                style={[
                  s.chip,
                  active ? s.chipActive : s.chipInactive,
                  pressed && s.btnPressed,
                ]}
              >
                {active && <Feather name="check" size={12} color="#0891b2" />}
                <Text
                  style={[
                    s.chipText,
                    active ? s.chipTextActive : s.chipTextInactive,
                  ]}
                >
                  {opt}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function RatingBar({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  const filled = value ?? 0;
  return (
    <View>
      <View style={s.ratingRangeRow}>
        <Text style={s.ratingRangeLabel}>나쁨</Text>
        <Text style={s.ratingRangeLabel}>좋음</Text>
      </View>
      <View style={s.ratingBarRow}>
        {Array.from({ length: 10 }).map((_, i) => {
          const n = i + 1;
          const active = n <= filled;
          return (
            <Pressable
              key={i}
              onPress={() => onChange(n === value ? Math.max(0, n - 1) : n)}
              style={s.ratingCellSlot}
              hitSlop={4}
            >
              {({ pressed }) => (
                <View
                  style={[
                    s.ratingCell,
                    active ? s.ratingCellActive : s.ratingCellInactive,
                    pressed && { opacity: 0.7 },
                  ]}
                />
              )}
            </Pressable>
          );
        })}
        <Text style={s.ratingValueText}>
          <Text style={s.ratingValueNum}>{filled}</Text>
          <Text style={s.ratingValueDenom}> / 10</Text>
        </Text>
      </View>
    </View>
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

  // Multi-select + ownership chip
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { borderColor: '#06b6d4', backgroundColor: '#ecfeff' },
  chipInactive: { borderColor: '#e2e8f0', backgroundColor: '#ffffff' },
  chipText: { fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#0891b2' },
  chipTextInactive: { color: '#475569' },

  // Big card — wanted fit
  bigCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    minHeight: 78,
    justifyContent: 'center',
  },
  bigCardActive: {
    borderColor: '#06b6d4',
    borderWidth: 2,
    backgroundColor: '#ecfeff',
  },
  bigCardLabel: { fontSize: 14, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  bigCardLabelActive: { color: '#0891b2' },
  bigCardSub: { fontSize: 11, color: '#64748b' },

  // 5-option radio row (fit perception, stiffness, stretch)
  radio5Row: { flexDirection: 'row', gap: 6 },
  radio5Col: { flex: 1 },
  radio5Cell: { alignItems: 'center', gap: 6, paddingVertical: 6 },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  radioDotActive: {
    borderColor: '#06b6d4',
    backgroundColor: '#06b6d4',
  },
  radio5Label: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
  },
  radio5LabelActive: { color: '#0891b2', fontWeight: '800' },

  // Rating bar
  ratingSubLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  ratingRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ratingRangeLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingCellSlot: { flex: 1 },
  ratingCell: {
    height: 14,
    borderRadius: 4,
  },
  ratingCellActive: { backgroundColor: '#06b6d4' },
  ratingCellInactive: { backgroundColor: '#e2e8f0' },
  ratingValueText: { marginLeft: 8, minWidth: 56, textAlign: 'right' },
  ratingValueNum: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  ratingValueDenom: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },

  // Subsection ("성능 평가")
  sectionDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
  },

  // Primary toggle
  primaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryToggleStar: { fontSize: 18 },
  primaryToggleLabel: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#e2e8f0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackActive: { backgroundColor: '#f59e0b' },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
  },
  toggleThumbActive: { alignSelf: 'flex-end' },
});
