/**
 * 자체 구현 자유 비율 이미지 자르기 모달.
 *
 * 동작:
 *   - 사진 picker 결과 uri 받아서 풀스크린 표시
 *   - 4 모서리 핸들 드래그 → crop rect 크기 조정
 *   - 중앙 드래그 → crop rect 전체 이동
 *   - 완료 → expo-image-manipulator 로 실제 자르기 → cropped uri 반환
 *
 * 가벼움 우선: Reanimated worklets 안 쓰고 useState + PanResponder.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useThemeColors, type ThemeColors } from '@/lib/theme';

type Props = {
  visible: boolean;
  uri: string | null;
  onCancel: () => void;
  onConfirm: (croppedUri: string, width: number, height: number) => void;
};

type Rect = { x: number; y: number; w: number; h: number };
type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'move';

const HANDLE_SIZE = 28;
const MIN_CROP = 60;

export function ImageCropModal({ visible, uri, onCancel, onConfirm }: Props) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();

  // 컨테이너 (이미지 표시 영역) 크기
  const [container, setContainer] = useState<{ w: number; h: number } | null>(null);
  // 원본 이미지 크기 (Image.getSize)
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  // 이미지가 컨테이너 안에서 차지하는 box (contain 기준)
  const imgBox = useMemo(() => {
    if (!container || !imgSize) return null;
    const cAR = container.w / container.h;
    const iAR = imgSize.w / imgSize.h;
    let w: number, h: number;
    if (iAR > cAR) {
      w = container.w;
      h = container.w / iAR;
    } else {
      h = container.h;
      w = container.h * iAR;
    }
    const x = (container.w - w) / 2;
    const y = (container.h - h) / 2;
    return { x, y, w, h };
  }, [container, imgSize]);

  // crop rect — 화면 좌표 기준 (imgBox 내부에 머물러야 함)
  const [crop, setCrop] = useState<Rect | null>(null);
  const cropRef = useRef<Rect | null>(null);
  cropRef.current = crop;

  const [processing, setProcessing] = useState(false);

  // uri/imgBox 변경 시 crop 초기화 — 디폴트는 이미지 전체.
  useEffect(() => {
    if (!imgBox) return;
    setCrop({ x: imgBox.x, y: imgBox.y, w: imgBox.w, h: imgBox.h });
  }, [imgBox?.x, imgBox?.y, imgBox?.w, imgBox?.h]);

  // 이미지 사이즈 측정
  useEffect(() => {
    if (!uri) return;
    setImgSize(null);
    Image.getSize(
      uri,
      (w, h) => setImgSize({ w, h }),
      () => setImgSize(null),
    );
  }, [uri]);

  // imgBox 를 ref 로 동기 — closure 가 항상 최신 값 참조
  const imgBoxRef = useRef(imgBox);
  imgBoxRef.current = imgBox;

  // 핸들/이동 PanResponder. useRef 로 한 번만 만들지만 내부는 ref 로 최신값 읽음.
  function makePanResponder(handle: Handle) {
    const startRef = { current: null as Rect | null };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRef.current = cropRef.current ? { ...cropRef.current } : null;
      },
      onPanResponderMove: (_, g) => {
        const box = imgBoxRef.current;
        if (!startRef.current || !box) return;
        const start = startRef.current;
        let { x, y, w, h } = start;

        if (handle === 'move') {
          x = clamp(start.x + g.dx, box.x, box.x + box.w - w);
          y = clamp(start.y + g.dy, box.y, box.y + box.h - h);
        } else {
          const right = start.x + start.w;
          const bottom = start.y + start.h;
          if (handle === 'tl') {
            x = clamp(start.x + g.dx, box.x, right - MIN_CROP);
            y = clamp(start.y + g.dy, box.y, bottom - MIN_CROP);
            w = right - x;
            h = bottom - y;
          } else if (handle === 'tr') {
            y = clamp(start.y + g.dy, box.y, bottom - MIN_CROP);
            const newRight = clamp(right + g.dx, start.x + MIN_CROP, box.x + box.w);
            w = newRight - start.x;
            h = bottom - y;
          } else if (handle === 'bl') {
            x = clamp(start.x + g.dx, box.x, right - MIN_CROP);
            const newBottom = clamp(bottom + g.dy, start.y + MIN_CROP, box.y + box.h);
            w = right - x;
            h = newBottom - start.y;
          } else if (handle === 'br') {
            const newRight = clamp(right + g.dx, start.x + MIN_CROP, box.x + box.w);
            const newBottom = clamp(bottom + g.dy, start.y + MIN_CROP, box.y + box.h);
            w = newRight - start.x;
            h = newBottom - start.y;
          }
        }
        setCrop({ x, y, w, h });
      },
    });
  }

  const moveResponder = useRef(makePanResponder('move')).current;
  const tlResponder = useRef(makePanResponder('tl')).current;
  const trResponder = useRef(makePanResponder('tr')).current;
  const blResponder = useRef(makePanResponder('bl')).current;
  const brResponder = useRef(makePanResponder('br')).current;

  async function handleConfirm() {
    if (!uri || !crop || !imgBox || !imgSize || processing) return;
    setProcessing(true);
    try {
      // crop rect 를 화면 좌표 → 원본 이미지 좌표 로 환산
      const scale = imgSize.w / imgBox.w;
      const originX = Math.max(0, Math.round((crop.x - imgBox.x) * scale));
      const originY = Math.max(0, Math.round((crop.y - imgBox.y) * scale));
      const cropW = Math.min(imgSize.w - originX, Math.round(crop.w * scale));
      const cropH = Math.min(imgSize.h - originY, Math.round(crop.h * scale));

      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX, originY, width: cropW, height: cropH } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );
      onConfirm(result.uri, result.width, result.height);
    } catch (e) {
      // 실패해도 모달은 닫음
      console.warn('crop failed', e);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={[s.root, { paddingTop: Math.max(insets.top, 12) }]}>
        {/* 상단 액션 바 */}
        <View style={s.topBar}>
          <Pressable onPress={onCancel} hitSlop={10} style={({ pressed }) => [s.barBtn, pressed && { opacity: 0.6 }]}>
            <Text style={s.cancelText}>취소</Text>
          </Pressable>
          <Text style={s.title}>자르기</Text>
          <Pressable
            onPress={handleConfirm}
            hitSlop={10}
            disabled={processing || !crop}
            style={({ pressed }) => [s.barBtn, pressed && { opacity: 0.6 }]}
          >
            {processing ? (
              <ActivityIndicator color={c.brand.primary} size="small" />
            ) : (
              <Text style={s.doneText}>완료</Text>
            )}
          </Pressable>
        </View>

        {/* 이미지 + crop overlay */}
        <View
          style={s.canvas}
          onLayout={(e) => setContainer({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
          {uri && imgBox && (
            <Image
              source={{ uri }}
              style={{
                position: 'absolute',
                left: imgBox.x,
                top: imgBox.y,
                width: imgBox.w,
                height: imgBox.h,
              }}
              resizeMode="contain"
            />
          )}

          {/* 어두운 오버레이 — crop 영역만 빼고 4 방향 */}
          {imgBox && crop && (
            <>
              <View style={[s.dim, { left: 0, top: 0, right: 0, height: crop.y }]} />
              <View style={[s.dim, { left: 0, top: crop.y + crop.h, right: 0, bottom: 0 }]} />
              <View style={[s.dim, { left: 0, top: crop.y, width: crop.x, height: crop.h }]} />
              <View style={[s.dim, { left: crop.x + crop.w, top: crop.y, right: 0, height: crop.h }]} />
            </>
          )}

          {/* crop frame + 중앙 드래그 */}
          {crop && (
            <View
              {...moveResponder.panHandlers}
              style={{
                position: 'absolute',
                left: crop.x,
                top: crop.y,
                width: crop.w,
                height: crop.h,
                borderWidth: 1.5,
                borderColor: '#ffffff',
              }}
            >
              {/* 3x3 그리드 가이드 */}
              <View style={[s.gridLine, { top: '33.333%', left: 0, right: 0, height: StyleSheet.hairlineWidth }]} />
              <View style={[s.gridLine, { top: '66.666%', left: 0, right: 0, height: StyleSheet.hairlineWidth }]} />
              <View style={[s.gridLine, { left: '33.333%', top: 0, bottom: 0, width: StyleSheet.hairlineWidth }]} />
              <View style={[s.gridLine, { left: '66.666%', top: 0, bottom: 0, width: StyleSheet.hairlineWidth }]} />
            </View>
          )}

          {/* 핸들 — 별도 absolute 로 frame 밖에 띄움 */}
          {crop && (
            <>
              <Handle responder={tlResponder} x={crop.x} y={crop.y} corner="tl" />
              <Handle responder={trResponder} x={crop.x + crop.w} y={crop.y} corner="tr" />
              <Handle responder={blResponder} x={crop.x} y={crop.y + crop.h} corner="bl" />
              <Handle responder={brResponder} x={crop.x + crop.w} y={crop.y + crop.h} corner="br" />
            </>
          )}
        </View>

        <View style={[s.hint, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <Feather name="move" size={13} color="#cbd5e1" />
          <Text style={s.hintText}>중앙: 이동 · 모서리: 크기</Text>
        </View>
      </View>
    </Modal>
  );
}

function Handle({
  responder,
  x,
  y,
  corner,
}: {
  responder: ReturnType<typeof PanResponder.create>;
  x: number;
  y: number;
  corner: 'tl' | 'tr' | 'bl' | 'br';
}) {
  return (
    <View
      {...responder.panHandlers}
      style={{
        position: 'absolute',
        left: x - HANDLE_SIZE / 2,
        top: y - HANDLE_SIZE / 2,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 2,
          backgroundColor: '#ffffff',
          borderTopLeftRadius: corner === 'tl' ? 4 : 2,
          borderTopRightRadius: corner === 'tr' ? 4 : 2,
          borderBottomLeftRadius: corner === 'bl' ? 4 : 2,
          borderBottomRightRadius: corner === 'br' ? 4 : 2,
        }}
      />
    </View>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000000' },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    barBtn: { paddingVertical: 6, paddingHorizontal: 8 },
    cancelText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
    doneText: { color: c.brand.primary, fontSize: 15, fontWeight: '900' },
    title: { color: '#ffffff', fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
    canvas: { flex: 1, position: 'relative' },
    dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
    gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.35)' },
    hint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingTop: 10,
    },
    hintText: { color: '#cbd5e1', fontSize: 11.5, fontWeight: '700' },
  });
}
