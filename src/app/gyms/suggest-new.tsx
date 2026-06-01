import { customAlert } from '@/components/ui/custom-alert';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
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
import { useSubmitGymInfo, type GymChanges } from '@/hooks/use-gym-submissions';
import { uploadGymLogoSuggestion } from '@/lib/upload-image';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

type BooleanField =
  | 'has_boulder' | 'has_lead' | 'has_top_rope' | 'has_speed' | 'has_auto_belay'
  | 'has_moonboard' | 'has_kilter' | 'has_tension'
  | 'has_shower' | 'has_locker' | 'has_parking';

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

export default function SuggestNewGymScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
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
  }

  async function handleSubmit() {
    if (!canSubmit || !authSession?.user.id) return;
    try {
      const changes: GymChanges & { name?: string; branch?: string } = {};
      // GymChanges 타입엔 name/branch 없으니 캐스트로 강제 주입
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
      if (instagramHandle.trim()) changes.instagram_handle = instagramHandle.trim();
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
      // gymId=null → 신규 제안. 트리거가 승인 시 gyms 행 INSERT.
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
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          {({ pressed }) => (
            <View style={[s.headerBtn, pressed && { opacity: 0.6 }]}>
              <Feather name="arrow-left" size={22} color={c.text.primary} />
            </View>
          )}
        </Pressable>
        <Text style={s.headerTitle}>새 암장 제안</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.list}>
          <Text style={s.helperTop}>
            아직 등록되지 않은 암장을 제안해주세요. 관리자 검토 후 등록됩니다. 별표(*)는 필수.
          </Text>

          <Section title="로고 (선택)">
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

          <Section title="기본 정보">
            <Field label="암장 이름" required value={name} onChange={setName} placeholder="더클라임" />
            <Field label="지점" value={branch} onChange={setBranch} placeholder="문래점" />
            <Field label="시/도" required value={city} onChange={setCity} placeholder="서울" />
            <Field label="구/군" value={district} onChange={setDistrict} placeholder="영등포구" />
            <Field label="주소" value={address} onChange={setAddress} placeholder="도로명 주소" multiline />
          </Section>

          <Section title="규모 (선택)">
            <Field label="평수" value={sizePyeong} onChange={(v) => setSizePyeong(v.replace(/[^0-9]/g, ''))} placeholder="120" keyboardType="number-pad" />
            <Field label="층수" value={floors} onChange={(v) => setFloors(v.replace(/[^0-9]/g, ''))} placeholder="2" keyboardType="number-pad" />
            <Field label="오픈 연월일" value={openedAt} onChange={setOpenedAt} placeholder="2024-03-15" />
          </Section>

          {BOOLEAN_GROUPS.map((g) => (
            <Section key={g.title} title={g.title}>
              <View style={s.boolGrid}>
                {g.items.map((f) => {
                  const on = !!bools[f.key];
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => setBools((p) => ({ ...p, [f.key]: !on }))}
                    >
                      {({ pressed }) => (
                        <View style={[
                          s.boolChip,
                          on ? s.boolChipOn : s.boolChipOff,
                          pressed && { opacity: 0.8 },
                        ]}>
                          <Feather name={on ? 'check' : 'plus'} size={11} color={on ? c.brand.onPrimary : c.text.secondary} />
                          <Text style={[s.boolChipText, on && { color: c.brand.onPrimary }]}>{f.label}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </Section>
          ))}

          <Section title="연락처 (선택)">
            <Field label="전화" value={phone} onChange={setPhone} placeholder="02-1234-5678" />
            <Field label="웹사이트" value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://..." />
            <Field label="인스타그램" value={instagramHandle} onChange={setInstagramHandle} placeholder="@handle" />
          </Section>

          <Section title="소개 (선택)">
            <Field label="암장 소개" value={description} onChange={setDescription} placeholder="시그니처 라인, 분위기 등" multiline />
          </Section>

          <Section title="관리자 메모 (선택)">
            <TextInput
              value={note}
              onChangeText={(t) => setNote(t.slice(0, 300))}
              placeholder="출처 등 보조 정보"
              placeholderTextColor={c.text.muted}
              multiline
              maxLength={300}
              style={s.noteInput}
            />
          </Section>
        </ScrollView>

        <View style={s.footer}>
          <Pressable onPress={handleSubmit} disabled={!canSubmit || submit.isPending || uploading}>
            {({ pressed }) => (
              <View style={[
                s.submitBtn,
                (!canSubmit || submit.isPending || uploading) && { opacity: 0.5 },
                pressed && { opacity: 0.85 },
              ]}>
                {submit.isPending || uploading ? (
                  <ActivityIndicator color={c.brand.onPrimary} />
                ) : (
                  <Text style={s.submitBtnText}>제안 보내기</Text>
                )}
              </View>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLabel}>
        {label}
        {required && <Text style={{ color: c.status.danger }}> *</Text>}
      </Text>
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
    helperTop: { fontSize: 12, color: c.text.tertiary, lineHeight: 18, fontWeight: '600' },
    section: { gap: 12 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text.secondary,
      letterSpacing: -0.2,
      textTransform: 'uppercase',
    },
    fieldRow: { gap: 5 },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: c.text.primary },
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
    logoBox: {
      alignSelf: 'center',
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
    boolChipOn: { backgroundColor: c.brand.primary },
    boolChipOff: {
      backgroundColor: c.bg.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
    },
    boolChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text.secondary,
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
    submitBtnText: { color: c.brand.onPrimary, fontSize: 15, fontWeight: '800' },
  });
}
