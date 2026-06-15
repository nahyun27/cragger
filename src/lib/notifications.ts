/**
 * 로컬 알림 헬퍼 — 운동 계획 D-day 리마인드 전용.
 * 서버/푸시 인증서 불필요. Expo Go 미지원(dev client 필요).
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 포그라운드에서도 알림 띄움
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let permRequested = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  if (permRequested) return false;
  permRequested = true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

type PlanSchedule = {
  planId: string;
  gymName: string;
  plannedDate: string;      // 'YYYY-MM-DD'
  plannedTime: string | null;  // 'HH:mm' or null → 08:00 기본
};

/**
 * 운동 계획 알림 예약. 과거 시점이면 skip.
 * 리턴값: 시스템이 발급한 notification identifier (계획 삭제 시 cancel 용).
 */
export async function scheduleWorkoutReminder(
  plan: PlanSchedule,
): Promise<string | null> {
  const ok = await ensureNotificationPermission();
  if (!ok) return null;

  // 알림 시점: planned_time 30분 전, 없으면 그날 08:00
  const baseTime = plan.plannedTime ?? '08:00';
  const [hh, mm] = baseTime.split(':').map((n) => parseInt(n, 10));
  const triggerDate = new Date(`${plan.plannedDate}T00:00:00`);
  triggerDate.setHours(hh, mm, 0, 0);
  if (plan.plannedTime) {
    // 30분 전
    triggerDate.setMinutes(triggerDate.getMinutes() - 30);
  }
  if (triggerDate.getTime() <= Date.now()) return null;

  const body = plan.plannedTime
    ? `${plan.gymName} · ${plan.plannedTime} 운동 예정 (30분 전)`
    : `${plan.gymName}에서 운동하기로 했어요`;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🧗 운동 리마인더',
      body,
      data: { planId: plan.planId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return id;
}

export async function cancelWorkoutReminderForPlan(planId: string): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const matches = all.filter(
      (n) => (n.content.data as { planId?: string } | null)?.planId === planId,
    );
    await Promise.all(
      matches.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {
    // ignore
  }
}

// ── 회원권 만료 임박 알림 (D-7, D-1) ─────────────────────────
type MembershipExpirySchedule = {
  membershipId: string;
  gymName: string;
  endDate: string;  // 'YYYY-MM-DD'
};

const EXPIRY_REMINDER_HOUR = 9;  // 오전 9시
const REMIND_DAYS_BEFORE: ReadonlyArray<{ days: number; key: 'd7' | 'd1' }> = [
  { days: 7, key: 'd7' },
  { days: 1, key: 'd1' },
];

export async function scheduleMembershipExpiryReminders(
  m: MembershipExpirySchedule,
): Promise<void> {
  const ok = await ensureNotificationPermission();
  if (!ok) return;

  const end = new Date(`${m.endDate}T00:00:00`);

  for (const { days, key } of REMIND_DAYS_BEFORE) {
    const trigger = new Date(end);
    trigger.setDate(trigger.getDate() - days);
    trigger.setHours(EXPIRY_REMINDER_HOUR, 0, 0, 0);
    if (trigger.getTime() <= Date.now()) continue;  // 이미 지남

    const title = days === 1 ? '⏰ 내일 회원권 만료' : '⏰ 회원권 만료 임박';
    const body = days === 1
      ? `${m.gymName} 회원권이 내일 만료돼요`
      : `${m.gymName} 회원권 만료까지 ${days}일 남았어요`;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'membership_expiry', membershipId: m.membershipId, key },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger,
        },
      });
    } catch {
      // ignore one-off failure, try the next
    }
  }
}

export async function cancelMembershipExpiryReminders(
  membershipId: string,
): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const matches = all.filter((n) => {
      const data = n.content.data as
        | { type?: string; membershipId?: string }
        | null;
      return data?.type === 'membership_expiry' && data.membershipId === membershipId;
    });
    await Promise.all(
      matches.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {
    // ignore
  }
}

// Android는 채널 등록 필요. App 초기화 시 한 번 호출.
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.HIGH,
  });
}
