/**
 * expo-router 래퍼 — push/navigate/replace의 빠른 중복 호출을 무시한다.
 * 같은 버튼을 빠르게 두 번 눌러도 화면이 한 번만 쌓이게 하기 위함.
 *
 * 사용 규칙: 프로젝트 코드는 항상 '@/lib/router'에서 임포트한다.
 * expo-router에서 직접 import 하지 말 것.
 */
import { useMemo, useRef } from 'react';
import {
  router as expoRouter,
  useRouter as useExpoRouter,
} from 'expo-router';

export * from 'expo-router';

const GUARD_MS = 600;

// 싱글톤 router — 전역 가드 타이머 1개 공유
let singletonLast = 0;
const singletonGuard = <T extends (...args: any[]) => any>(fn: T): T =>
  ((...args: any[]) => {
    const now = performance.now();
    if (now - singletonLast < GUARD_MS) return;
    singletonLast = now;
    return fn(...args);
  }) as T;

export const router = {
  ...expoRouter,
  push: singletonGuard((...args: Parameters<typeof expoRouter.push>) => expoRouter.push(...args)),
  navigate: singletonGuard((...args: Parameters<typeof expoRouter.navigate>) => expoRouter.navigate(...args)),
  replace: singletonGuard((...args: Parameters<typeof expoRouter.replace>) => expoRouter.replace(...args)),
} as typeof expoRouter;

// useRouter — 컴포넌트 인스턴스별 가드
export function useRouter() {
  const inner = useExpoRouter();
  const lastRef = useRef(0);
  return useMemo(() => {
    const guard = <T extends (...args: any[]) => any>(fn: T): T =>
      ((...args: any[]) => {
        const now = performance.now();
        if (now - lastRef.current < GUARD_MS) return;
        lastRef.current = now;
        return fn(...args);
      }) as T;
    return {
      ...inner,
      push: guard((...args: Parameters<typeof inner.push>) => inner.push(...args)),
      navigate: guard((...args: Parameters<typeof inner.navigate>) => inner.navigate(...args)),
      replace: guard((...args: Parameters<typeof inner.replace>) => inner.replace(...args)),
    } as ReturnType<typeof useExpoRouter>;
  }, [inner]);
}
