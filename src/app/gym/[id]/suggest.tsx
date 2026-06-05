import { customAlert } from '@/components/ui/custom-alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { ImageCropModal } from '@/components/crop/image-crop-modal';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { Feather } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/ui/screen-header';
import { BottomCTA } from '@/components/ui/bottom-cta';
import { FormCard, FormField, FormInput } from '@/components/ui/form';
import { useAuth } from '@/lib/auth-context';
import { useGymDetail } from '@/hooks/use-gym-detail';
import { useSubmitGymInfo, type GymChanges } from '@/hooks/use-gym-submissions';
import { extractEdgeBgColor } from '@/lib/extract-edge-color';
import { matchGymStyle } from '@/lib/gym-logos';
import { GymThumbnail } from '@/components/gym/gym-thumbnail';
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

const BOOLEAN_GROUPS: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  items: { key: BooleanField; label: string }[];
}[] = [
  {
    title: '종목',
    icon: 'trending-up',
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
    icon: 'grid',
    items: [
      { key: 'has_moonboard', label: '문보드' },
      { key: 'has_kilter', label: '킬터' },
      { key: 'has_tension', label: '텐션' },
    ],
  },
  {
    title: '편의시설',
    icon: 'droplet',
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
  // DB 에 logo_url 없으면 정적 매핑(브랜드 로고) 으로 fallback.
  const staticLogo = useMemo(
    () => (gym ? matchGymStyle(gym.name, gym.branch).logo : null),
    [gym],
  );
  // 정적 require → URI (배경색 자동 추출 등 외부 API 가 string URI 필요).
  const staticLogoUri = useMemo(
    () => (staticLogo ? Image.resolveAssetSource(staticLogo)?.uri ?? null : null),
    [staticLogo],
  );
  const submit = useSubmitGymInfo();

  // 각 필드별 현재값 prefill + dirty 추적.
  // dirty=true 인 필드만 changes 에 포함해서 제출.
  const [strings, setStrings] = useState<Partial<Record<StringField, string>>>({});
  const [numbers, setNumbers] = useState<Partial<Record<NumberField, string>>>({});
  const [bools, setBools] = useState<Partial<Record<BooleanField, boolean>>>({});
  const [openedAt, setOpenedAt] = useState<string>(''); // YYYY-MM-DD
  const [logoUri, setLogoUri] = useState<string | null>(null); // preview uri
  const [logoAsset, setLogoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [logoBgHex, setLogoBgHex] = useState<string>('');  // '' = 기본(없음), '#ffffff', '#000000', 자유 hex
  const [logoBgMode, setLogoBgMode] = useState<'auto' | 'manual'>('auto');  // 'auto' = 추천 (테두리 픽셀로 추정)
  const [note, setNote] = useState('');
  // 색깔 구성 — 현재 등록된 색깔 집합 + 토글로 add/remove 추적
  const [colorState, setColorState] = useState<Record<string, 'registered' | 'add' | 'remove' | 'absent'>>({});
  // 순서 — 현재 보이는 색깔(registered + add - remove) 의 정렬 순서. 드래그로 변경.
  const [colorOrder, setColorOrder] = useState<string[]>([]);
  // 원본 순서 — 변경 감지용 (직렬화해서 비교)
  const initialOrderRef = React.useRef<string>('');
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
    {
      const existingBg = (gym as { logo_bg_hex?: string | null }).logo_bg_hex ?? null;
      if (existingBg) {
        setLogoBgHex(existingBg);
        setLogoBgMode('manual');
      } else {
        setLogoBgHex('');
        setLogoBgMode('auto');
      }
    }
    // 색깔 상태: 등록된 건 'registered', 나머지는 'absent'
    const registered = new Set(gym.color_schemes.map((cs) => cs.color.toLowerCase()));
    const cstate: Record<string, 'registered' | 'absent'> = {};
    for (const k of Object.keys(CLIMB_COLOR_HEX)) {
      cstate[k] = registered.has(k) ? 'registered' : 'absent';
    }
    setColorState(cstate);
    // 순서 — gym.color_schemes 는 이미 order_index asc 로 정렬된 상태
    const order = gym.color_schemes.map((cs) => cs.color.toLowerCase());
    setColorOrder(order);
    initialOrderRef.current = order.join(',');
    setPrefilled(true);
  }, [gym, prefilled]);

  // 기존 로고(DB 또는 정적 매핑) + bg 미저장 + auto 모드 → 마운트 시점에 한 번 자동 추출.
  useEffect(() => {
    if (!prefilled) return;
    const sourceUri = gym?.logo_url ?? staticLogoUri ?? null;
    if (!sourceUri) return;
    if (logoBgMode !== 'auto') return;
    if (logoBgHex) return;
    if (dirty.has('logo_bg_hex')) return;
    let cancelled = false;
    (async () => {
      const guessed = await extractEdgeBgColor(sourceUri);
      if (!cancelled && guessed) {
        setLogoBgHex(guessed);
        markDirty('logo_bg_hex');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilled, gym?.logo_url, staticLogoUri]);

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
      // 순서 동기화: 추가될 때 끝에 붙이고, 제거될 때 빠진다.
      setColorOrder((order) => {
        const has = order.includes(color);
        const goingIn = next === 'add' || next === 'registered';
        if (goingIn && !has) return [...order, color];
        if (!goingIn && has) return order.filter((k) => k !== color);
        return order;
      });
      return { ...prev, [color]: next };
    });
  }

  // 자르기 모달 — picker 결과 임시 보관 후 모달에서 crop → onConfirm 에서 적용.
  const [pendingCropUri, setPendingCropUri] = useState<string | null>(null);

  async function handlePickLogo() {
    if (uploading) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      customAlert('권한 필요', '사진 라이브러리 접근 권한이 필요해요');
      return;
    }
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 0.9,
      });
      if (r.canceled || !r.assets[0]) return;
      setPendingCropUri(r.assets[0].uri);
    } catch (e) {
      customAlert('사진을 불러오지 못했어요', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  async function handleCropConfirm(croppedUri: string, width: number, height: number) {
    setPendingCropUri(null);
    const adapted: ImagePicker.ImagePickerAsset = {
      uri: croppedUri,
      width,
      height,
      mimeType: 'image/jpeg',
    } as ImagePicker.ImagePickerAsset;
    setLogoAsset(adapted);
    setLogoUri(croppedUri);
    markDirty('logo_url');

    // 배경색 자동 추정 — '추천' 모드 ('auto') 일 때만 자동 적용.
    if (logoBgMode === 'auto') {
      const guessed = await extractEdgeBgColor(croppedUri);
      if (guessed) {
        setLogoBgHex(guessed);
        markDirty('logo_bg_hex');
      }
    }
  }

  // 변경 항목 카운트 — 헤더 배지에 노출
  const changeCount = useMemo(() => {
    let n = dirty.size;
    for (const v of Object.values(colorState)) {
      if (v === 'add' || v === 'remove') n += 1;
    }
    if (colorOrder.join(',') !== initialOrderRef.current && initialOrderRef.current) n += 1;
    return n;
  }, [dirty, colorState, colorOrder]);

  async function handleSubmit() {
    if (!id || !authSession?.user.id) return;
    const hasColorChange = Object.values(colorState).some((v) => v === 'add' || v === 'remove');
    const hasOrderChange = colorOrder.join(',') !== initialOrderRef.current;
    if (dirty.size === 0 && !hasColorChange && !hasOrderChange && !note.trim()) {
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
      // 색깔 구성 — add/remove/순서 추출
      const addColors = Object.keys(colorState).filter((k) => colorState[k] === 'add');
      const removeColors = Object.keys(colorState).filter((k) => colorState[k] === 'remove');
      if (addColors.length > 0) changes.add_colors = addColors;
      if (removeColors.length > 0) changes.remove_colors = removeColors;
      // 순서가 바뀐 경우만 color_order 포함
      if (colorOrder.join(',') !== initialOrderRef.current) {
        changes.color_order = colorOrder;
      }
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
      // 로고 배경색
      if (dirty.has('logo_bg_hex')) {
        const trimmed = logoBgHex.trim();
        if (trimmed === '') {
          changes.logo_bg_hex = null;
        } else if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
          changes.logo_bg_hex = trimmed.toLowerCase();
        } else {
          customAlert('배경색 형식 오류', "#000000 같은 6자리 hex 형식으로 입력해주세요.");
          return;
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
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader
        title="정보 제보"
        onBack={() => router.back()}
        count={changeCount > 0 ? changeCount : undefined}
        subtitle={gym ? `${gym.name}${gym.branch ? ` ${gym.branch}` : ''}` : undefined}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[s.list, { paddingBottom: 16 }]}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
        >
          {/* Hero helper card */}
          <View style={s.heroCard}>
            <View style={s.heroIconBox}>
              <Feather name="info" size={16} color={c.brand.primaryDeep} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.heroTitle}>바꾸고 싶거나 추가할 항목만 채워주세요</Text>
              <Text style={s.heroDesc}>
                입력한 항목만 제보에 들어가요. 관리자 확인 후 반영돼요.
              </Text>
            </View>
          </View>

          {/* 로고 */}
          <SectionWrap
            title="로고"
            icon="image"
            trailing={
              logoUri ? (
                <Pressable
                  onPress={() => {
                    unmarkDirty('logo_url');
                    setLogoUri(null);
                    setLogoAsset(null);
                  }}
                  hitSlop={6}
                >
                  {({ pressed }) => (
                    <View style={[s.includeChip, pressed && { opacity: 0.8 }]}>
                      <Feather name="x" size={11} color={c.text.secondary} />
                      <Text style={s.includeChipText}>되돌리기</Text>
                    </View>
                  )}
                </Pressable>
              ) : undefined
            }
          >
            <Pressable onPress={handlePickLogo} style={s.logoPicker}>
              {({ pressed }) => (
                <View style={[s.logoBox, pressed && { opacity: 0.85 }]}>
                  {logoUri ? (
                    <Image source={{ uri: logoUri }} style={s.logoImg} />
                  ) : gym?.logo_url ? (
                    <Image source={{ uri: gym.logo_url }} style={s.logoImg} />
                  ) : staticLogo ? (
                    <Image source={staticLogo} style={s.logoImg} resizeMode="contain" />
                  ) : (
                    <View style={s.logoEmpty}>
                      <Feather name="image" size={24} color={c.text.muted} />
                      <Text style={s.logoEmptyText}>로고 추가</Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
            {/* 로고 자르기 — 새로 올린 것/DB 기존/정적 매핑 무엇이든 현재 로고 재자르기 */}
            {(logoUri || gym?.logo_url || staticLogoUri) && (
              <Pressable
                onPress={() => setPendingCropUri(logoUri ?? gym?.logo_url ?? staticLogoUri ?? null)}
              >
                {({ pressed }) => (
                  <View style={[s.cropExistingBtn, pressed && { opacity: 0.7 }]}>
                    <Feather name="crop" size={12} color={c.brand.primary} />
                    <Text style={s.cropExistingText}>로고 자르기</Text>
                  </View>
                )}
              </Pressable>
            )}
          </SectionWrap>

          {/* 로고 배경색 */}
          <SectionWrap title="로고 배경색" icon="droplet">
            <View style={s.bgColorSwatchRow}>
              {/* 추천 — 테두리 픽셀로 자동 추정. 디폴트. */}
              <Pressable
                key="auto"
                onPress={async () => {
                  setLogoBgMode('auto');
                  const sourceUri = logoUri ?? gym?.logo_url ?? staticLogoUri ?? null;
                  if (sourceUri) {
                    const guessed = await extractEdgeBgColor(sourceUri);
                    if (guessed) {
                      setLogoBgHex(guessed);
                      markDirty('logo_bg_hex');
                    }
                  }
                }}
                style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={[s.bgColorSwatch, logoBgMode === 'auto' && s.bgColorSwatchActive]}>
                  <View
                    style={[
                      s.bgColorChip,
                      {
                        backgroundColor: c.brand.primaryLight,
                        borderWidth: 0,
                      },
                    ]}
                  >
                    <Feather name="zap" size={14} color={c.brand.primaryDeep} />
                  </View>
                  <Text style={[s.bgColorLabel, logoBgMode === 'auto' && { color: c.brand.primaryDeep, fontWeight: '900' }]}>
                    추천
                  </Text>
                </View>
              </Pressable>
              {([
                { label: '없음', value: '' },
                { label: '흰색', value: '#ffffff' },
                { label: '검정', value: '#000000' },
              ] as const).map((opt) => {
                const active = logoBgMode === 'manual' && logoBgHex.trim().toLowerCase() === opt.value;
                return (
                  <Pressable
                    key={opt.label}
                    onPress={() => {
                      setLogoBgMode('manual');
                      setLogoBgHex(opt.value);
                      markDirty('logo_bg_hex');
                    }}
                    style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
                  >
                    <View style={[s.bgColorSwatch, active && s.bgColorSwatchActive]}>
                      <View
                        style={[
                          s.bgColorChip,
                          opt.value
                            ? { backgroundColor: opt.value, borderWidth: opt.value === '#ffffff' ? 1 : 0, borderColor: c.border.subtle }
                            : { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border.strong },
                        ]}
                      >
                        {!opt.value && (
                          <Feather name="x" size={14} color={c.text.muted} />
                        )}
                      </View>
                      <Text style={[s.bgColorLabel, active && { color: c.brand.primaryDeep, fontWeight: '900' }]}>
                        {opt.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <FormField label="또는 직접 입력" hint="예: #1a1a1a (6자리 hex)">
              <FormInput
                leadingText="#"
                value={logoBgHex.startsWith('#') ? logoBgHex.slice(1) : logoBgHex}
                onChangeText={(t) => {
                  const cleaned = t.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                  setLogoBgMode('manual');
                  setLogoBgHex(cleaned ? `#${cleaned}` : '');
                  markDirty('logo_bg_hex');
                }}
                placeholder="000000"
                autoCapitalize="none"
                maxLength={6}
              />
            </FormField>
            {/* 미리보기 — 실제 암장 카드/상세에서 보일 thumbnail 그대로 */}
            {gym && (logoUri || gym.logo_url || staticLogo) && (
              <View style={s.previewWrap}>
                <GymThumbnail
                  name={gym.name}
                  branch={gym.branch}
                  size={80}
                  logoUrl={logoUri ?? gym.logo_url ?? null}
                  logoBgHex={
                    logoBgHex.trim() && /^#[0-9A-Fa-f]{6}$/.test(logoBgHex.trim())
                      ? logoBgHex
                      : null
                  }
                />
                <Text style={s.previewLabel}>실제 프로필에서 이렇게 보여요</Text>
              </View>
            )}
          </SectionWrap>

          {/* String fields */}
          <SectionWrap title="기본 정보" icon="map-pin">
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

          {/* 연락처 — 전화·웹·인스타 */}
          <SectionWrap title="연락처" icon="phone">
            <FieldInput
              label="전화번호"
              placeholder="02-1234-5678"
              value={strings.phone ?? ''}
              onChange={(v) => { setStrings((p) => ({ ...p, phone: v })); markDirty('phone'); }}
              included={dirty.has('phone')}
              onToggle={() => (dirty.has('phone') ? unmarkDirty('phone') : markDirty('phone'))}
            />
            <FieldInput
              label="웹사이트"
              placeholder="https://..."
              value={strings.website_url ?? ''}
              onChange={(v) => { setStrings((p) => ({ ...p, website_url: v })); markDirty('website_url'); }}
              included={dirty.has('website_url')}
              onToggle={() => (dirty.has('website_url') ? unmarkDirty('website_url') : markDirty('website_url'))}
            />
            <FieldInput
              label="인스타그램"
              placeholder="@handle"
              value={strings.instagram_handle ?? ''}
              onChange={(v) => {
                // @ 없이 입력해도 자동 보정 — 단순 영숫자+밑줄+점
                const cleaned = v.replace(/[^A-Za-z0-9_.]/g, '').slice(0, 30);
                setStrings((p) => ({ ...p, instagram_handle: cleaned }));
                markDirty('instagram_handle');
              }}
              included={dirty.has('instagram_handle')}
              onToggle={() => (dirty.has('instagram_handle') ? unmarkDirty('instagram_handle') : markDirty('instagram_handle'))}
            />
          </SectionWrap>

          <SectionWrap title="규모" icon="maximize-2">
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
            <OpenYearMonthField
              value={openedAt}
              onChange={(v) => { setOpenedAt(v); markDirty('opened_at'); }}
            />
          </SectionWrap>

          {BOOLEAN_GROUPS.map((g) => (
            <SectionWrap key={g.title} title={g.title} icon={g.icon}>
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
              <Text style={s.boolHint}>탭: 있음/없음 · 길게 누르기: 안 바꿈으로 되돌리기</Text>
            </SectionWrap>
          ))}

          <SectionWrap title="자유 설명 (선택)" icon="align-left">
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

          <SectionWrap title="색깔 구성" icon="droplet">
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

            {colorOrder.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={s.boolHint}>
                  순서 — 핸들(≡)을 길게 눌러서 드래그. 위에서 아래 = 쉬운 → 어려운.
                </Text>
                <DraggableFlatList
                  data={colorOrder}
                  keyExtractor={(item) => item}
                  onDragEnd={({ data }) => setColorOrder(data)}
                  scrollEnabled={false}
                  activationDistance={8}
                  containerStyle={{ overflow: 'visible' }}
                  renderItem={({ item, drag, isActive }) => (
                    <OrderRow color={item} drag={drag} isActive={isActive} c={c} />
                  )}
                />
              </View>
            )}
          </SectionWrap>

          <SectionWrap title="관리자에게 메모 (선택)" icon="message-square">
            <FormInput
              value={note}
              onChangeText={(t) => setNote(t.slice(0, 300))}
              placeholder="출처(인스타·홈피·직접 방문 등) 같은 보조 정보"
              multiline
              maxLength={300}
            />
          </SectionWrap>
        </ScrollView>

        <BottomCTA
          label={changeCount > 0 ? `변경 ${changeCount}건 보내기` : '제보 보내기'}
          icon="send"
          onPress={handleSubmit}
          loading={submit.isPending || uploading}
          disabled={changeCount === 0 && !note.trim()}
        />
      </KeyboardAvoidingView>

      <ImageCropModal
        visible={!!pendingCropUri}
        uri={pendingCropUri}
        onCancel={() => setPendingCropUri(null)}
        onConfirm={handleCropConfirm}
      />
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function OrderRow({ color, drag, isActive, c }: {
  color: string;
  drag: () => void;
  isActive: boolean;
  c: ThemeColors;
}) {
  const hex = resolveColorHex(color);
  const label = CLIMB_COLOR_LABEL[color] ?? color;
  const isLight = color === 'white' || color === 'yellow' || color === 'lime' || color === 'sky';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
        marginBottom: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: isActive ? c.brand.primary : c.border.subtle,
        backgroundColor: c.bg.card,
        opacity: isActive ? 0.92 : 1,
      }}
    >
      <Pressable onLongPress={drag} delayLongPress={120} hitSlop={6} style={{ padding: 2 }}>
        <Feather name="menu" size={16} color={c.text.muted} />
      </Pressable>
      <View
        style={{
          width: 20, height: 20, borderRadius: 10, backgroundColor: hex,
          borderWidth: isLight ? 1 : 0, borderColor: c.border.subtle,
        }}
      />
      <Text style={{ flex: 1, color: c.text.primary, fontSize: 13, fontWeight: '800' }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * 오픈 연월 입력 — 연도 4자리 + 월 1~2자리 두 칸으로 받음.
 * 내부적으론 'YYYY-MM-01' 형식으로 저장 (DB date 컬럼 호환).
 * prefill 시 'YYYY-MM-DD' 받으면 year/month 만 추출.
 */
function OpenYearMonthField({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const m = /^(\d{4})-(\d{2})/.exec(value || '');
  const yearStr = m?.[1] ?? '';
  const monthStr = m?.[2] ?? '';

  function emit(y: string, mo: string) {
    if (y.length === 4 && mo.length >= 1) {
      const yi = parseInt(y, 10);
      const mi = parseInt(mo, 10);
      if (yi >= 1900 && yi <= 2100 && mi >= 1 && mi <= 12) {
        onChange(`${y}-${String(mi).padStart(2, '0')}-01`);
        return;
      }
    }
    onChange('');
  }

  return (
    <FormField label="오픈 연월">
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 2 }}>
          <FormInput
            value={yearStr}
            onChangeText={(t) => {
              const cleaned = t.replace(/[^0-9]/g, '').slice(0, 4);
              emit(cleaned, monthStr);
            }}
            placeholder="2022"
            keyboardType="number-pad"
            trailingUnit="년"
            maxLength={4}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FormInput
            value={monthStr.replace(/^0/, '') /* 표시는 1자리 우선 */}
            onChangeText={(t) => {
              const cleaned = t.replace(/[^0-9]/g, '').slice(0, 2);
              emit(yearStr, cleaned);
            }}
            placeholder="3"
            keyboardType="number-pad"
            trailingUnit="월"
            maxLength={2}
          />
        </View>
      </View>
    </FormField>
  );
}

function SectionWrap({
  title, icon, trailing, children,
}: {
  title: string;
  icon?: keyof typeof Feather.glyphMap;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <FormCard title={title} icon={icon} trailing={trailing}>
      {children}
    </FormCard>
  );
}

function IncludeChip({ included, onToggle }: { included: boolean; onToggle: () => void }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
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
  );
}

function FieldInput({
  label,
  placeholder,
  value,
  onChange,
  multiline,
  keyboardType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  /** @deprecated 칩 제거됨 — 호환을 위해 prop은 유지하지만 무시. 입력 즉시 dirty 처리. */
  included?: boolean;
  /** @deprecated */
  onToggle?: () => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <FormField label={label}>
      <FormInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
      />
    </FormField>
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

    bgColorSwatchRow: {
      flexDirection: 'row',
      gap: 8,
    },
    bgColorSwatch: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: c.bg.subtle,
      borderWidth: 1.5,
      borderColor: 'transparent',
      alignItems: 'center',
      gap: 6,
    },
    bgColorSwatchActive: {
      borderColor: c.brand.primary,
      backgroundColor: c.brand.primaryLight,
    },
    bgColorChip: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bgColorLabel: {
      fontSize: 11.5,
      fontWeight: '700',
      color: c.text.secondary,
    },
    previewWrap: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
    },
    cropExistingBtn: {
      flexDirection: 'row',
      alignSelf: 'center',
      alignItems: 'center',
      gap: 5,
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.brand.primaryLight,
    },
    cropExistingText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: c.brand.primaryDeep,
      letterSpacing: -0.1,
    },
    previewLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.text.tertiary,
      letterSpacing: -0.1,
    },
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
    heroCard: {
      flexDirection: 'row',
      gap: 12,
      padding: 14,
      backgroundColor: c.brand.primaryLight,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.brand.primary + '33',
    },
    heroIconBox: {
      width: 32, height: 32, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.bg.card,
    },
    heroTitle: {
      fontSize: 13.5,
      fontWeight: '900',
      color: c.brand.primaryDeep,
      letterSpacing: -0.2,
    },
    heroDesc: {
      fontSize: 12,
      color: c.text.secondary,
      lineHeight: 17,
      fontWeight: '600',
    },
  });
}
