import { customAlert } from '@/components/ui/custom-alert';
import { useRouter } from '@/lib/router';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { BottomCTA } from '@/components/ui/bottom-cta';
import { Chip } from '@/components/ui/chip';
import { FormInput } from '@/components/ui/form';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import { useAuth } from '@/lib/auth-context';
import { useSubmitGymInfo, type GymChanges } from '@/hooks/use-gym-submissions';
import { uploadGymLogoSuggestion } from '@/lib/upload-image';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

type BooleanField =
  | 'has_boulder' | 'has_lead' | 'has_top_rope' | 'has_speed' | 'has_auto_belay'
  | 'has_moonboard' | 'has_kilter' | 'has_tension'
  | 'has_shower' | 'has_locker' | 'has_parking';

type BoolIcon = React.ComponentProps<typeof Feather>['name'];

const BOOLEAN_GROUPS: {
  title: string;
  icon: BoolIcon;
  items: { key: BooleanField; label: string }[];
}[] = [
  {
    title: '종목',
    icon: 'activity',
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
    icon: 'home',
    items: [
      { key: 'has_shower', label: '샤워실' },
      { key: 'has_locker', label: '락커' },
      { key: 'has_parking', label: '주차장' },
    ],
  },
];

export default function SuggestNewGymScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session: authSession } = useAuth();
  const submit = useSubmitGymInfo();

  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [sizePyeong, setSizePyeong] = useState('');
  const [floors, setFloors] = useState('');
  const [openedAt, setOpenedAt] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [bools, setBools] = useState<Partial<Record<BooleanField, boolean>>>({
    has_boulder: true,
  });
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoAsset, setLogoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);

  const canSubmit = name.trim().length > 0 && city.trim().length > 0;

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
        quality: 0.8,
      });
      if (r.canceled || !r.assets[0]) return;
      setLogoAsset(r.assets[0]);
      setLogoUri(r.assets[0].uri);
    } catch (e) {
      customAlert('사진을 불러오지 못했어요', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !authSession?.user.id) return;
    try {
      const changes: GymChanges & { name?: string; branch?: string } = {};
      (changes as Record<string, unknown>).name = name.trim();
      if (branch.trim()) (changes as Record<string, unknown>).branch = branch.trim();
      changes.city = city.trim();
      if (district.trim()) changes.district = district.trim();
      if (address.trim()) changes.address = address.trim();
      if (sizePyeong.trim()) {
        const n = parseInt(sizePyeong, 10);
        if (!Number.isNaN(n)) changes.size_pyeong = n;
      }
      if (floors.trim()) {
        const n = parseInt(floors, 10);
        if (!Number.isNaN(n)) changes.floors_count = n;
      }
      if (openedAt.trim()) changes.opened_at = openedAt.trim();
      if (description.trim()) changes.description = description.trim();
      if (phone.trim()) changes.phone = phone.trim();
      if (websiteUrl.trim()) changes.website_url = websiteUrl.trim();
      if (instagramHandle.trim()) changes.instagram_handle = instagramHandle.trim().replace(/@/g, '');
      for (const g of BOOLEAN_GROUPS) {
        for (const f of g.items) {
          if (bools[f.key] !== undefined) {
            (changes as Record<string, unknown>)[f.key] = !!bools[f.key];
          }
        }
      }
      if (logoAsset) {
        setUploading(true);
        try {
          const url = await uploadGymLogoSuggestion(logoAsset, authSession.user.id);
          changes.logo_url = url;
        } finally {
          setUploading(false);
        }
      }
      await submit.mutateAsync({
        gymId: null,
        changes: changes as GymChanges,
        note,
      });
      customAlert(
        '제안 보냈어요',
        '관리자 확인 후 새 암장으로 등록돼요. 감사합니다!',
        [{ text: '확인', onPress: () => router.back() }],
      );
    } catch (e) {
      customAlert('제출 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader title="새 암장 제안" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 12 }]}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 안내 hero */}
          <View style={s.heroCard}>
            <View style={s.heroIcon}>
              <Feather name="info" size={16} color={c.brand.primaryDeep} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.heroTitle}>아직 등록되지 않은 암장을 제안해주세요</Text>
              <Text style={s.heroDesc}>
                관리자 검토 후 등록돼요. 별표(*)는 필수.
              </Text>
            </View>
          </View>

          <Section title="로고" icon="image" desc="선택 — 정사각형 비율로 잘려요">
            <Pressable onPress={handlePickLogo}>
              {({ pressed }) => (
                <View style={[s.logoBox, pressed && { opacity: 0.85 }]}>
                  {logoUri ? (
                    <Image source={{ uri: logoUri }} style={s.logoImg} />
                  ) : (
                    <View style={s.logoEmpty}>
                      <Feather name="image" size={24} color={c.text.muted} />
                      <Text style={s.logoEmptyText}>로고 추가</Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          </Section>

          <Section title="기본 정보" icon="map-pin" required>
            <View style={s.fieldStack}>
              <FieldRow label="암장 이름" required>
                <FormInput
                  value={name}
                  onChangeText={setName}
                  placeholder="더클라임"
                />
              </FieldRow>
              <FieldRow label="지점">
                <FormInput
                  value={branch}
                  onChangeText={setBranch}
                  placeholder="문래점"
                />
              </FieldRow>
              <FieldRow label="시/도" required>
                <FormInput
                  leadingIcon="map"
                  value={city}
                  onChangeText={setCity}
                  placeholder="서울"
                />
              </FieldRow>
              <FieldRow label="구/군">
                <FormInput
                  value={district}
                  onChangeText={setDistrict}
                  placeholder="영등포구"
                />
              </FieldRow>
              <FieldRow label="주소">
                <FormInput
                  leadingIcon="map-pin"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="도로명 주소"
                  multiline
                />
              </FieldRow>
            </View>
          </Section>

          <Section title="규모" icon="maximize-2" desc="선택">
            <View style={s.fieldStack}>
              <FieldRow label="평수">
                <FormInput
                  value={sizePyeong}
                  onChangeText={(v) => setSizePyeong(v.replace(/[^0-9]/g, ''))}
                  placeholder="120"
                  keyboardType="number-pad"
                  trailingUnit="평"
                />
              </FieldRow>
              <FieldRow label="층수">
                <FormInput
                  value={floors}
                  onChangeText={(v) => setFloors(v.replace(/[^0-9]/g, ''))}
                  placeholder="2"
                  keyboardType="number-pad"
                  trailingUnit="층"
                />
              </FieldRow>
              <FieldRow label="오픈일">
                <FormInput
                  leadingIcon="calendar"
                  value={openedAt}
                  onChangeText={setOpenedAt}
                  placeholder="2024-03-15"
                />
              </FieldRow>
            </View>
          </Section>

          {BOOLEAN_GROUPS.map((g) => (
            <Section key={g.title} title={g.title} icon={g.icon}>
              <View style={s.chipWrap}>
                {g.items.map((f) => {
                  const on = !!bools[f.key];
                  return (
                    <Chip
                      key={f.key}
                      label={f.label}
                      selected={on}
                      onPress={() => setBools((p) => ({ ...p, [f.key]: !on }))}
                    />
                  );
                })}
              </View>
            </Section>
          ))}

          <Section title="연락처" icon="phone" desc="선택">
            <View style={s.fieldStack}>
              <FieldRow label="전화">
                <FormInput
                  leadingIcon="phone"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="02-1234-5678"
                  keyboardType="phone-pad"
                />
              </FieldRow>
              <FieldRow label="웹사이트">
                <FormInput
                  leadingIcon="globe"
                  value={websiteUrl}
                  onChangeText={setWebsiteUrl}
                  placeholder="https://..."
                  autoCapitalize="none"
                />
              </FieldRow>
              <FieldRow label="인스타그램">
                <FormInput
                  value={instagramHandle}
                  onChangeText={setInstagramHandle}
                  placeholder="@handle"
                  autoCapitalize="none"
                />
              </FieldRow>
            </View>
          </Section>

          <Section title="소개" icon="align-left" desc="선택">
            <FormInput
              value={description}
              onChangeText={setDescription}
              placeholder="시그니처 라인, 분위기 등"
              multiline
              inputStyle={{ minHeight: 100 }}
            />
          </Section>

          <Section title="관리자 메모" icon="edit-3" desc="선택 — 출처 등 보조 정보">
            <FormInput
              value={note}
              onChangeText={(t) => setNote(t.slice(0, 300))}
              placeholder="출처 등 보조 정보"
              multiline
              maxLength={300}
              inputStyle={{ minHeight: 80 }}
            />
            <Text style={s.counter}>{note.length} / 300</Text>
          </Section>
        </ScrollView>

        <BottomCTA
          label="제안 보내기"
          icon="send"
          onPress={handleSubmit}
          loading={submit.isPending || uploading}
          disabled={!canSubmit}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLabel}>
        {label}
        {required && <Text style={{ color: c.status.danger }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    list: { padding: 18, gap: 16, paddingBottom: 100 },

    heroCard: {
      flexDirection: 'row',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      backgroundColor: c.brand.primaryLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.brand.primary + '33',
    },
    heroIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bg.card,
    },
    heroTitle: {
      fontSize: 13.5,
      fontWeight: '900',
      color: c.brand.primaryDeep,
      letterSpacing: -0.2,
    },
    heroDesc: { fontSize: 11.5, color: c.text.secondary, fontWeight: '600', lineHeight: 16 },

    fieldStack: { gap: 10 },
    fieldRow: { gap: 6 },
    fieldLabel: { fontSize: 12.5, fontWeight: '800', color: c.text.secondary, letterSpacing: -0.1 },

    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

    logoBox: {
      alignSelf: 'center',
      width: 100,
      height: 100,
      borderRadius: 16,
      backgroundColor: c.bg.subtle,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: c.brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    logoImg: { width: '100%', height: '100%' },
    logoEmpty: { alignItems: 'center', gap: 4 },
    logoEmptyText: { fontSize: 11, color: c.text.tertiary, fontWeight: '700' },

    counter: { fontSize: 11, color: c.text.tertiary, textAlign: 'right', marginTop: 4 },
  });
}
