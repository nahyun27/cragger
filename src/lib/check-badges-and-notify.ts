/**
 * 뱃지 즉시 판정 + 토스트.
 * 주요 액션 mutation 의 onSuccess 에서 호출 (세션 저장, 글 작성, 크루 가입 등).
 *
 * 실패해도 부수 효과 — 사용자 액션 결과는 영향 X.
 */

import { customAlert } from '@/components/ui/custom-alert';
import { syncBadges } from '@/lib/badge-checker';
import { supabase } from '@/lib/supabase';

let inFlight = false;

export async function checkBadgesAndNotify(): Promise<void> {
  // 중복 호출 가드 — 같은 액션에서 여러 mutation 이 동시에 끝날 때.
  if (inFlight) return;
  inFlight = true;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { newlyEarned } = await syncBadges(user.id);
    if (newlyEarned.length === 0) return;
    const msg = newlyEarned.map((b) => `${b.icon}  ${b.name}`).join('\n');
    customAlert(
      newlyEarned.length === 1 ? '🏅 새 뱃지 획득!' : `🏅 새 뱃지 ${newlyEarned.length}개!`,
      msg,
    );
  } catch {
    // silent
  } finally {
    inFlight = false;
  }
}
