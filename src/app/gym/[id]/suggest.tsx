import { customAlert } from '@/components/ui/custom-alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '@/lib/auth-context';
import { useGymDetail } from '@/hooks/use-gym-detail';
import { useSubmitGymInfo, type GymChanges } from '@/hooks/use-gym-submissions';
import { uploadGymLogoSuggestion } from '@/lib/upload-image';
import { CLIMB_COLOR_HEX, CLIMB_COLOR_LABEL, resolveColorHex } from '@/constants/climb-colors';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

type StringField =
  | 'city' | 'district' | 'address'
  | 'description' | 'parking_info'
  | 'phone' | 'website_url' | 'instagram_handle';

type NumberField = 'size_pyeong' | 'floors_count';

type BooleanField =
  | 'has_boulder' | 'has_lead' | 'has_top_rope' | 'has_speed' | 'has_auto_belay'
  | 'has_moonboard' | 'has_kilter' | 'has_tension'
  | 'has_shower' | 'has_locker' | 'has_parking';

const STRING_FIELDS: { key: StringField; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: 'city', label: '시/도', placeholder: '서울' },
  { key: 'district', label: '구/군', placeholder: '영등포구' },
  { key: 'address', label: '주소', placeholder: '도로명 주소' },
  { key: 'phone', label: '전화번호', placeholder: '02-1234-5678' },
  { key: 'website_url', label: '웹사이트', placeholder: 'https://...' },
  { key: 'instagram_handle', label: '인스타그램', placeholder: '@handle' },
  { key: 'parking_info', label: '주차 안내', placeholder: '건물 지하 2시간 무료 등', multiline: true },
  { key: 'description', label: '소개/특이사항', placeholder: '시그니처 라인, 분위기 등 자유 서술', multiline: true },
];

const NUMBER_FIELDS: { key: NumberField; label: string; placeholder: string }[] = [
  { key: 'size_pyeong', label: '평수', placeholder: '120' },
  { key: 'floors_count', label: '층수', placeholder: '2' },
];

const BOOLEAN_GROUPS: { title: string; items: { key: BooleanField; label: string }[] }[] = [
  {
    title: '종목',
    items: [
      { key: 'has_boulder', label: '볼더링' },
      { key: 'has_lead', label: '리드' },
      { key: 'has_top_rope', label: '탑로프' },
      { key: 'has_speed', label: '스피드' },
      { key: 'has_auto_belay', label: '오토빌레이' },
    ],
  },
  {
    title: '보드',
    items: [
      { key: 'has_moonboard', label: '문보드' },
      { key: 'has_kilter', label: '킬터' },
      { key: 'has_tension', label: '텐션' },
    ],
  },
  {
    title: '편의시설',
    items: [
      { key: 'has_shower', label: '샤워실' },
      { key: 'has_locker', label: '락커' },
      { key: 'has_parking', label: '주차장' },
    ],
  },
];

export default function SuggestGymScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session: authSession } = useAuth();
  const { data: gym, isLoading } = useGymDetail(id);
  const submit = useSubmitGymInfo();

  // 각 필드별 현재값 prefill + dirty 추적.
  // dirty=true 인 필드만 changes 에 포함해서 제출.
  const [strings, setStrings] = useState<Partial<Record<StringField, string>>>({});
  const [numbers, setNumbers] = useState<Partial<Record<NumberField, string>>>({});
  const [bools, setBools] = useState<Partial<Record<BooleanField, boolean>>>({});
  const [openedAt, setOpenedAt] = useState<string>(''); // YYYY-MM-DD
  const [logoUri, setLogoUri] = useState<string | null>(null); // preview uri
  const [logoAsset, setLogoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [note, setNote] = useState('');
  // 색깔 구성 — 현재 등록된 색깔 집합 + 토글로 add/remove 추적
  const [colorState, setColorState] = useState<Record<string, 'registered' | 'add' | 'remove' | 'absent'>>({});
  const [uploading, setUploading] = useState(false);

  // dirty 셋 — 사용자가 명시적으로 토글/입력한 필드.
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const markDirty = (k: string) => setDirty((d) => new Set(d).add(k));
  const unmarkDirty = (k: string) =>
    setDirty((d) => {
      const n = new Set(d);
      n.delete(k);
      return n;
    });

  // gym 로드 시 prefill (한 번만)
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || !gym) return;
    setStrings({
      city: gym.city ?? '',
      district: gym.district ?? '',
      address: gym.address ?? '',
      description: gym.description ?? '',
      parking_info: gym.parking_info ?? '',
      phone: gym.phone ?? '',
      website_url: gym.website_url ?? '',
      instagram_handle: gym.instagram_handle ?? '',
    });
    setNumbers({
      size_pyeong: gym.size_pyeong != null ? String(gym.size_pyeong) : '',
      floors_count: gym.floors_count != null ? String(gym.floors_count) : '',
    });
    setBools({
      has_boulder: gym.has_boulder,
      has_lead: gym.has_lead,
      has_top_rope: gym.has_top_rope,
      has_speed: gym.has_speed,
      has_auto_belay: gym.has_auto_belay,
      has_moonboard: gym.has_moonboard,
      has_kilter: gym.has_kilter,
      has_tension: gym.has_tension,
      has_shower: gym.has_shower,
      has_locker: gym.has_locker,
      has_parking: gym.has_parking,
    });
    setOpenedAt(gym.opened_at ?? '');
    // 색깔 상태: 등록된 건 'registered', 나머지는 'absent'
    const registered = new Set(gym.color_schemes.map((cs) => cs.color.toLowerCase()));
    const cstate: Record<string, 'registered' | 'absent'> = {};
    for (const k of Object.keys(CLIMB_COLOR_HEX)) {
      cstate[k] = registered.has(k) ? 'registered' : 'absent';
    }
    setColorState(cstate);
    setPrefilled(true);
  }, [gym, prefilled]);

  // 색깔 토글:
  // registered → remove (제보로 빼기) | absent → add (제보로 넣기)
  // 다시 누르면 원위치.
  function toggleColor(color: string) {
    setColorState((prev) => {
      const s = prev[color] ?? 'absent';
      let next: typeof s;
      if (s === 'registered') next = 'remove';
      else if (s === 'remove') next = 'registered';
      else if (s === 'add') next = 'absent';
      else next = 'add';
      return { ...prev, [color]: next };
    });
  }

  async function handlePickLogo() {
    if (uploading) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      customAlert('권한 필요', '사진 라이브러리 접근 권한이 필요해요');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (r.canceled || !r.assets[0]) return;
    setLogoAsset(r.assets[0]);
    setLogoUri(r.assets[0].uri);
    markDirty('logo_url');
  }

  async function handleSubmit() {
    if (!id || !authSession?.user.id) return;
    const hasColorChange = Object.values(colorState).some((v) => v === 'add' || v === 'remove');
    if (dirty.size === 0 && !hasColorChange && !note.trim()) {
      customAlert('알림', '수정할 항목을 1개 이상 선택하거나 메모를 작성해주세요');
      return;
    }
    try {
      const changes: GymChanges = {};
      for (const f of STRING_FIELDS) {
        if (dirty.has(f.key)) {
          const v = strings[f.key]?.trim();
          if (v) (changes as Record<string, unknown>)[f.key] = v;
        }
      }
      for (const f of NUMBER_FIELDS) {
        if (dirty.has(f.key)) {
          const v = numbers[f.key];
          const n = v != null && v !== '' ? parseInt(v, 10) : NaN;
          if (!Number.isNaN(n)) (changes as Record<string, unknown>)[f.key] = n;
        }
      }
      for (const g of BOOLEAN_GROUPS) {
        for (const f of g.items) {
          if (dirty.has(f.key)) {
            (changes as Record<string, unknown>)[f.key] = !!bools[f.key];
          }
        }
      }
      if (dirty.has('opened_at') && openedAt.trim()) {
        changes.opened_at = openedAt.trim();
      }
      // 색깔 구성 — add/remove 추출
      const addColors = Object.keys(colorState).filter((k) => colorState[k] === 'add');
      const removeColors = Object.keys(colorState).filter((k) => colorState[k] === 'remove');
      if (addColors.length > 0) changes.add_colors = addColors;
      if (removeColors.length > 0) changes.remove_colors = removeColors;
      // 로고 업로드 → public URL 을 changes 에 담음
      if (dirty.has('logo_url') && logoAsset) {
        setUploading(true);
        try {
          const url = await uploadGymLogoSuggestion(logoAsset, authSession.user.id);
          changes.logo_url = url;
        } finally {
          setUploading(false);
        }
      }
      await submit.mutateAsync({
        gymId: id,
        changes,
        note,
      });
      customAlert(
        '제보 보냈어요',
        '관리자 확인 후 반영돼요. 감사합니다!',
        [{ text: '확인', onPress: () => router.back() }],
      );
    } catch (e) {
      customAlert('제출 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  if (isLoading || !prefilled) {
    return (
      <SafeAreaView style={s.loading} edges={['top']}>
        <ActivityIndicator color={c.brand.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          {({ pressed }) => (
            <View style={[s.headerBtn, pressed && { opacity: 0.6 }]}>
              <Feather name="arrow-left" size={22} color={c.text.primary} />
            </View>
          )}
        </Pressable>
        <Text style={s.headerTitle}>정보 제보</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.list}>
          <Text style={s.helperTop}>
            바꾸고 싶은 항목만 옆 체크박스를 켜고 값을 입력해주세요. 관리자 확인 후 반영돼요.
          </Text>

          {/* 로고 */}
          <SectionWrap title="로고">
            <Pressable onPress={handlePickLogo} style={s.logoPicker}>
              {({ pressed }) => (
                <View style={[s.logoBox, pressed && { opacity: 0.85 }]}>
                  {logoUri ? (
                    <Image source={{ uri: logoUri }} style={s.logoImg} />
                  ) : gym?.logo_url ? (
                    <Image source={{ uri: gym.logo_url }} style={s.logoImg} />
                  ) : (
                    <View style={s.logoEmpty}>
                      <Feather name="image" size={24} color={c.text.muted} />
                      <Text style={s.logoEmptyText}>로고 추가</Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
            {logoUri && (
              <View style={s.fieldRowToggle}>
                <Pressable
                  onPress={() => {
                    if (dirty.has('logo_url')) {
                      unmarkDirty('logo_url');
                      setLogoUri(null);
                    } else {
                      markDirty('logo_url');
                    }
                  }}
                >
                  {({ pressed }) => (
                    <View style={[
                      s.includeChip,
                      dirty.has('logo_url') && s.includeChipOn,
                      pressed && { opacity: 0.8 },
                    ]}>
                      <Feather
                        name={dirty.has('logo_url') ? 'check' : 'plus'}
                        size={11}
                        color={dirty.has('logo_url') ? c.brand.onPrimary : c.text.secondary}
                      />
                      <Text style={[
                        s.includeChipText,
                        dirty.has('logo_url') && { color: c.brand.onPrimary },
                      ]}>
                        {dirty.has('logo_url') ? '제보에 포함' : '제보에 포함하기'}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            )}
          </SectionWrap>

          {/* String fields */}
          <SectionWrap title="기본 정보">
            {STRING_FIELDS.slice(0, 3).map((f) => (
              <FieldInput
                key={f.key}
                label={f.label}
                placeholder={f.placeholder}
                value={strings[f.key] ?? ''}
                onChange={(v) => { setStrings((p) => ({ ...p, [f.key]: v })); markDirty(f.key); }}
                included={dirty.has(f.key)}
                onToggle={() => (dirty.has(f.key) ? unmarkDirty(f.key) : markDirty(f.key))}
              />
            ))}
          </SectionWrap>

          <SectionWrap title="규모">
            {NUMBER_FIELDS.map((f) => (
              <FieldInput
                key={f.key}
                label={f.label}
                placeholder={f.placeholder}
                keyboardType="number-pad"
                value={numbers[f.key] ?? ''}
                onChange={(v) => { setNumbers((p) => ({ ...p, [f.key]: v.replace(/[^0-9]/g, '') })); markDirty(f.key); }}
                included={dirty.has(f.key)}
                onToggle={() => (dirty.has(f.key) ? unmarkDirty(f.key) : markDirty(f.key))}
              />
            ))}
            <FieldInput
              label="오픈 연월일"
              placeholder="2022-03-15"
              value={openedAt}
              onChange={(v) => { setOpenedAt(v); markDirty('opened_at'); }}
              included={dirty.has('opened_at')}
              onToggle={() => (dirty.has('opened_at') ? unmarkDirty('opened_at') : markDirty('opened_at'))}
            />
          </SectionWrap>

          {BOOLEAN_GROUPS.map((g) => (
            <SectionWrap key={g.title} title={g.title}>
              <View style={s.boolGrid}>
                {g.items.map((f) => {
                  const on = !!bools[f.key];
                  const included = dirty.has(f.key);
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => {
                        setBools((p) => ({ ...p, [f.key]: !on }));
                        markDirty(f.key);
                      }}
                      onLongPress={() => {
                        // long-press 로 toggle 만 빼고 dirty 해제 (혹은 그냥 켜기)
                        if (included) unmarkDirty(f.key);
                      }}
                    >
                      {({ pressed }) => (
                        <View style={[
                          s.boolChip,
                          included ? (on ? s.boolChipOn : s.boolChipOff) : s.boolChipNeutral,
                          pressed && { opacity: 0.8 },
                        ]}>
                          <Feather
                            name={included ? (on ? 'check' : 'x') : 'circle'}
                            size={12}
                            color={
                              included
                                ? on ? c.brand.onPrimary : c.status.danger
                                : c.text.tertiary
                            }
                          />
                          <Text style={[
                            s.boolChipText,
                            included && on && { color: c.brand.onPrimary },
                            included && !on && { color: c.status.danger },
                          ]}>{f.label}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
              <Text style={s.boolHint}>탭: 있음/없음 토글 (자동 포함) · 길게 누르기: 제보에서 제외</Text>
            </SectionWrap>
          ))}

          <SectionWrap title="자유 설명 (선택)">
            <FieldInput
              label="기타 안내·특이사항"
              placeholder="시그니처 라인, 영업시간 변경 등"
              multiline
              value={strings.description ?? ''}
              onChange={(v) => { setStrings((p) => ({ ...p, description: v })); markDirty('description'); }}
              included={dirty.has('description')}
              onToggle={() => (dirty.has('description') ? unmarkDirty('description') : markDirty('description'))}
            />
            <FieldInput
              label="주차 안내"
              placeholder="건물 지하 2시간 무료 등"
              multiline
              value={strings.parking_info ?? ''}
              onChange={(v) => { setStrings((p) => ({ ...p, parking_info: v })); markDirty('parking_info'); }}
              included={dirty.has('parking_info')}
              onToggle={() => (dirty.has('parking_info') ? unmarkDirty('parking_info') : markDirty('parking_info'))}
            />
          </SectionWrap>

          <SectionWrap title="색깔 구성">
            <Text style={s.boolHint}>
              현재 등록된 색깔에 ✓. 탭으로 추가(+) / 제거(✕) 제안.
            </Text>
            <View style={s.boolGrid}>
              {Object.keys(CLIMB_COLOR_HEX).map((k) => {
                const state = colorState[k] ?? 'absent';
                const hex = resolveColorHex(k);
                const label = CLIMB_COLOR_LABEL[k] ?? k;
                const icon =
                  state === 'registered' ? 'check'
                  : state === 'remove' ? 'x'
                  : state === 'add' ? 'plus'
                  : 'circle';
                const bg =
                  state === 'add' ? c.brand.primary
                  : state === 'remove' ? c.status.dangerBg
                  : state === 'registered' ? c.bg.subtle
                  : c.bg.card;
                const border =
                  state === 'remove' ? c.status.danger + '55'
                  : c.border.subtle;
                const iconColor =
                  state === 'add' ? c.brand.onPrimary
                  : state === 'remove' ? c.status.danger
                  : c.text.tertiary;
                const textColor =
                  state === 'add' ? c.brand.onPrimary
                  : state === 'remove' ? c.status.danger
                  : c.text.secondary;
                return (
                  <Pressable key={k} onPress={() => toggleColor(k)}>
                    {({ pressed }) => (
                      <View style={[
                        s.boolChip,
                        {
                          backgroundColor: bg,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: border,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: hex, borderWidth: 0.5, borderColor: '#cbd5e1' }} />
                        <Feather name={icon as never} size={11} color={iconColor} />
                        <Text style={[s.boolChipText, { color: textColor }]}>{label}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </SectionWrap>

          <SectionWrap title="관리자에게 메모 (선택)">
            <TextInput
              value={note}
              onChangeText={(t) => setNote(t.slice(0, 300))}
              placeholder="출처(인스타·홈피·직접 방문 등) 같은 보조 정보"
              placeholderTextColor={c.text.muted}
              multiline
              maxLength={300}
              style={s.noteInput}
            />
          </SectionWrap>
        </ScrollView>

        <View style={s.footer}>
          <Pressable
            onPress={handleSubmit}
            disabled={submit.isPending || uploading}
          >
            {({ pressed }) => (
              <View style={[s.submitBtn, (submit.isPending || uploading) && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}>
                {submit.isPending || uploading ? (
                  <ActivityIndicator color={c.brand.onPrimary} />
                ) : (
                  <Text style={s.submitBtnText}>제보 보내기</Text>
                )}
              </View>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionWrap({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FieldInput({
  label,
  placeholder,
  value,
  onChange,
  included,
  onToggle,
  multiline,
  keyboardType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  included: boolean;
  onToggle: () => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.fieldRow}>
      <View style={s.fieldHeader}>
        <Text style={s.fieldLabel}>{label}</Text>
        <Pressable onPress={onToggle} hitSlop={6}>
          {({ pressed }) => (
            <View style={[s.includeChip, included && s.includeChipOn, pressed && { opacity: 0.8 }]}>
              <Feather
                name={included ? 'check' : 'plus'}
                size={11}
                color={included ? c.brand.onPrimary : c.text.secondary}
              />
              <Text style={[s.includeChipText, included && { color: c.brand.onPrimary }]}>
                {included ? '제보' : '포함'}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.text.muted}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        style={[s.textInput, multiline && { minHeight: 64, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.subtle,
      backgroundColor: c.bg.card,
    },
    headerBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: c.text.primary, fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
    list: { padding: 20, gap: 22, paddingBottom: 100 },
    helperTop: {
      fontSize: 12,
      color: c.text.tertiary,
      lineHeight: 18,
      fontWeight: '600',
    },
    section: { gap: 12 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text.secondary,
      letterSpacing: -0.2,
      textTransform: 'uppercase',
    },
    fieldRow: { gap: 6 },
    fieldHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: c.text.primary },
    fieldRowToggle: { marginTop: 8 },
    includeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: c.bg.subtle,
    },
    includeChipOn: {
      backgroundColor: c.brand.primary,
    },
    includeChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.text.secondary,
    },
    textInput: {
      backgroundColor: c.bg.card,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: c.text.primary,
      fontSize: 14,
    },
    noteInput: {
      backgroundColor: c.bg.card,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: c.text.primary,
      fontSize: 14,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    logoPicker: { alignItems: 'center' },
    logoBox: {
      width: 100,
      height: 100,
      borderRadius: 16,
      backgroundColor: c.bg.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    logoImg: { width: '100%', height: '100%' },
    logoEmpty: { alignItems: 'center', gap: 4 },
    logoEmptyText: { fontSize: 11, color: c.text.muted, fontWeight: '700' },
    boolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    boolChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
    },
    boolChipNeutral: {
      backgroundColor: c.bg.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
    },
    boolChipOn: { backgroundColor: c.brand.primary },
    boolChipOff: {
      backgroundColor: c.status.dangerBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.status.danger + '55',
    },
    boolChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text.secondary,
    },
    boolHint: {
      fontSize: 10,
      color: c.text.muted,
      fontWeight: '600',
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 18,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border.subtle,
      backgroundColor: c.bg.card,
    },
    submitBtn: {
      backgroundColor: c.brand.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    submitBtnText: {
      color: c.brand.onPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
  });
}
