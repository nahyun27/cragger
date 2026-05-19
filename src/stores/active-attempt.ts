import { create } from 'zustand';

// 진행 중인 등반 시도의 휘발성 상태.
// - 미완 탭마다 tries++, save는 안 함
// - 완등/폴/색깔 전환/세션 완료 시점에 flush 후 reset
// - 세션 단위로 분리: sessionId가 바뀌면 외부에서 reset 호출
export type ActiveAttemptState = {
  sessionId: string | null;
  color: string | null;
  tries: number;
};

type ActiveAttemptStore = ActiveAttemptState & {
  setSession: (sessionId: string) => void;
  setColor: (color: string) => void;
  incrementTries: () => void;
  reset: () => void;
};

const INITIAL: ActiveAttemptState = {
  sessionId: null,
  color: null,
  tries: 0,
};

export const useActiveAttemptStore = create<ActiveAttemptStore>((set) => ({
  ...INITIAL,
  setSession: (sessionId) =>
    set((state) =>
      state.sessionId === sessionId ? state : { sessionId, color: null, tries: 0 },
    ),
  setColor: (color) => set({ color, tries: 0 }),
  incrementTries: () => set((state) => ({ tries: state.tries + 1 })),
  reset: () => set((state) => ({ sessionId: state.sessionId, color: null, tries: 0 })),
}));
