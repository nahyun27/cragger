// 다크/라이트 모드 색깔 토큰.
// 모든 화면은 useThemeColors() 통해 이 객체를 받아 사용.
// 절대 hex 직접 쓰지 말 것 (Hold 색깔 = climb-colors.ts 만 예외).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme as nwColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { create } from 'zustand';

export type ThemeColors = {
  isDark: boolean;
  bg: {
    primary: string;     // 메인 화면 배경
    card: string;        // 카드/sheet 배경
    subtle: string;      // 보조 배경 (아이콘 박스, 인풋 배경 등)
    accent: string;      // 브랜드 강조 배경
    overlay: string;     // 모달 오버레이
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    muted: string;
    inverse: string;     // 진한 배경 위의 글자
  };
  border: {
    subtle: string;
    strong: string;
  };
  brand: {
    primary: string;
    primaryDeep: string;
    primaryLight: string;
    onPrimary: string;
  };
  status: {
    danger: string;
    dangerBg: string;
    success: string;
    successBg: string;
    warning: string;
    warningBg: string;
  };
  shadow: {
    color: string;
    opacity: number;
  };
};

export const lightColors: ThemeColors = {
  isDark: false,
  bg: {
    primary:  '#eef2f7',  // 페이지 배경 — 카드(흰색) 와 대비를 위해 살짝 진한 회색조
    card:     '#ffffff',
    subtle:   '#f1f5f9',
    accent:   '#ecfeff',
    overlay:  'rgba(15, 23, 42, 0.4)',
  },
  text: {
    primary:   '#0f172a',
    secondary: '#475569',
    tertiary:  '#64748b',
    muted:     '#94a3b8',
    inverse:   '#ffffff',
  },
  border: {
    subtle: '#e2e8f0',
    strong: '#cbd5e1',
  },
  brand: {
    primary:      '#06b6d4',
    primaryDeep:  '#0891b2',
    primaryLight: '#cffafe',
    onPrimary:    '#ffffff',
  },
  status: {
    danger:    '#ef4444',
    dangerBg:  '#fef2f2',
    success:   '#16a34a',
    successBg: '#ecfdf5',
    warning:   '#d97706',
    warningBg: '#fffbeb',
  },
  shadow: {
    color:   '#0f172a',
    opacity: 0.04,
  },
};

export const darkColors: ThemeColors = {
  isDark: true,
  bg: {
    primary:  '#0a1220',  // 페이지 배경 — 카드(slate-800) 보다 더 어두워서 떠 보임
    card:     '#1e293b',
    subtle:   '#334155',
    accent:   '#164e63',
    overlay:  'rgba(0, 0, 0, 0.6)',
  },
  text: {
    primary:   '#f8fafc',
    secondary: '#cbd5e1',
    tertiary:  '#94a3b8',
    muted:     '#64748b',
    inverse:   '#0f172a',
  },
  border: {
    subtle: '#334155',
    strong: '#475569',
  },
  brand: {
    primary:      '#22d3ee',  // light side에서 #06b6d4 인데 다크에선 한 단계 밝게
    primaryDeep:  '#06b6d4',
    primaryLight: '#164e63',
    onPrimary:    '#0f172a',
  },
  status: {
    danger:    '#f87171',
    dangerBg:  '#451a1a',
    success:   '#22c55e',
    successBg: '#14321f',
    warning:   '#f59e0b',
    warningBg: '#3f2906',
  },
  shadow: {
    color:   '#000000',
    opacity: 0.3,
  },
};

// ── 사용자 테마 선호 ─────────────────────────────────────
export type ThemePref = 'auto' | 'light' | 'dark';

type ThemePrefState = {
  pref: ThemePref;
  hydrated: boolean;
  setPref: (p: ThemePref) => void;
  _setHydrated: () => void;
};

const STORAGE_KEY = '@cragger/theme-pref';

function applyToNativeWind(pref: ThemePref) {
  // NativeWind 의 CSS 변수 .dark 토글. 'auto' 는 'system' 매핑.
  nwColorScheme.set(pref === 'auto' ? 'system' : pref);
}

export const useThemePref = create<ThemePrefState>((set) => ({
  pref: 'auto',
  hydrated: false,
  setPref: (p) => {
    set({ pref: p });
    applyToNativeWind(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  },
  _setHydrated: () => set({ hydrated: true }),
}));

// 앱 시작 시 1회 호출 — AsyncStorage 에서 저장된 pref 복원.
export function useHydrateThemePref() {
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        if (v === 'light' || v === 'dark' || v === 'auto') {
          useThemePref.setState({ pref: v });
          applyToNativeWind(v);
        } else {
          applyToNativeWind('auto');
        }
      } catch {
        applyToNativeWind('auto');
      } finally {
        useThemePref.setState({ hydrated: true });
      }
    })();
  }, []);
}

// 현재 사용해야 할 색깔 객체. pref + 시스템 모드 조합.
export function useThemeColors(): ThemeColors {
  const scheme = useEffectiveScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}

// 실제 적용된 모드 ('light' | 'dark') — StatusBar 등 외부 props 에 사용.
export function useEffectiveScheme(): 'light' | 'dark' {
  const pref = useThemePref((s) => s.pref);
  const system = useColorScheme();
  if (pref !== 'auto') return pref;
  return system === 'dark' ? 'dark' : 'light';
}
