/**
 * 카카오 로그인 → Supabase 세션 교환.
 *
 * 흐름:
 *   1) 카카오 SDK 로그인 (Web 브라우저 또는 카카오톡 앱 통해)
 *   2) 받은 access_token 을 Edge Function (kakao-auth) 에 전달
 *   3) Edge Function 이 사용자 생성/매칭 후 magic link OTP 발급
 *   4) supabase.auth.verifyOtp 로 세션 획득 → 앱이 로그인된 상태
 */
import { login as kakaoLogin } from '@react-native-kakao/user';

import { supabase } from '@/lib/supabase';

const FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/kakao-auth`;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export type KakaoSignInResult =
  | { ok: true }
  | { ok: false; error: string };

export async function signInWithKakao(): Promise<KakaoSignInResult> {
  try {
    // 1) 카카오 SDK 로그인 → access_token
    const kakaoResult = await kakaoLogin();
    if (!kakaoResult.accessToken) {
      return { ok: false, error: '카카오 로그인 응답에 토큰이 없어요' };
    }

    // 2) Edge Function 호출
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ accessToken: kakaoResult.accessToken }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'unknown' }));
      return { ok: false, error: body?.error ?? `서버 오류 (${res.status})` };
    }

    const { email, token } = (await res.json()) as { email: string; token: string };
    if (!email || !token) {
      return { ok: false, error: 'Edge Function 응답이 비어 있어요' };
    }

    // 3) Supabase magic-link OTP verify → 세션 발급
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (verifyErr) {
      return { ok: false, error: `세션 검증 실패: ${verifyErr.message}` };
    }

    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : typeof e === 'object' && e && 'message' in e
          ? String((e as { message: unknown }).message)
          : String(e);
    return { ok: false, error: translateKakaoError(message) };
  }
}

function translateKakaoError(msg: string): string {
  if (/cancel/i.test(msg)) return '카카오 로그인이 취소됐어요';
  if (/network/i.test(msg)) return '네트워크 연결을 확인해주세요';
  if (/not installed/i.test(msg)) return '카카오톡이 설치돼 있지 않아 웹으로 로그인됩니다';
  // 개발 환경(Expo Go) — native 모듈 미포함이라 호출 시 발생
  if (/doesn't seem to be linked|linking|TurboModule|RNKakao/i.test(msg)) {
    return '카카오 로그인은 정식 빌드(APK)에서만 동작해요. dev 환경에선 이메일로 로그인해주세요.';
  }
  return msg;
}
