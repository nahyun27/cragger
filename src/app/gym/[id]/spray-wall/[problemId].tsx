import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  PanResponder,
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
  useSprayWallProblem,
  useSprayWallPhotos,
  useGymColorSchemes,
  useUpdateSprayWallProblem,
  useUpdateSprayWallHold,
  useDeleteSprayWallHold,
  useDeleteSprayWallProblem,
  useAddHoldsToExistingProblem,
  useSprayWallProblemSends,
  type HoldType,
  type ProblemType,
  type SprayWallHold,
  type SprayWallProblem,
  type GymColorScheme,
} from '@/hooks/use-spray-wall';

const SCREEN_W = Dimensions.get('window').width;
const ENDURANCE_SLIDE_ZOOM = 2.5;

// 찍볼 홀드 색깔
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

const BOULDER_TYPES: { type: HoldType; label: string }[] = [
  { type: 'start',  label: 'S 스타트' },
  { type: 'middle', label: '# 손+발' },
  { type: 'top',    label: 'T 탑' },
  { type: 'foot',   label: '발만' },
];

function getHoldColor(holdType: HoldType, problemType: ProblemType): string {
  return problemType === 'endurance' ? ENDURANCE_HOLD_COLOR : BOULDER_HOLD_COLOR[holdType];
}

function getHoldLabel(
  hold: SprayWallHold,
  problem: SprayWallProblem,
  seqNum: number,
): string {
  if (problem.problem_type === 'endurance') return String(seqNum);
  if (hold.hold_type === 'start') return 'S';
  if (hold.hold_type === 'top') return 'T';
  return '';
}

// ── 드래그 가능 홀드 마커 ────────────────────────────────────────
type DraggableProps = {
  hold: SprayWallHold;
  problem: SprayWallProblem;
  seqNum: number;
  photoH: number;
  sizeFactor: number;
  imgLayoutRef: React.MutableRefObject<{ width: number; height: number } | null>;
  onRelease: (holdId: string, x: number, y: number) => void;
  onDelete: (holdId: string) => void;
};

function DraggableHoldMarker({ hold, problem, seqNum, photoH, sizeFactor, imgLayoutRef, onRelease, onDelete }: DraggableProps) {
  const posRef = useRef({ x: hold.marker_x, y: hold.marker_y });
  const startPos = useRef({ x: hold.marker_x, y: hold.marker_y });
  const hasDragged = useRef(false);
  const [displayPos, setDisplayPos] = useState({ x: hold.marker_x, y: hold.marker_y });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3,
      onPanResponderGrant: () => {
        hasDragged.current = false;
        startPos.current = { x: posRef.current.x, y: posRef.current.y };
      },
      onPanResponderMove: (_, gs) => {
        hasDragged.current = true;
        const layout = imgLayoutRef.current;
        if (!layout) return;
        const newX = Math.max(2, Math.min(98, startPos.current.x + (gs.dx / layout.width) * 100));
        const newY = Math.max(2, Math.min(98, startPos.current.y + (gs.dy / layout.height) * 100));
        posRef.current = { x: newX, y: newY };
        setDisplayPos({ x: newX, y: newY });
      },
      onPanResponderRelease: (_, gs) => {
        if (!hasDragged.current) return;
        const layout = imgLayoutRef.current;
        if (!layout) return;
        const finalX = Math.max(2, Math.min(98, startPos.current.x + (gs.dx / layout.width) * 100));
        const finalY = Math.max(2, Math.min(98, startPos.current.y + (gs.dy / layout.height) * 100));
        posRef.current = { x: finalX, y: finalY };
        setDisplayPos({ x: finalX, y: finalY });
        onRelease(hold.id, finalX, finalY);
      },
    })
  ).current;

  const baseSize = problem.problem_type === 'endurance' ? 20 : HOLD_SIZE[hold.hold_type];
  const size = Math.round(baseSize * sizeFactor);
  const color = getHoldColor(hold.hold_type, problem.problem_type);
  const label = getHoldLabel(hold, problem, seqNum);
  const left = (displayPos.x / 100) * SCREEN_W - size / 2;
  const top = (displayPos.y / 100) * photoH - size / 2;

  return (
    <View
      style={{ position: 'absolute', left: left - 10, top: top - 10, width: size + 20, height: size + 20 }}
    >
      {/* 홀드 서클 */}
      <View
        {...panResponder.panHandlers}
        style={{
          position: 'absolute',
          left: 10, top: 10,
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: color,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: '#ffffff',
          shadowColor: '#000', shadowOpacity: 0.4,
          shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
          elevation: 6,
        }}
      >
        {label ? (
          <Text style={{ color: '#ffffff', fontSize: size * 0.38, fontWeight: '900' }}>
            {label}
          </Text>
        ) : null}
      </View>
      {/* 삭제 버튼 */}
      <Pressable
        onPress={() => onDelete(hold.id)}
        hitSlop={4}
        style={{
          position: 'absolute', top: 2, right: 2,
          width: 18, height: 18, borderRadius: 9,
          backgroundColor: '#ef4444',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 999,
          borderWidth: 1.5, borderColor: '#ffffff',
        }}
      >
        <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '900', lineHeight: 12 }}>×</Text>
      </Pressable>
    </View>
  );
}

// ── 메인 화면 ────────────────────────────────────────────────────
type PendingNewHold = { holdType: HoldType; markerX: number; markerY: number };

export default function SprayWallProblemScreen() {
  const { id: gymId, problemId } = useLocalSearchParams<{ id: string; problemId: string }>();
  const router = useRouter();
  const c = useThemeColors();
  const s = makeStyles(c);
  const insets = useSafeAreaInsets();
  const { session: authSession } = useAuth();

  const problemQ = useSprayWallProblem(problemId);
  const photosQ = useSprayWallPhotos(gymId);
  const colorSchemesQ = useGymColorSchemes(gymId);

  const updateProblem = useUpdateSprayWallProblem(gymId!);
  const updateHold = useUpdateSprayWallHold(problemId);
  const deleteHold = useDeleteSprayWallHold(problemId);
  const deleteProblem = useDeleteSprayWallProblem(gymId!, null);
  const addHolds = useAddHoldsToExistingProblem(gymId!, problemId);

  const problem = problemQ.data;
  const colorSchemes = colorSchemesQ.data ?? [];
  const isOwner = !!authSession?.user.id && authSession.user.id === problem?.created_by;

  // ── 사진 ──
  const photoUrl = (() => {
    if (!problem) return null;
    const photos = photosQ.data ?? [];
    const ph = photos.find((p) => p.id === problem.photo_id);
    return ph?.photo_url ?? photos[0]?.photo_url ?? null;
  })();

  // ── 실제 이미지 높이 (비율 유지) ──
  const [photoH, setPhotoH] = useState(SCREEN_W * 0.75);
  useEffect(() => {
    if (!photoUrl) return;
    Image.getSize(photoUrl, (w, h) => setPhotoH(Math.round(SCREEN_W * h / w)));
  }, [photoUrl]);

  // ── 편집 모드 상태 ──
  const [editMode, setEditMode] = useState(false);
  const [editColor, setEditColor] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editHoldType, setEditHoldType] = useState<HoldType>('start');
  const [pendingNewHolds, setPendingNewHolds] = useState<PendingNewHold[]>([]);
  const imgLayoutRef = useRef<{ width: number; height: number } | null>(null);

  // ── 지구력 슬라이드쇼 상태 ──
  const [slideMode, setSlideMode] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [slidePlaying, setSlidePlaying] = useState(false);

  // ── 홀드 크기 / 선택된 홀드 (뷰 모드 메모 팝업) ──
  const [holdSizeSmall, setHoldSizeSmall] = useState(false);
  const [selectedHoldId, setSelectedHoldId] = useState<string | null>(null);

  // ── 수정 모드 홀드 메모 picker ──
  const [editMemoHoldId, setEditMemoHoldId] = useState<string | null>(null);
  const [editMemoText, setEditMemoText] = useState('');
  const [editMemoPickerVisible, setEditMemoPickerVisible] = useState(false);
  const [editName, setEditName] = useState('');

  // ── 완등 시트 ──
  const [sendsSheetVisible, setSendsSheetVisible] = useState(false);
  const sendsQ = useSprayWallProblemSends(problemId);
  const slideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomAnim = useRef(new Animated.Value(1)).current;
  const panXAnim = useRef(new Animated.Value(0)).current;
  const panYAnim = useRef(new Animated.Value(0)).current;

  function enterEditMode() {
    if (!problem) return;
    setEditColor(problem.color);
    setEditDesc(problem.description ?? '');
    setEditName(problem.name ?? '');
    setEditHoldType(problem.problem_type === 'boulder' ? 'start' : 'middle');
    setPendingNewHolds([]);
    setEditMode(true);
  }

  async function handleSaveEdit() {
    if (!problem) return;
    try {
      await updateProblem.mutateAsync({
        problemId: problem.id,
        name: editName.trim() || null,
        color: editColor,
        description: editDesc.trim() || null,
      });
      if (pendingNewHolds.length > 0) {
        await addHolds.mutateAsync(
          pendingNewHolds.map((h) => ({
            holdType: h.holdType,
            markerX: h.markerX,
            markerY: h.markerY,
          }))
        );
      }
      setPendingNewHolds([]);
      setEditMode(false);
    } catch (e) {
      customAlert('저장 실패', e instanceof Error ? e.message : '오류가 발생했어요.');
    }
  }

  function handleHoldRelease(holdId: string, x: number, y: number) {
    updateHold.mutate({ holdId, markerX: x, markerY: y });
  }

  function handleDeleteHold(holdId: string) {
    customAlert('홀드 삭제', '이 홀드를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteHold.mutate(holdId) },
    ]);
  }

  function handleDeleteProblem() {
    if (!problem) return;
    customAlert(`"${problem.name || '문제 #' + problem.number}" 삭제`, '문제를 삭제하면 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteProblem.mutateAsync(problem.id);
          router.back();
        },
      },
    ]);
  }

  function handleEditImageTap(e: { nativeEvent: { locationX: number; locationY: number } }) {
    if (!imgLayoutRef.current) return;
    const x = Math.round((e.nativeEvent.locationX / imgLayoutRef.current.width) * 100);
    const y = Math.round((e.nativeEvent.locationY / imgLayoutRef.current.height) * 100);
    const holdType: HoldType = problem?.problem_type === 'endurance' ? 'middle' : editHoldType;
    setPendingNewHolds((prev) => [...prev, { holdType, markerX: x, markerY: y }]);
    if (problem?.problem_type === 'boulder' && editHoldType === 'start') {
      setEditHoldType('middle');
    }
  }

  // ── 지구력 슬라이드쇼 ───────────────────────────────────────────
  const sortedHolds = problem?.holds ?? [];

  function animateToHold(idx: number) {
    if (idx < 0 || idx >= sortedHolds.length) return;
    const hold = sortedHolds[idx];
    const holdX = (hold.marker_x / 100) * SCREEN_W;
    const holdY = (hold.marker_y / 100) * photoH;
    const ZOOM = ENDURANCE_SLIDE_ZOOM;
    // RN transform 적용 순서: scale 먼저, 그 다음 translate.
    // scale s로 중심 확대 후 점 (holdX, holdY)을 화면 중앙으로 이동:
    //   tx = (center - holdX) * s
    const rawTx = (SCREEN_W / 2 - holdX) * ZOOM;
    const rawTy = (photoH / 2 - holdY) * ZOOM;
    // 이미지 바깥 영역이 보이지 않도록 클램프
    const maxTx = (ZOOM - 1) / 2 * SCREEN_W;
    const maxTy = (ZOOM - 1) / 2 * photoH;
    const tx = Math.max(-maxTx, Math.min(maxTx, rawTx));
    const ty = Math.max(-maxTy, Math.min(maxTy, rawTy));

    Animated.parallel([
      Animated.spring(zoomAnim, { toValue: ZOOM, useNativeDriver: true }),
      Animated.spring(panXAnim, { toValue: tx, useNativeDriver: true }),
      Animated.spring(panYAnim, { toValue: ty, useNativeDriver: true }),
    ]).start();
  }

  function resetZoom() {
    Animated.parallel([
      Animated.spring(zoomAnim, { toValue: 1, useNativeDriver: true }),
      Animated.spring(panXAnim, { toValue: 0, useNativeDriver: true }),
      Animated.spring(panYAnim, { toValue: 0, useNativeDriver: true }),
    ]).start();
  }

  function enterSlideMode() {
    setSlideIdx(0);
    setSlideMode(true);
    setSlidePlaying(false);
    animateToHold(0);
  }

  function exitSlideMode() {
    setSlideMode(false);
    setSlidePlaying(false);
    if (slideTimer.current) clearTimeout(slideTimer.current);
    resetZoom();
  }

  function slideNext() {
    const next = Math.min(sortedHolds.length - 1, slideIdx + 1);
    setSlideIdx(next);
    animateToHold(next);
  }

  function slidePrev() {
    const prev = Math.max(0, slideIdx - 1);
    setSlideIdx(prev);
    animateToHold(prev);
  }

  useEffect(() => {
    if (!slidePlaying || !slideMode) return;
    slideTimer.current = setTimeout(() => {
      if (slideIdx >= sortedHolds.length - 1) {
        setSlidePlaying(false);
      } else {
        const next = slideIdx + 1;
        setSlideIdx(next);
        animateToHold(next);
      }
    }, 1800);
    return () => { if (slideTimer.current) clearTimeout(slideTimer.current); };
  }, [slidePlaying, slideIdx, slideMode, sortedHolds.length]);

  // ── 색깔 유틸 ──────────────────────────────────────────────────
  function getColorHex(color: string | null): string | null {
    if (!color) return null;
    const scheme = colorSchemes.find((s) => s.color === color);
    return resolveColorHex(color, scheme?.color_hex);
  }

  function getColorLabel(color: string | null): string {
    if (!color) return '';
    const scheme = colorSchemes.find((s) => s.color === color);
    return scheme?.official_label ?? resolveColorLabel(color);
  }

  // ── 로딩 / 에러 ──────────────────────────────────────────────
  if (problemQ.isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['left', 'right']}>
        <ScreenHeader title="문제" onBack={() => router.back()} rightActions={[]} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!problem) {
    return (
      <SafeAreaView style={s.container} edges={['left', 'right']}>
        <ScreenHeader title="문제" onBack={() => router.back()} rightActions={[]} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: c.text.muted }}>문제를 찾을 수 없어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const colorHex = getColorHex(editMode ? editColor : problem.color);
  const colorLabel = getColorLabel(editMode ? editColor : problem.color);
  const isEndurance = problem.problem_type === 'endurance';
  const isBoulder = problem.problem_type === 'boulder';

  const headerTitle = editMode
    ? '문제 수정'
    : (problem.name || `문제 #${problem.number}`);

  const headerRight = editMode
    ? [
        {
          label: '저장',
          onPress: handleSaveEdit,
          loading: updateProblem.isPending || addHolds.isPending,
        },
      ]
    : isOwner
    ? [{ icon: 'edit-2' as const, onPress: enterEditMode }]
    : [];

  // ── 홀드 렌더 헬퍼 (뷰 모드) ──────────────────────────────────
  function renderStaticHold(hold: SprayWallHold, seqNum: number, isCurrent?: boolean) {
    const sizeFactor = holdSizeSmall ? 0.6 : 1;
    const baseSize = problem!.problem_type === 'endurance' ? 20 : HOLD_SIZE[hold.hold_type];
    const size = Math.round(baseSize * sizeFactor);
    const left = (hold.marker_x / 100) * SCREEN_W - size / 2;
    const top = (hold.marker_y / 100) * photoH - size / 2;
    const color = getHoldColor(hold.hold_type, problem!.problem_type);
    const label = getHoldLabel(hold, problem!, seqNum);
    const isFoot = hold.hold_type === 'foot' && isBoulder;

    const canTap = !slideMode && !editMode && !!hold.notes;

    // 슬라이드쇼: 현재 홀드 = 테두리만(투명 배경), 나머지 = 진하게 표시
    const bgColor = slideMode && isCurrent ? 'transparent' : color;
    const borderColor = '#ffffff';
    const borderWidth = slideMode && isCurrent ? 3 : (isFoot ? 1.5 : 2);
    const opacity = slideMode && !isCurrent ? 0.85 : 1;

    return (
      <Pressable
        key={hold.id}
        disabled={!canTap}
        onPress={() => setSelectedHoldId(selectedHoldId === hold.id ? null : hold.id)}
        style={{
          position: 'absolute',
          width: size, height: size, left, top,
        }}
      >
        <View
          style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: bgColor,
            alignItems: 'center', justifyContent: 'center',
            borderWidth,
            borderColor,
            opacity,
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
        >
          {label ? (
            <Text style={{ color: '#ffffff', fontSize: size * 0.38, fontWeight: '900' }}>
              {label}
            </Text>
          ) : null}
        </View>
        {/* 메모 있으면 작은 표시 */}
        {!slideMode && !editMode && hold.notes && selectedHoldId !== hold.id && (
          <View style={{
            position: 'absolute', top: -3, right: -3,
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: '#facc15', borderWidth: 1, borderColor: '#ffffff',
          }} />
        )}
      </Pressable>
    );
  }

  const isSaving = updateProblem.isPending || addHolds.isPending;

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader
        title={headerTitle}
        onBack={editMode ? () => { setEditMode(false); setPendingNewHolds([]); } : () => router.back()}
        rightActions={
          !editMode && isOwner
            ? [{ icon: 'edit-2' as const, onPress: enterEditMode }]
            : []
        }
        rightSlot={
          editMode ? (
            <Pressable onPress={handleSaveEdit} disabled={isSaving} hitSlop={8}
              style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              {isSaving
                ? <ActivityIndicator size="small" color={c.brand.primary} />
                : <Text style={{ fontSize: 15, fontWeight: '900', color: c.brand.primary }}>저장</Text>}
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 문제 정보 (이미지 위) ──────────────────────────── */}
        {!editMode && !slideMode && (
          <View style={s.infoStrip}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {colorHex && <View style={[s.colorDot, { backgroundColor: colorHex }]} />}
              <View style={s.typeBadge}>
                <Text style={s.typeBadgeText}>{isEndurance ? '지구력' : '찍볼'}</Text>
              </View>
              {problem.name
                ? <Text style={s.problemName} numberOfLines={1}>{problem.name}</Text>
                : <Text style={s.problemNum}>#{problem.number}</Text>}
            </View>
            <Pressable
              onPress={() => setHoldSizeSmall((v) => !v)}
              style={[s.sizeToggleBtn, holdSizeSmall && { backgroundColor: c.brand.primary, borderColor: c.brand.primary }]}
            >
              <Feather name="minimize-2" size={11} color={holdSizeSmall ? '#ffffff' : c.text.tertiary} />
              <Text style={[s.sizeToggleText, holdSizeSmall && { color: '#ffffff' }]}>작게</Text>
            </Pressable>
          </View>
        )}

        {/* ── 사진 영역 ───────────────────────────────────────── */}
        <Pressable
          onPress={editMode ? handleEditImageTap : undefined}
          disabled={!editMode}
        >
          {isEndurance && slideMode ? (
            /* 지구력 슬라이드쇼: 줌 애니메이션 */
            <View style={{ width: SCREEN_W, height: photoH, overflow: 'hidden' }}
              onLayout={(e) => { imgLayoutRef.current = e.nativeEvent.layout; }}
            >
              <Animated.View
                style={{
                  width: SCREEN_W, height: photoH,
                  transform: [
                    { translateX: panXAnim },
                    { translateY: panYAnim },
                    { scale: zoomAnim },
                  ],
                }}
              >
                {photoUrl && (
                  <Image source={{ uri: photoUrl }} style={{ width: SCREEN_W, height: photoH }} resizeMode="contain" />
                )}
                {sortedHolds.map((h, idx) => renderStaticHold(h, idx + 1, idx === slideIdx))}
              </Animated.View>
            </View>
          ) : editMode ? (
            /* 수정 모드: 드래그 가능 홀드 */
            <View
              onLayout={(e) => { imgLayoutRef.current = e.nativeEvent.layout; }}
              style={{ width: SCREEN_W, height: photoH }}
            >
              {photoUrl && (
                <Image source={{ uri: photoUrl }} style={{ width: SCREEN_W, height: photoH }} resizeMode="contain" />
              )}
              {(problem.holds ?? []).map((h, idx) => (
                <DraggableHoldMarker
                  key={h.id}
                  hold={h}
                  problem={problem}
                  seqNum={idx + 1}
                  photoH={photoH}
                  sizeFactor={holdSizeSmall ? 0.6 : 1}
                  imgLayoutRef={imgLayoutRef}
                  onRelease={handleHoldRelease}
                  onDelete={handleDeleteHold}
                />
              ))}
              {/* 새로 추가 중인 홀드 */}
              {pendingNewHolds.map((ph, i) => {
                const baseSize = isEndurance ? 20 : HOLD_SIZE[ph.holdType];
                const size = Math.round(baseSize * (holdSizeSmall ? 0.6 : 1));
                const left = (ph.markerX / 100) * SCREEN_W - size / 2;
                const top = (ph.markerY / 100) * photoH - size / 2;
                const color = getHoldColor(ph.holdType, problem.problem_type);
                const seqNumInPending = problem.holds.length + i + 1;
                const label = isEndurance
                  ? String(seqNumInPending)
                  : ph.holdType === 'start' ? 'S'
                  : ph.holdType === 'top' ? 'T'
                  : '';
                return (
                  <View
                    key={`new-${i}`}
                    style={{
                      position: 'absolute', left, top,
                      width: size, height: size, borderRadius: size / 2,
                      backgroundColor: color,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 2, borderStyle: 'dashed', borderColor: '#ffffff',
                      opacity: 0.85,
                    }}
                  >
                    {label ? (
                      <Text style={{ color: '#ffffff', fontSize: size * 0.38, fontWeight: '900' }}>
                        {label}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
              {/* 탭 안내 */}
              {problem.holds.length === 0 && pendingNewHolds.length === 0 && (
                <View style={s.placeOverlay} pointerEvents="none">
                  <Text style={s.placeOverlayText}>사진을 탭해서 홀드를 추가해요</Text>
                </View>
              )}
            </View>
          ) : (
            /* 뷰 모드: 핀치 줌 (iOS) */
            <ScrollView
              style={{ width: SCREEN_W, height: photoH }}
              contentContainerStyle={{ width: SCREEN_W, height: photoH }}
              maximumZoomScale={4}
              minimumZoomScale={1}
              bouncesZoom
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              <View style={{ width: SCREEN_W, height: photoH }}>
                {photoUrl
                  ? <Image source={{ uri: photoUrl }} style={{ width: SCREEN_W, height: photoH }} resizeMode="contain" />
                  : <View style={{ width: SCREEN_W, height: photoH, backgroundColor: c.bg.subtle }} />}
                {sortedHolds.map((h, idx) => renderStaticHold(h, idx + 1, false))}
              </View>
            </ScrollView>
          )}
        </Pressable>

        {/* ── 지구력 슬라이드쇼 컨트롤 ─────────────────────────── */}
        {isEndurance && slideMode && (
          <View style={s.slideControls}>
            {/* 현재 홀드 번호 + 메모 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <View style={s.slideNumBadge}>
                <Text style={s.slideNumText}>{slideIdx + 1}</Text>
              </View>
              <Text style={s.slideTotal}>/ {sortedHolds.length}</Text>
              {sortedHolds[slideIdx]?.notes ? (
                <View style={s.slideHoldNote}>
                  <Text style={s.slideHoldNoteText} numberOfLines={2}>
                    {sortedHolds[slideIdx].notes}
                  </Text>
                </View>
              ) : problem.description ? (
                <Text style={s.slideDesc} numberOfLines={1}>{problem.description}</Text>
              ) : null}
            </View>

            <View style={s.slideNav}>
              <Pressable
                onPress={() => { setSlidePlaying(false); slidePrev(); }}
                disabled={slideIdx === 0}
                style={[s.slideNavBtn, slideIdx === 0 && { opacity: 0.3 }]}
              >
                <Feather name="skip-back" size={20} color={c.text.primary} />
              </Pressable>
              <Pressable
                onPress={() => setSlidePlaying((p) => !p)}
                style={[s.slideNavBtn, s.slidePlayBtn]}
              >
                <Feather name={slidePlaying ? 'pause' : 'play'} size={22} color="#ffffff" />
              </Pressable>
              <Pressable
                onPress={() => { setSlidePlaying(false); slideNext(); }}
                disabled={slideIdx === sortedHolds.length - 1}
                style={[s.slideNavBtn, slideIdx === sortedHolds.length - 1 && { opacity: 0.3 }]}
              >
                <Feather name="skip-forward" size={20} color={c.text.primary} />
              </Pressable>
            </View>

            <Pressable onPress={exitSlideMode} style={{ alignSelf: 'center' }}>
              <Text style={{ fontSize: 13, color: c.text.tertiary, fontWeight: '700' }}>동선 보기 종료</Text>
            </Pressable>
          </View>
        )}

        {/* ── 문제 하단 정보 ──────────────────────────────────── */}
        {!slideMode && !editMode && (
          <View style={s.infoSection}>
            {/* 찍볼: 홀드 요약 칩 */}
            {isBoulder && (
              <View style={s.holdChips}>
                {(['start', 'middle', 'top', 'foot'] as HoldType[]).map((t) => {
                  const cnt = (problem.holds ?? []).filter((h) => h.hold_type === t).length;
                  if (cnt === 0) return null;
                  const label = t === 'start' ? 'S' : t === 'middle' ? '#' : t === 'top' ? 'T' : '발';
                  const color = BOULDER_HOLD_COLOR[t];
                  return (
                    <View key={t} style={[s.holdChip, { backgroundColor: `${color}20` }]}>
                      <View style={[s.holdChipDot, { backgroundColor: color }]} />
                      <Text style={[s.holdChipText, { color }]}>{label}×{cnt}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* 지구력: 홀드 수 칩 + 동선보기 한 줄 */}
            {isEndurance && (
              <View style={s.enduranceActionRow}>
                <View style={s.holdCountChip}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f97316' }} />
                  <Text style={s.holdCountText}>홀드 {sortedHolds.length}개</Text>
                </View>
                {sortedHolds.length > 0 && (
                  <Pressable onPress={enterSlideMode} style={s.slideBtn}>
                    <Feather name="play-circle" size={15} color="#ffffff" />
                    <Text style={s.slideBtnText}>동선 보기</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* 찍볼: 완등 수 */}
            {(sendsQ.data?.length ?? 0) > 0 && (
              <Pressable onPress={() => setSendsSheetVisible(true)} style={s.sendsBtn}>
                <Feather name="users" size={13} color="#06b6d4" />
                <Text style={s.sendsBtnText}>완등 {sendsQ.data!.length}명</Text>
              </Pressable>
            )}

            {problem.description ? (
              <Text style={s.problemDesc}>{problem.description}</Text>
            ) : null}

            {/* 삭제 버튼 (오너) */}
            {isOwner && (
              <View>
                <View style={s.deleteDivider} />
                <Pressable onPress={handleDeleteProblem} style={s.deleteBtn}>
                  <Feather name="trash-2" size={13} color="#ef4444" />
                  <Text style={s.deleteBtnText}>문제 삭제</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* ── 완등 목록 시트 ───────────────────────────────────── */}
        <Sheet
          visible={sendsSheetVisible}
          onClose={() => setSendsSheetVisible(false)}
          variant="bottom"
          title={`완등 ${sendsQ.data?.length ?? 0}명`}
          noScroll
          contentStyle={{ paddingHorizontal: 0, paddingTop: 0 }}
        >
          <ScrollView
            style={{ maxHeight: 360 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
          >
            {(sendsQ.data ?? []).map((entry) => (
              <View key={entry.userId} style={s.sendsRow}>
                <View style={s.sendsAvatar}>
                  <Text style={s.sendsAvatarText}>
                    {(entry.displayName || entry.username || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sendsName}>
                    {entry.displayName || entry.username || '알 수 없음'}
                  </Text>
                  {entry.username && entry.displayName && (
                    <Text style={s.sendsUsername}>@{entry.username}</Text>
                  )}
                </View>
                <Text style={s.sendsTries}>{entry.tries}번만에</Text>
              </View>
            ))}
          </ScrollView>
        </Sheet>

        {/* ── 수정 모드 안내 ───────────────────────────────────── */}
        {editMode && (
          <View style={s.editHintRow}>
            <Feather name="move" size={12} color={c.text.muted} />
            <Text style={s.editHintText}>기존 홀드는 드래그해서 위치를 바꿀 수 있어요</Text>
          </View>
        )}

        {/* ── 수정 모드 패널 ────────────────────────────────────── */}
        {editMode && (
          <View style={s.editPanel}>
            {/* 문제 이름 */}
            <Text style={s.editLabel}>문제 이름 (선택)</Text>
            <FormInput
              placeholder={`예: 문제 #${problem.number}, 빨강 사이드...`}
              value={editName}
              onChangeText={setEditName}
              autoCapitalize="none"
              returnKeyType="done"
            />

            {/* 난이도 색깔 */}
            {colorSchemes.length > 0 && (
              <>
                <Text style={[s.editLabel, { marginTop: 6 }]}>난이도 색깔</Text>
                <ScrollView
                  horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -4 }}
                  contentContainerStyle={{ gap: 6 }}
                >
                  <Pressable
                    onPress={() => setEditColor(null)}
                    style={[
                      s.colorChip,
                      !editColor && { borderColor: c.brand.primary, backgroundColor: `${c.brand.primary}15` },
                    ]}
                  >
                    <Text style={[s.colorChipText, !editColor && { color: c.brand.primary }]}>없음</Text>
                  </Pressable>
                  {colorSchemes.map((cs) => {
                    const hex = resolveColorHex(cs.color, cs.color_hex);
                    const label = cs.official_label ?? resolveColorLabel(cs.color);
                    const isSel = editColor === cs.color;
                    return (
                      <Pressable
                        key={cs.color}
                        onPress={() => setEditColor(cs.color)}
                        style={[
                          s.colorChip,
                          isSel && { borderColor: hex, backgroundColor: `${hex}20` },
                        ]}
                      >
                        <View style={[s.colorDot, { backgroundColor: hex }]} />
                        <Text style={[s.colorChipText, isSel && { color: hex, fontWeight: '800' }]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* 홀드 타입 선택 (찍볼) */}
            {isBoulder && (
              <>
                <Text style={[s.editLabel, { marginTop: 10 }]}>홀드 추가 (사진 탭)</Text>
                <View style={s.holdTypeRow}>
                  {BOULDER_TYPES.map(({ type, label }) => (
                    <Pressable
                      key={type}
                      onPress={() => setEditHoldType(type)}
                      style={[
                        s.holdTypeBtn,
                        editHoldType === type && {
                          backgroundColor: BOULDER_HOLD_COLOR[type],
                          borderColor: BOULDER_HOLD_COLOR[type],
                        },
                      ]}
                    >
                      <Text style={[
                        s.holdTypeBtnText,
                        editHoldType === type && { color: '#ffffff' },
                      ]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            {isEndurance && (
              <Text style={[s.editLabel, { marginTop: 4 }]}>
                사진을 탭해서 홀드를 추가해요 (순서대로)
              </Text>
            )}

            {/* 새 홀드 미리보기 + 취소 */}
            {pendingNewHolds.length > 0 && (
              <View style={s.undoRow}>
                <Text style={{ flex: 1, fontSize: 12, color: c.text.secondary, fontWeight: '700' }}>
                  새 홀드 {pendingNewHolds.length}개 추가됨
                </Text>
                <Pressable onPress={() => setPendingNewHolds((p) => p.slice(0, -1))} style={s.undoBtn}>
                  <Feather name="rotate-ccw" size={12} color={c.text.tertiary} />
                  <Text style={{ fontSize: 11, color: c.text.tertiary, fontWeight: '700' }}>실행취소</Text>
                </Pressable>
              </View>
            )}

            {/* 기존 홀드 메모 편집 — picker 방식 */}
            {sortedHolds.length > 0 && (
              <>
                <Text style={[s.editLabel, { marginTop: 10 }]}>홀드 메모</Text>

                {/* 메모 있는 홀드 목록 */}
                {sortedHolds.some((h) => h.notes) && (
                  <View style={{ gap: 6 }}>
                    {sortedHolds.map((h, idx) => {
                      if (!h.notes) return null;
                      const color = getHoldColor(h.hold_type, problem.problem_type);
                      const label = isEndurance ? String(idx + 1) : h.hold_type === 'start' ? 'S' : h.hold_type === 'top' ? 'T' : '#';
                      return (
                        <View key={h.id} style={s.holdNoteRow}>
                          <View style={[s.holdNoteNum, { backgroundColor: color }]}>
                            <Text style={s.holdNoteNumText}>{label}</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 13, color: c.text.secondary, fontWeight: '600' }} numberOfLines={2}>
                            {h.notes}
                          </Text>
                          <Pressable hitSlop={8} onPress={() => updateHold.mutate({ holdId: h.id, notes: null })}>
                            <Feather name="x" size={14} color={c.text.tertiary} />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* 홀드 선택 버튼 */}
                <Pressable onPress={() => setEditMemoPickerVisible(true)} style={s.holdSelectBtn}>
                  {editMemoHoldId ? (() => {
                    const h = sortedHolds.find((x) => x.id === editMemoHoldId);
                    if (!h) return null;
                    const idx = sortedHolds.indexOf(h);
                    const color = getHoldColor(h.hold_type, problem.problem_type);
                    return (
                      <>
                        <View style={[s.holdSelectDot, { backgroundColor: color }]} />
                        <Text style={[s.holdSelectText, { color }]}>홀드 {idx + 1}</Text>
                      </>
                    );
                  })() : (
                    <Text style={s.holdSelectPlaceholder}>홀드 번호 선택...</Text>
                  )}
                  <Feather name="chevron-down" size={14} color={c.text.tertiary} style={{ marginLeft: 'auto' }} />
                </Pressable>

                {/* 선택된 홀드 메모 입력 */}
                {editMemoHoldId && (
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <FormInput
                        placeholder="예: 볼륨 위 빨간 피스"
                        value={editMemoText}
                        onChangeText={setEditMemoText}
                        autoCapitalize="none"
                        returnKeyType="done"
                        onSubmitEditing={() => {
                          updateHold.mutate({ holdId: editMemoHoldId, notes: editMemoText.trim() || null });
                          setEditMemoHoldId(null);
                          setEditMemoText('');
                        }}
                      />
                    </View>
                    <Pressable
                      onPress={() => {
                        updateHold.mutate({ holdId: editMemoHoldId, notes: editMemoText.trim() || null });
                        setEditMemoHoldId(null);
                        setEditMemoText('');
                      }}
                      style={s.memoConfirmBtn}
                    >
                      <Feather name="check" size={16} color="#ffffff" />
                    </Pressable>
                  </View>
                )}

                {/* 홀드 선택 시트 */}
                <Sheet
                  visible={editMemoPickerVisible}
                  onClose={() => setEditMemoPickerVisible(false)}
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
                    {sortedHolds.map((h, idx) => {
                      const color = getHoldColor(h.hold_type, problem.problem_type);
                      const shortLabel = isEndurance ? String(idx + 1) : h.hold_type === 'start' ? 'S' : h.hold_type === 'top' ? 'T' : '';
                      const typeLabel = isBoulder
                        ? (h.hold_type === 'start' ? '스타트' : h.hold_type === 'top' ? '탑' : h.hold_type === 'foot' ? '발만' : '손+발')
                        : '';
                      const isSelected = editMemoHoldId === h.id;
                      return (
                        <Pressable
                          key={h.id}
                          onPress={() => {
                            setEditMemoHoldId(h.id);
                            setEditMemoText(h.notes ?? '');
                            setEditMemoPickerVisible(false);
                          }}
                        >
                          {({ pressed }) => (
                            <View style={[s.holdPickerRow, isSelected && s.holdPickerRowSelected, pressed && { opacity: 0.7 }]}>
                              <View style={[s.holdPickerBadge, { backgroundColor: color }]}>
                                {shortLabel
                                  ? <Text style={s.holdPickerBadgeText}>{shortLabel}</Text>
                                  : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff80' }} />}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={s.holdPickerLabel}>
                                  홀드 {idx + 1}
                                  {typeLabel ? <Text style={{ color: c.text.tertiary }}> · {typeLabel}</Text> : null}
                                </Text>
                                {h.notes ? <Text style={s.holdPickerNote} numberOfLines={1}>{h.notes}</Text> : null}
                              </View>
                              {isSelected && <Feather name="check" size={16} color={c.brand.primary} />}
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </Sheet>
              </>
            )}

            {/* 설명 */}
            <Text style={[s.editLabel, { marginTop: 10 }]}>설명</Text>
            <FormInput
              placeholder="설명 (선택)"
              value={editDesc}
              onChangeText={setEditDesc}
              autoCapitalize="none"
            />

            {/* 저장 */}
            <Pressable
              onPress={handleSaveEdit}
              disabled={isSaving}
              style={[s.saveBtn, isSaving && { opacity: 0.5 }]}
            >
              {isSaving
                ? <ActivityIndicator size="small" color="#ffffff" />
                : <Text style={s.saveBtnText}>저장</Text>}
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* ── 홀드 메모 팝업 (뷰 모드, ScrollView 바깥에서 absolute) ── */}
      {selectedHoldId && (() => {
        const h = sortedHolds.find((x) => x.id === selectedHoldId);
        return h?.notes ? (
          <Pressable
            onPress={() => setSelectedHoldId(null)}
            style={[s.notePopupBg, { bottom: insets.bottom + 80 }]}
          >
            <View style={s.notePopup}>
              <Text style={s.notePopupText}>{h.notes}</Text>
            </View>
          </Pressable>
        ) : null;
      })()}
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },

    placeOverlay: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 10, alignItems: 'center',
    },
    placeOverlayText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

    // ── 이미지 위 info strip ──────────────────────────────────
    infoStrip: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 14, paddingVertical: 10,
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.subtle,
    },
    colorDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
    typeBadge: {
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
      backgroundColor: c.bg.subtle,
    },
    typeBadgeText: { fontSize: 11, fontWeight: '700', color: c.text.secondary },
    problemName: { fontSize: 15, fontWeight: '800', color: c.text.primary, flexShrink: 1 },
    problemNum: { fontSize: 15, fontWeight: '700', color: c.text.tertiary },

    // ── 이미지 아래 info section ──────────────────────────────
    infoSection: {
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 14,
    },
    problemDesc: { fontSize: 14, color: c.text.secondary, fontWeight: '500', lineHeight: 20 },
    holdChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    holdChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999,
    },
    holdChipDot: { width: 8, height: 8, borderRadius: 4 },
    holdChipText: { fontSize: 12, fontWeight: '800' },

    // 지구력 홀드 수 + 동선보기 한 줄
    enduranceActionRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    holdCountChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
      backgroundColor: '#f9731612',
    },
    holdCountText: { fontSize: 13, fontWeight: '700', color: '#f97316' },

    // 완등 버튼
    sendsBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
      backgroundColor: '#06b6d410', borderWidth: 1.5, borderColor: '#06b6d430',
      alignSelf: 'flex-start',
    },
    sendsBtnText: { fontSize: 12, fontWeight: '800', color: '#06b6d4' },

    // 완등 시트 row
    sendsRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 20, paddingVertical: 10,
    },
    sendsAvatar: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: c.brand.primary,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    sendsAvatarText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
    sendsName: { fontSize: 14, fontWeight: '700', color: c.text.primary },
    sendsUsername: { fontSize: 11, color: c.text.tertiary, fontWeight: '600', marginTop: 1 },
    sendsTries: { fontSize: 11, color: c.text.muted, fontWeight: '700' },

    slideBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: '#f97316', borderRadius: 10,
      paddingVertical: 8, paddingHorizontal: 14,
    },
    slideBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },

    deleteDivider: {
      height: StyleSheet.hairlineWidth, backgroundColor: c.border.subtle, marginBottom: 12,
    },
    deleteBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4,
    },
    deleteBtnText: { fontSize: 13, color: '#ef4444', fontWeight: '700' },

    // 슬라이드쇼 컨트롤
    slideControls: {
      margin: 14, padding: 16, borderRadius: 18,
      backgroundColor: c.bg.card,
      borderWidth: StyleSheet.hairlineWidth, borderColor: c.border.subtle,
      gap: 14,
    },
    slideNumBadge: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: ENDURANCE_HOLD_COLOR,
      alignItems: 'center', justifyContent: 'center',
    },
    slideNumText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
    slideTotal: { fontSize: 16, color: c.text.tertiary, fontWeight: '700' },
    slideDesc: { flex: 1, fontSize: 13, color: c.text.secondary, fontWeight: '600' },
    slideNav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16,
    },
    slideNavBtn: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.bg.subtle,
    },
    slidePlayBtn: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: ENDURANCE_HOLD_COLOR,
    },

    // 수정 모드 안내
    editHintRow: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 14, paddingVertical: 8,
      backgroundColor: c.bg.subtle,
    },
    editHintText: { fontSize: 11.5, color: c.text.muted, fontWeight: '600' },

    // 수정 모드
    editPanel: {
      marginHorizontal: 14, marginTop: 12,
      padding: 14, borderRadius: 16,
      backgroundColor: c.bg.card,
      borderWidth: StyleSheet.hairlineWidth, borderColor: c.border.subtle,
      gap: 6,
    },
    editLabel: {
      fontSize: 11, fontWeight: '900', color: c.text.tertiary,
      letterSpacing: 0.3, textTransform: 'uppercase',
    },
    colorChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 7,
      borderRadius: 999, borderWidth: 1.5, borderColor: c.border.subtle,
      backgroundColor: c.bg.subtle,
    },
    colorDot: { width: 12, height: 12, borderRadius: 6 },
    colorChipText: { fontSize: 12, fontWeight: '700', color: c.text.secondary },

    holdTypeRow: { flexDirection: 'row', gap: 5 },
    holdTypeBtn: {
      flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center',
      borderWidth: 1.5, borderColor: c.border.strong, backgroundColor: c.bg.subtle,
    },
    holdTypeBtnText: { fontSize: 11, fontWeight: '800', color: c.text.secondary },

    undoRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4,
    },
    undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },

    saveBtn: {
      backgroundColor: c.brand.primary, borderRadius: 12,
      paddingVertical: 13, alignItems: 'center', marginTop: 6,
    },
    saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },

    // 홀드 크기 토글 (뷰 모드 infoCard)
    sizeToggleBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
      borderWidth: 1.5, borderColor: c.border.strong, backgroundColor: c.bg.subtle,
    },
    sizeToggleText: { fontSize: 11, fontWeight: '800', color: c.text.tertiary },

    // 홀드 메모 팝업 (뷰 모드)
    notePopupBg: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'flex-end',
    },
    notePopup: {
      margin: 16, padding: 14, borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.8)',
    },
    notePopupText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

    // 슬라이드쇼 현재 홀드 메모
    slideHoldNote: {
      flex: 1, backgroundColor: `${ENDURANCE_HOLD_COLOR}20`,
      borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    },
    slideHoldNoteText: { fontSize: 12, color: ENDURANCE_HOLD_COLOR, fontWeight: '700' },

    // 홀드별 메모 입력 (편집 모드 / 신규)
    holdNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    holdNoteNum: {
      width: 26, height: 26, borderRadius: 13,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    holdNoteNumText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },

    // 홀드 메모 picker
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
  });
}
