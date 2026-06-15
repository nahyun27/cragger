import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { customAlert } from '@/components/ui/custom-alert';
import { FormInput } from '@/components/ui/form';
import { Sheet } from '@/components/ui/sheet';
import { useLocalSearchParams, useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth-context';
import { useThemeColors, type ThemeColors } from '@/lib/theme';
import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import {
  useSprayWallPhotos,
  useSprayWallProblems,
  useAddSprayWallProblem,
  useGymColorSchemes,
  type HoldType,
  type ProblemType,
} from '@/hooks/use-spray-wall';

const SCREEN_W = Dimensions.get('window').width;
const SAVE_BAR_H = 76;

const BOULDER_HOLD_COLOR: Record<HoldType, string> = {
  start:  '#22c55e',
  middle: '#3b82f6',
  top:    '#ef4444',
  foot:   '#7c3aed',
};
const ENDURANCE_HOLD_COLOR = '#f97316';

const HOLD_SIZE: Record<HoldType, number> = {
  start: 28, middle: 20, top: 28, foot: 20,
};

// 찍볼 타입별 최대 개수 (undefined = 무제한)
const MAX_COUNTS: Partial<Record<HoldType, number>> = {
  top: 2,
  start: 4,
};

const HOLD_SHORT: Record<HoldType, string> = {
  start: 'S', middle: '#', top: 'T', foot: '발',
};

const BOULDER_TYPES: { type: HoldType; label: string }[] = [
  { type: 'start',  label: '스타트' },
  { type: 'middle', label: '손+발' },
  { type: 'top',    label: '탑' },
  { type: 'foot',   label: '발만' },
];

type PendingHold = { holdType: HoldType; markerX: number; markerY: number; notes: string };

export default function SprayWallNewScreen() {
  const { id: gymId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useThemeColors();
  const s = makeStyles(c);
  const insets = useSafeAreaInsets();
  const { session: authSession } = useAuth();

  const photosQ = useSprayWallPhotos(gymId);
  const [photoIdx, setPhotoIdx] = useState(0);
  const currentPhoto = photosQ.data?.[photoIdx] ?? null;
  const photos = photosQ.data ?? [];

  const allProblemsQ = useSprayWallProblems(gymId);
  const allProblems = allProblemsQ.data ?? [];

  const colorSchemesQ = useGymColorSchemes(gymId);
  const colorSchemes = colorSchemesQ.data ?? [];

  const addProblem = useAddSprayWallProblem(gymId!);

  const [problemType, setProblemType] = useState<ProblemType>('boulder');
  const [selectedHoldType, setSelectedHoldType] = useState<HoldType>('start');
  const [pendingHolds, setPendingHolds] = useState<PendingHold[]>([]);
  const [imgLayout, setImgLayout] = useState<{ width: number; height: number } | null>(null);
  const [holdSizeSmall, setHoldSizeSmall] = useState(false);
  const tapStartRef = useRef({ x: 0, y: 0 });

  const [memoHoldIdx, setMemoHoldIdx] = useState<number | null>(null);
  const [memoText, setMemoText] = useState('');
  const [holdPickerVisible, setHoldPickerVisible] = useState(false);

  const [problemName, setProblemName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  const [photoH, setPhotoH] = useState(SCREEN_W * 0.75);
  useEffect(() => {
    const url = currentPhoto?.photo_url;
    if (!url) return;
    Image.getSize(url, (w, h) => setPhotoH(Math.round(SCREEN_W * h / w)));
  }, [currentPhoto?.photo_url]);

  // 타입별 배치 수
  const holdCounts = pendingHolds.reduce<Partial<Record<HoldType, number>>>((acc, h) => {
    acc[h.holdType] = (acc[h.holdType] ?? 0) + 1;
    return acc;
  }, {});

  function placeHoldAt(locationX: number, locationY: number) {
    if (!imgLayout) return;
    const x = Math.round((locationX / imgLayout.width) * 100);
    const y = Math.round((locationY / imgLayout.height) * 100);

    if (problemType === 'endurance') {
      setPendingHolds((prev) => [...prev, { holdType: 'middle', markerX: x, markerY: y, notes: '' }]);
    } else {
      const count = holdCounts[selectedHoldType] ?? 0;
      const max = MAX_COUNTS[selectedHoldType];
      if (max !== undefined && count >= max) return; // 최대 개수 도달

      setPendingHolds((prev) => [...prev, { holdType: selectedHoldType, markerX: x, markerY: y, notes: '' }]);

      // 배치 후 자동 타입 전환
      if (selectedHoldType === 'start') {
        const newCount = count + 1;
        if (newCount >= (MAX_COUNTS.start ?? Infinity)) {
          setSelectedHoldType('middle');
        }
      }
    }
  }

  async function handleSave() {
    if (!currentPhoto) return;
    if (pendingHolds.length === 0) {
      customAlert('홀드 없음', '벽을 탭해서 홀드 위치를 최소 1개 찍어주세요.');
      return;
    }
    const nextNumber = allProblems.length > 0
      ? Math.max(...allProblems.map((p) => p.number)) + 1
      : 1;
    try {
      await addProblem.mutateAsync({
        photoId: currentPhoto.id,
        number: nextNumber,
        name: problemName.trim() || null,
        description: description.trim() || undefined,
        color: selectedColor,
        problemType,
        holds: pendingHolds.map((h) => ({ ...h, notes: h.notes.trim() || undefined })),
      });
      router.back();
    } catch (e) {
      customAlert('저장 실패', e instanceof Error ? e.message : '오류가 발생했어요.');
    }
  }

  const pendingNextNum = allProblems.length > 0
    ? Math.max(...allProblems.map((p) => p.number)) + 1
    : 1;

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader title="문제 추가" onBack={() => router.back()} rightActions={[]} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + SAVE_BAR_H + 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 문제 종류 ─────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>문제 종류</Text>
          <View style={s.typeRow}>
            {(['boulder', 'endurance'] as ProblemType[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  setProblemType(t);
                  setPendingHolds([]);
                  setSelectedHoldType('start');
                  setMemoHoldIdx(null);
                  setMemoText('');
                }}
                style={[s.typeBtn, problemType === t && s.typeBtnActive]}
              >
                <Text style={[s.typeBtnText, problemType === t && s.typeBtnTextActive]}>
                  {t === 'boulder' ? '찍볼' : '지구력'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── 난이도 색깔 ────────────────────────────────────────── */}
        {colorSchemes.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>난이도 색깔</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -16 }}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              <Pressable
                onPress={() => setSelectedColor(null)}
                style={[s.colorChip, !selectedColor && s.colorChipActive]}
              >
                <Text style={[s.colorChipText, !selectedColor && { color: c.brand.primary }]}>없음</Text>
              </Pressable>
              {colorSchemes.map((cs) => {
                const hex = resolveColorHex(cs.color, cs.color_hex);
                const label = cs.official_label ?? resolveColorLabel(cs.color);
                const isSelected = selectedColor === cs.color;
                return (
                  <Pressable
                    key={cs.color}
                    onPress={() => setSelectedColor(cs.color)}
                    style={[s.colorChip, isSelected && { borderColor: hex, backgroundColor: `${hex}18` }]}
                  >
                    <View style={[s.colorDot, { backgroundColor: hex }]} />
                    <Text style={[s.colorChipText, isSelected && { color: hex, fontWeight: '800' }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── 사진 + 홀드 배치 영역 ─────────────────────────────── */}
        {photos.length === 0 ? (
          <View style={[s.photoArea, { height: photoH, justifyContent: 'center', alignItems: 'center', gap: 8 }]}>
            <Feather name="image" size={28} color={c.text.muted} />
            <Text style={{ fontSize: 12, color: c.text.muted, fontWeight: '600' }}>스프레이월 사진이 없어요</Text>
          </View>
        ) : (
          <>
            <View style={s.photoTipRow}>
              <Feather name="info" size={11} color={c.text.muted} />
              <Text style={s.photoTipText}>
                {problemType === 'boulder'
                  ? '사진을 탭해서 홀드를 찍어요. 탑홀드 최대 2개, 스타트 최대 4개.'
                  : '1번부터 순서대로 탭해요.'}
              </Text>
            </View>

            <View
              onLayout={(e) => setImgLayout(e.nativeEvent.layout)}
              style={[s.photoArea, { height: photoH }]}
              onStartShouldSetResponder={() => true}
              onResponderTerminationRequest={() => true}
              onResponderGrant={(e) => {
                tapStartRef.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
              }}
              onResponderRelease={(e) => {
                const dx = e.nativeEvent.locationX - tapStartRef.current.x;
                const dy = e.nativeEvent.locationY - tapStartRef.current.y;
                if (Math.abs(dx) <= 10 && Math.abs(dy) <= 10) {
                  placeHoldAt(e.nativeEvent.locationX, e.nativeEvent.locationY);
                }
              }}
            >
              <Image
                source={{ uri: currentPhoto?.photo_url }}
                style={{ width: SCREEN_W, height: photoH }}
                resizeMode="contain"
              />

              {pendingHolds.map((ph, i) => {
                const sizeFactor = holdSizeSmall ? 0.6 : 1;
                const baseSize = problemType === 'endurance' ? 20 : HOLD_SIZE[ph.holdType];
                const size = Math.round(baseSize * sizeFactor);
                const left = (ph.markerX / 100) * SCREEN_W - size / 2;
                const top = (ph.markerY / 100) * photoH - size / 2;
                const color = problemType === 'endurance'
                  ? ENDURANCE_HOLD_COLOR
                  : BOULDER_HOLD_COLOR[ph.holdType];
                const label = problemType === 'endurance'
                  ? String(i + 1)
                  : ph.holdType === 'start' ? 'S'
                  : ph.holdType === 'top' ? 'T'
                  : '';
                return (
                  <View
                    key={`ph-${i}`}
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      width: size, height: size, borderRadius: size / 2,
                      backgroundColor: color,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 2, borderStyle: 'dashed', borderColor: '#ffffff',
                      left, top, opacity: 0.9,
                      shadowColor: '#000', shadowOpacity: 0.3,
                      shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
                      elevation: 5,
                    }}
                  >
                    {label ? (
                      <Text style={{ color: '#ffffff', fontSize: size * 0.38, fontWeight: '900' }}>{label}</Text>
                    ) : null}
                  </View>
                );
              })}

              {pendingHolds.length === 0 && (
                <View style={s.placeOverlay} pointerEvents="none">
                  <Text style={s.placeOverlayText}>
                    {problemType === 'boulder' ? 'S 스타트부터 탭해서 홀드를 찍어요' : '1번 홀드부터 순서대로 탭해요'}
                  </Text>
                </View>
              )}
            </View>

            {photos.length > 1 && (
              <View style={s.pageIndicator}>
                {photos.map((ph, i) => (
                  <Pressable key={ph.id} onPress={() => { setPhotoIdx(i); setPendingHolds([]); }}>
                    <View style={[s.pageDot, i === photoIdx && s.pageDotActive]} />
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── 홀드 타입 + 현황 ───────────────────────────────────── */}
        {photos.length > 0 && (
          <View style={s.controlsCard}>
            {/* 상단: 타이틀 + 작게 토글 + 실행취소 */}
            <View style={s.controlsHeader}>
              <Text style={s.sectionTitle}>
                {problemType === 'boulder' ? '홀드 타입' : '홀드 배치'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {pendingHolds.length > 0 && (
                  <Pressable
                    onPress={() => {
                      const newHolds = pendingHolds.slice(0, -1);
                      setPendingHolds(newHolds);
                      if (memoHoldIdx !== null && memoHoldIdx >= newHolds.length) {
                        setMemoHoldIdx(null);
                        setMemoText('');
                      }
                    }}
                    style={s.undoBtn}
                  >
                    <Feather name="rotate-ccw" size={12} color={c.text.tertiary} />
                    <Text style={s.undoBtnText}>실행취소</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setHoldSizeSmall((v) => !v)}
                  style={[s.smallToggleBtn, holdSizeSmall && s.smallToggleBtnActive]}
                >
                  <Feather name="minimize-2" size={11} color={holdSizeSmall ? '#ffffff' : c.text.tertiary} />
                  <Text style={[s.smallToggleBtnText, holdSizeSmall && { color: '#ffffff' }]}>작게</Text>
                </Pressable>
              </View>
            </View>

            {/* 찍볼 홀드 타입 버튼 */}
            {problemType === 'boulder' && (
              <View style={s.holdTypeRow}>
                {BOULDER_TYPES.map(({ type, label }) => {
                  const color = BOULDER_HOLD_COLOR[type];
                  const count = holdCounts[type] ?? 0;
                  const max = MAX_COUNTS[type];
                  const atMax = max !== undefined && count >= max;
                  const isSelected = selectedHoldType === type;

                  return (
                    <Pressable
                      key={type}
                      onPress={() => setSelectedHoldType(type)}
                      style={[
                        s.holdTypeBtn,
                        isSelected && { backgroundColor: color, borderColor: color },
                        atMax && !isSelected && s.holdTypeBtnCapped,
                      ]}
                    >
                      <View style={[s.holdTypeDot, { backgroundColor: color }, isSelected && { backgroundColor: '#ffffff80' }]} />
                      <Text style={[s.holdTypeBtnText, isSelected && { color: '#ffffff' }]}>{label}</Text>
                      {count > 0 && (
                        <View style={[
                          s.holdCountBadge,
                          atMax
                            ? { backgroundColor: isSelected ? 'rgba(255,255,255,0.22)' : '#ff6b0018' }
                            : { backgroundColor: isSelected ? 'rgba(255,255,255,0.18)' : `${color}18` },
                        ]}>
                          <Text style={[
                            s.holdCountBadgeText,
                            { color: atMax ? (isSelected ? '#ffffff' : '#f97316') : (isSelected ? '#ffffffcc' : color) },
                          ]}>
                            {max ? `${count}/${max}` : `×${count}`}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* 타입별 요약 (찍볼) or 전체 개수 (지구력) */}
            {pendingHolds.length > 0 && (
              <View style={s.holdSummaryRow}>
                {problemType === 'boulder' ? (
                  <View style={{ flex: 1, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {(['start', 'middle', 'top', 'foot'] as HoldType[]).map((type) => {
                      const count = holdCounts[type] ?? 0;
                      if (!count) return null;
                      const color = BOULDER_HOLD_COLOR[type];
                      return (
                        <View key={type} style={[s.summaryPill, { backgroundColor: `${color}18` }]}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
                          <Text style={{ fontSize: 11, fontWeight: '800', color }}>
                            {HOLD_SHORT[type]}×{count}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={s.holdSummaryText}>홀드 {pendingHolds.length}개 배치됨</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── 홀드 메모 ────────────────────────────────────────── */}
        {pendingHolds.length > 0 && (
          <View style={s.formCard}>
            <Text style={s.sectionTitle}>홀드 메모 (선택)</Text>

            {/* 등록된 메모 목록 */}
            {pendingHolds.some((ph) => ph.notes) && (
              <View style={{ gap: 6 }}>
                {pendingHolds.map((ph, i) => {
                  if (!ph.notes) return null;
                  const color = problemType === 'endurance'
                    ? ENDURANCE_HOLD_COLOR
                    : BOULDER_HOLD_COLOR[ph.holdType];
                  return (
                    <View key={i} style={s.holdNoteRow}>
                      <View style={[s.holdNoteNum, { backgroundColor: color }]}>
                        <Text style={s.holdNoteNumText}>{String(i + 1)}</Text>
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, color: c.text.secondary, fontWeight: '600' }} numberOfLines={2}>
                        {ph.notes}
                      </Text>
                      <Pressable
                        hitSlop={8}
                        onPress={() => {
                          setPendingHolds((prev) => prev.map((h, j) => j === i ? { ...h, notes: '' } : h));
                          if (memoHoldIdx === i) { setMemoHoldIdx(null); setMemoText(''); }
                        }}
                      >
                        <Feather name="x" size={14} color={c.text.tertiary} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            {/* 홀드 선택 드롭다운 버튼 */}
            <Pressable
              onPress={() => setHoldPickerVisible(true)}
              style={s.holdSelectBtn}
            >
              {memoHoldIdx !== null ? (() => {
                const ph = pendingHolds[memoHoldIdx];
                const color = problemType === 'endurance'
                  ? ENDURANCE_HOLD_COLOR
                  : BOULDER_HOLD_COLOR[ph.holdType];
                return (
                  <>
                    <View style={[s.holdSelectDot, { backgroundColor: color }]} />
                    <Text style={[s.holdSelectText, { color }]}>
                      홀드 {memoHoldIdx + 1}
                      {problemType === 'boulder'
                        ? ` · ${ph.holdType === 'start' ? '스타트' : ph.holdType === 'top' ? '탑' : ph.holdType === 'foot' ? '발만' : '손+발'}`
                        : ''}
                    </Text>
                  </>
                );
              })() : (
                <Text style={s.holdSelectPlaceholder}>홀드 번호 선택...</Text>
              )}
              <Feather name="chevron-down" size={14} color={c.text.tertiary} style={{ marginLeft: 'auto' }} />
            </Pressable>

            {/* 메모 입력 — 홀드 선택 후 표시 */}
            {memoHoldIdx !== null && (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <FormInput
                    placeholder="예: 볼륨 위 빨간 피스"
                    value={memoText}
                    onChangeText={setMemoText}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      setPendingHolds((prev) =>
                        prev.map((h, j) => j === memoHoldIdx ? { ...h, notes: memoText.trim() } : h)
                      );
                      setMemoHoldIdx(null);
                      setMemoText('');
                    }}
                  />
                </View>
                <Pressable
                  onPress={() => {
                    setPendingHolds((prev) =>
                      prev.map((h, j) => j === memoHoldIdx ? { ...h, notes: memoText.trim() } : h)
                    );
                    setMemoHoldIdx(null);
                    setMemoText('');
                  }}
                  style={s.memoConfirmBtn}
                >
                  <Feather name="check" size={16} color="#ffffff" />
                </Pressable>
              </View>
            )}

            {/* 홀드 선택 시트 */}
            <Sheet
              visible={holdPickerVisible}
              onClose={() => setHoldPickerVisible(false)}
              variant="bottom"
              title="홀드 선택"
              noScroll
              contentStyle={{ paddingHorizontal: 0, paddingTop: 0 }}
            >
              <ScrollView
                style={{ maxHeight: 360 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 8 }}
              >
                {pendingHolds.map((ph, i) => {
                  const color = problemType === 'endurance'
                    ? ENDURANCE_HOLD_COLOR
                    : BOULDER_HOLD_COLOR[ph.holdType];
                  const shortLabel = problemType === 'endurance'
                    ? String(i + 1)
                    : ph.holdType === 'start' ? 'S' : ph.holdType === 'top' ? 'T' : '';
                  const typeLabel = problemType === 'boulder'
                    ? (ph.holdType === 'start' ? '스타트' : ph.holdType === 'top' ? '탑' : ph.holdType === 'foot' ? '발만' : '손+발')
                    : '';
                  const isSelected = memoHoldIdx === i;
                  return (
                    <Pressable
                      key={i}
                      onPress={() => {
                        setMemoHoldIdx(i);
                        setMemoText(ph.notes);
                        setHoldPickerVisible(false);
                      }}
                    >
                      {({ pressed }) => (
                        <View style={[
                          s.holdPickerRow,
                          isSelected && s.holdPickerRowSelected,
                          pressed && { opacity: 0.7 },
                        ]}>
                          <View style={[s.holdPickerBadge, { backgroundColor: color }]}>
                            {shortLabel
                              ? <Text style={s.holdPickerBadgeText}>{shortLabel}</Text>
                              : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff80' }} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.holdPickerLabel}>
                              홀드 {i + 1}
                              {typeLabel ? <Text style={{ color: c.text.tertiary }}> · {typeLabel}</Text> : null}
                            </Text>
                            {ph.notes ? (
                              <Text style={s.holdPickerNote} numberOfLines={1}>{ph.notes}</Text>
                            ) : null}
                          </View>
                          {isSelected && <Feather name="check" size={16} color={c.brand.primary} />}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Sheet>
          </View>
        )}

        {/* ── 문제 이름 ─────────────────────────────────────── */}
        <View style={s.formCard}>
          <Text style={s.sectionTitle}>문제 이름 (선택)</Text>
          <FormInput
            placeholder={`예: 문제 #${pendingNextNum}, 빨강 사이드...`}
            value={problemName}
            onChangeText={setProblemName}
            autoCapitalize="none"
            returnKeyType="done"
          />
        </View>

        {/* ── 설명 ────────────────────────────────────────────── */}
        <View style={s.formCard}>
          <Text style={s.sectionTitle}>설명 (선택)</Text>
          <FormInput
            placeholder="예: 왼쪽 빨강 홀드 두 개 건너서 시작"
            value={description}
            onChangeText={setDescription}
            autoCapitalize="none"
            multiline
            inputStyle={{ minHeight: 44 }}
          />
        </View>
      </ScrollView>

      {/* ── 저장 버튼 (하단 고정) ────────────────────────────── */}
      <View style={[s.saveBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Pressable
          onPress={handleSave}
          disabled={addProblem.isPending || pendingHolds.length === 0}
          style={[s.saveBtn, (addProblem.isPending || pendingHolds.length === 0) && { opacity: 0.4 }]}
        >
          {addProblem.isPending
            ? <ActivityIndicator size="small" color="#ffffff" />
            : <Text style={s.saveBtnText}>
                {problemName.trim() ? `"${problemName.trim()}" 저장` : '문제 저장'}
                {pendingHolds.length > 0 ? ` (홀드 ${pendingHolds.length}개)` : ''}
              </Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },

    section: { paddingHorizontal: 16, paddingTop: 14, gap: 8 },
    formCard: {
      marginHorizontal: 16, marginTop: 14,
      backgroundColor: c.bg.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      padding: 14,
      gap: 10,
    },
    sectionTitle: {
      fontSize: 11, fontWeight: '900', color: c.text.tertiary,
      letterSpacing: 0.5, textTransform: 'uppercase',
    },

    typeRow: { flexDirection: 'row', gap: 8 },
    typeBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
      borderWidth: 1.5, borderColor: c.border.strong, backgroundColor: c.bg.subtle,
    },
    typeBtnActive: { backgroundColor: c.brand.primary, borderColor: c.brand.primary },
    typeBtnText: { fontSize: 14, fontWeight: '800', color: c.text.secondary },
    typeBtnTextActive: { color: '#ffffff' },

    colorChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 999, borderWidth: 1.5, borderColor: c.border.subtle,
      backgroundColor: c.bg.subtle,
    },
    colorChipActive: { borderColor: c.brand.primary, backgroundColor: `${c.brand.primary}12` },
    colorDot: { width: 12, height: 12, borderRadius: 6 },
    colorChipText: { fontSize: 12, fontWeight: '700', color: c.text.secondary },

    photoTipRow: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 5,
      paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4,
    },
    photoTipText: { flex: 1, fontSize: 11.5, color: c.text.muted, fontWeight: '600', lineHeight: 16 },

    photoArea: { width: SCREEN_W, backgroundColor: c.bg.subtle },

    placeOverlay: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: 'rgba(0,0,0,0.48)', paddingVertical: 10, alignItems: 'center',
    },
    placeOverlayText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

    pageIndicator: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8 },
    pageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.border.strong },
    pageDotActive: { backgroundColor: c.brand.primary, width: 16 },

    // ── 홀드 컨트롤 카드 ────────────────────────────────────
    controlsCard: {
      marginHorizontal: 16, marginTop: 14,
      backgroundColor: c.bg.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      padding: 14,
      gap: 10,
    },
    controlsHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    undoBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 9, paddingVertical: 5,
      borderRadius: 8, borderWidth: 1.5, borderColor: c.border.subtle,
      backgroundColor: c.bg.subtle,
    },
    undoBtnText: { fontSize: 11, color: c.text.tertiary, fontWeight: '800' },

    smallToggleBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 9, paddingVertical: 5,
      borderRadius: 8, borderWidth: 1.5,
      borderColor: c.border.strong, backgroundColor: c.bg.subtle,
    },
    smallToggleBtnActive: { backgroundColor: c.brand.primary, borderColor: c.brand.primary },
    smallToggleBtnText: { fontSize: 11, fontWeight: '800', color: c.text.tertiary },

    holdTypeRow: { flexDirection: 'row', gap: 6 },
    holdTypeBtn: {
      flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 4, paddingVertical: 10, borderRadius: 12,
      borderWidth: 1.5, borderColor: c.border.strong, backgroundColor: c.bg.subtle,
    },
    holdTypeBtnCapped: {
      borderColor: c.border.subtle,
      backgroundColor: c.bg.primary,
      opacity: 0.6,
    },
    holdTypeDot: { width: 10, height: 10, borderRadius: 5 },
    holdTypeBtnText: { fontSize: 11.5, fontWeight: '800', color: c.text.secondary },

    holdCountBadge: {
      borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, marginTop: 1,
    },
    holdCountBadgeText: { fontSize: 10, fontWeight: '900' },

    holdSummaryRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingTop: 2,
    },
    holdSummaryText: { fontSize: 12, color: c.text.secondary, fontWeight: '700' },
    summaryPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },

    // ── 홀드 메모 ──────────────────────────────────────────
    holdNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    holdNoteNum: {
      width: 24, height: 24, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    holdNoteNumText: { color: '#ffffff', fontSize: 10.5, fontWeight: '900' },

    holdSelectBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 14, paddingVertical: 12,
      borderRadius: 12, borderWidth: 1.5, borderColor: c.border.subtle,
      backgroundColor: c.bg.subtle,
    },
    holdSelectDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
    holdSelectText: { fontSize: 13, fontWeight: '800' },
    holdSelectPlaceholder: { fontSize: 13, fontWeight: '600', color: c.text.muted },

    holdPickerRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 20, paddingVertical: 11,
    },
    holdPickerRowSelected: { backgroundColor: `${c.brand.primary}0e` },
    holdPickerBadge: {
      width: 30, height: 30, borderRadius: 15,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    holdPickerBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
    holdPickerLabel: { fontSize: 13.5, fontWeight: '700', color: c.text.primary },
    holdPickerNote: { fontSize: 11.5, color: c.text.tertiary, fontWeight: '600', marginTop: 1 },

    memoConfirmBtn: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: c.brand.primary,
      alignItems: 'center', justifyContent: 'center',
    },

    // ── 저장 바 ────────────────────────────────────────────
    saveBar: {
      paddingHorizontal: 16, paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border.subtle,
      backgroundColor: c.bg.primary,
    },
    saveBtn: {
      backgroundColor: c.brand.primary, borderRadius: 14,
      paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    },
    saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  });
}
