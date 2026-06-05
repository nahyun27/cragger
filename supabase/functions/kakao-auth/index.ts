// 카카오 로그인 → Supabase 세션 교환 Edge Function.
//
// Flow:
//   1) 클라이언트가 카카오 SDK 로 받은 access_token 을 body 에 담아 호출.
//   2) Edge Function 이 카카오 API (/v2/user/me) 로 access_token 검증 + 사용자 정보 취득.
//   3) profiles.kakao_id 로 기존 사용자 매칭. 없으면 admin.createUser() 로 신규 생성.
//   4) admin.generateLink({ type: 'magiclink', email }) 로 OTP 발급.
//   5) 응답: { email, token } → 클라이언트가 supabase.auth.verifyOtp() 로 세션 획득.
//
// 환경변수 (Supabase 대시보드 → Edge Functions → Secrets):
//   - SUPABASE_URL              (자동 주입)
//   - SUPABASE_SERVICE_ROLE_KEY (자동 주입)
//
// 호출 예시 (앱 측):
//   const res = await fetch(`${SUPABASE_URL}/functions/v1/kakao-auth`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
//     },
//     body: JSON.stringify({ accessToken: kakaoAccessToken }),
//   });
//   const { email, token } = await res.json();
//   const { data, error } = await supabase.auth.verifyOtp({
//     email, token, type: 'email',
//   });

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type KakaoMeResponse = {
  id: number;
  properties?: { nickname?: string; profile_image?: string; thumbnail_image?: string };
  kakao_account?: {
    email?: string;
    is_email_verified?: boolean;
    profile?: { nickname?: string; profile_image_url?: string };
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { accessToken } = (await req.json()) as { accessToken?: string };
    if (!accessToken) return errResp(400, 'accessToken 이 필요해요');

    // 1) 카카오 사용자 정보 조회 (access_token 검증 겸용)
    const kakaoRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!kakaoRes.ok) {
      const text = await kakaoRes.text();
      return errResp(401, `카카오 인증 실패: ${text.slice(0, 200)}`);
    }
    const kakaoUser = (await kakaoRes.json()) as KakaoMeResponse;
    const kakaoId = String(kakaoUser.id);

    const email =
      kakaoUser.kakao_account?.email ??
      `kakao_${kakaoId}@cragger.local`; // 이메일 동의 안 한 경우 placeholder

    const nickname =
      kakaoUser.kakao_account?.profile?.nickname ??
      kakaoUser.properties?.nickname ??
      `카카오${kakaoId.slice(-4)}`;

    const avatarUrl =
      kakaoUser.kakao_account?.profile?.profile_image_url ??
      kakaoUser.properties?.profile_image ??
      null;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 2) profiles.kakao_id 로 기존 사용자 찾기
    const { data: existingProfile, error: lookupErr } = await admin
      .from('profiles')
      .select('id, username')
      .eq('kakao_id', kakaoId)
      .maybeSingle();
    if (lookupErr) return errResp(500, `프로필 조회 실패: ${lookupErr.message}`);

    let userId: string;
    let userEmail: string;

    if (existingProfile) {
      userId = existingProfile.id;
      // 기존 유저는 auth.users 에서 email 다시 조회 (placeholder 일 수도 있어서 신뢰값 사용)
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      userEmail = authUser.user?.email ?? email;
    } else {
      // 3) 이메일 중복 체크 (이미 이메일/비밀번호로 가입한 경우)
      if (kakaoUser.kakao_account?.email) {
        const { data: usersByEmail } = await admin.auth.admin.listUsers();
        const dup = usersByEmail.users.find((u) => u.email === email);
        if (dup) {
          return errResp(
            409,
            '같은 이메일로 이미 가입된 계정이 있어요. 이메일로 먼저 로그인한 뒤 카카오 연동을 해주세요.',
          );
        }
      }

      // 4) 신규 사용자 생성
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true, // 카카오에서 인증된 이메일이므로 confirm 처리
        user_metadata: { provider: 'kakao', kakao_id: kakaoId, nickname, avatar_url: avatarUrl },
      });
      if (createErr || !created.user) {
        return errResp(500, `사용자 생성 실패: ${createErr?.message ?? 'unknown'}`);
      }
      userId = created.user.id;
      userEmail = email;

      // profiles 트리거가 만들어둔 row 에 카카오 정보 채워넣기
      const baseUsername = sanitizeUsername(nickname, kakaoId);
      const username = await pickUniqueUsername(admin, baseUsername);

      const { error: updateErr } = await admin
        .from('profiles')
        .update({
          kakao_id: kakaoId,
          username,
          display_name: nickname,
          avatar_url: avatarUrl,
        })
        .eq('id', userId);
      if (updateErr) {
        // 프로필 업데이트 실패해도 인증은 진행 (이후 프로필 편집에서 수정 가능)
        console.error('profile update failed:', updateErr.message);
      }
    }

    // 5) Magic link 발급 → email_otp 추출해서 클라이언트에 전달
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    });
    if (linkErr || !linkData) {
      return errResp(500, `세션 토큰 발급 실패: ${linkErr?.message ?? 'unknown'}`);
    }

    return new Response(
      JSON.stringify({
        email: userEmail,
        token: linkData.properties.email_otp,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : String(e);
    return errResp(500, `서버 오류: ${message}`);
  }
});

function errResp(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 닉네임 → username 후보 (영문/숫자/언더스코어만, 2~30자)
function sanitizeUsername(nickname: string, kakaoId: string): string {
  const ascii = nickname
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}_]/gu, '')
    .toLowerCase();
  if (ascii.length >= 2 && ascii.length <= 30) return ascii;
  // 한글이거나 너무 짧으면 kakao_id 기반 fallback
  return `kakao_${kakaoId.slice(-8)}`;
}

async function pickUniqueUsername(
  admin: ReturnType<typeof createClient>,
  base: string,
): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? base : `${base}_${i}`;
    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}_${Date.now().toString(36).slice(-6)}`;
}
