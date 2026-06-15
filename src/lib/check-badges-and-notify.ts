/**
 * 뱃지 즉시 판정 + 토스트.
 * 주요 액션 mutation 의 onSuccess 에서 호출 (세션 저장, 글 작성, 크루 가입 등).
 *
 * 실패해도 부수 효과 — 사용자 액션 결과는 영향 X.
 */

import React from 'react';

import { BadgeIcon } from '@/components/ui/badge-icon';
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

    // 1) 즉시 토스트 — 첫 뱃지의 실제 그래픽을 alert 헤더에 노출.
    const first = newlyEarned[0];
    const title =
      newlyEarned.length === 1
        ? '새 뱃지 획득!'
        : `새 뱃지 ${newlyEarned.length}개 획득!`;
    const msg =
      newlyEarned.length === 1
        ? first.name
        : newlyEarned.map((b) => `· ${b.name}`).join('\n');
    customAlert(
      title,
      msg,
      undefined,
      undefined,
      React.createElement(BadgeIcon, { icon: first.icon, color: first.color, size: 44 }),
    );

    // 2) 알림 센터에도 누적 — 뒤에 다시 확인 가능. link 는 마이페이지(뱃지 섹션).
    //    pref 가 꺼져 있어도 일단 insert 한다 (받은 뱃지 history 성격).
    const rows = newlyEarned.map((b) => ({
      user_id: user.id,
      type: 'badge_earned',
      title: `🏅 새 뱃지 — ${b.name}`,
      body: `${b.name} 뱃지를 획득했어요! (${b.hint})`,
      link: '/(tabs)/profile',
    }));
    await supabase.from('notifications').insert(rows);
  } catch {
    // silent
  } finally {
    inFlight = false;
  }
}
