/**
 * 이미지 가장 바깥 1픽셀 테두리를 샘플링해서 배경색을 추정.
 *
 * 흐름:
 *   1. expo-image-manipulator 로 64×64 JPEG 으로 리사이즈 (속도 최적화)
 *   2. base64 → ArrayBuffer → jpeg-js 로 디코드 → RGBA Uint8Array
 *   3. 가장 바깥 한 줄 (top + bottom row + left + right col) RGB 평균 → hex
 *
 * 한계: 가장자리도 컬러풀한 로고 (그라데이션 풀배경) 는 부정확.
 *       일반적으로 흰/검정/단색 배경 로고에서 잘 작동.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { decode as base64Decode } from 'base64-arraybuffer';

const SAMPLE_SIZE = 64;

function clampHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${clampHex(r)}${clampHex(g)}${clampHex(b)}`;
}

export async function extractEdgeBgColor(uri: string): Promise<string | null> {
  try {
    // 1) 작은 JPEG 으로 리사이즈
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: SAMPLE_SIZE, height: SAMPLE_SIZE } }],
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      },
    );
    if (!manipulated.base64) return null;

    // 2) base64 → Uint8Array → RGBA 디코드
    const buffer = base64Decode(manipulated.base64);
    const decoded = jpeg.decode(new Uint8Array(buffer), { useTArray: true });
    const data = decoded.data;
    const w = decoded.width;
    const h = decoded.height;

    // 3) 가장 바깥 1픽셀 테두리만 샘플링.
    //    top row, bottom row 는 양 끝 코너 포함해서 전체 행 ;
    //    left, right col 은 코너 중복 피해서 y=1..h-2 만.
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    const add = (idx: number) => {
      r += data[idx];
      g += data[idx + 1];
      b += data[idx + 2];
      n += 1;
    };

    for (let x = 0; x < w; x++) {
      add((0 * w + x) * 4);             // top row
      add(((h - 1) * w + x) * 4);       // bottom row
    }
    for (let y = 1; y < h - 1; y++) {
      add((y * w + 0) * 4);             // left col
      add((y * w + (w - 1)) * 4);       // right col
    }

    if (n === 0) return null;
    return rgbToHex(r / n, g / n, b / n);
  } catch {
    // 추정 실패는 silent — 사용자가 수동 입력하면 됨
    return null;
  }
}
