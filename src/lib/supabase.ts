import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Add them to .env at the project root.',
  );
}

import { Platform } from 'react-native';

export const supabase = Platform.OS === 'web' 
  ? ({
      auth: {
        getSession: async () => ({ data: { session: { user: { id: 'dummy' } } } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ error: { message: 'Not supported on web preview' } }),
        signUp: async () => ({ data: { session: null }, error: { message: 'Not supported on web preview' } }),
        signOut: async () => ({ error: null }),
      },
      from: (table: string) => {
        const chain: any = {
          select: () => chain,
          eq: () => chain,
          in: () => chain,
          order: () => chain,
          not: () => chain,
          delete: () => chain,
          update: () => chain,
          insert: () => chain,
          limit: () => {
            if (table === 'sessions') {
              return Promise.resolve({
                data: [
                  { id: '1', session_date: '2026-05-18', duration_min: 120, gym: { id: '1', name: '더클라임', branch: '강남점' } },
                  { id: '2', session_date: '2026-05-15', duration_min: 90, gym: { id: '2', name: '서울숲 클라이밍', branch: null } },
                  { id: '3', session_date: '2026-05-10', duration_min: 150, gym: { id: '3', name: '피커스', branch: '종로점' } },
                ],
                error: null,
              });
            }
            return Promise.resolve({ data: [], error: null });
          },
          single: () => {
            if (table === 'sessions') {
              return Promise.resolve({
                data: {
                  id: '1',
                  session_date: '2026-05-18',
                  duration_min: 120,
                  condition: 4,
                  notes: '오늘 운동 아주 잘됨!',
                  created_at: '2026-05-18T10:00:00Z',
                  completed_at: '2026-05-18T12:00:00Z',
                  gym: { id: '1', name: '더클라임', branch: '강남점' }
                },
                error: null,
              });
            }
            if (table === 'gyms') {
              return Promise.resolve({
                data: { id: '1', name: '더클라임', branch: '강남점', city: '서울', district: '강남구', size_pyeong: 500, has_boulder: true, has_lead: false, has_top_rope: false, has_moonboard: false, has_kilter: false, has_tension: false, floor_count: 3, open_year: 2020 },
                error: null,
              });
            }
            return Promise.resolve({ data: {}, error: null });
          },
          then: (resolve: any) => {
            if (table === 'attempts') {
              resolve({
                data: [
                  { session_id: '1', result: 'send', problem: { color: 'red' } },
                  { session_id: '1', result: 'send', problem: { color: 'red' } },
                  { session_id: '1', result: 'send', problem: { color: 'blue' } },
                  { session_id: '1', result: 'send', problem: { color: 'blue' } },
                  { session_id: '1', result: 'send', problem: { color: 'blue' } },
                  { session_id: '1', result: 'send', problem: { color: 'yellow' } },
                  { session_id: '2', result: 'send', problem: { color: 'blue' } },
                  { session_id: '3', result: 'send', problem: { color: 'red' } },
                  { session_id: '3', result: 'send', problem: { color: 'red' } },
                ],
                error: null,
              });
            } else if (table === 'gyms') {
              resolve({
                data: [
                  { id: '1', name: '클라이밍 파크', branch: '성수점', city: '서울', district: '성동구', size_pyeong: 500, has_boulder: true, has_lead: false, has_top_rope: false, has_moonboard: false, has_kilter: false, has_tension: false },
                  { id: '2', name: '더클라임', branch: '문래점', city: '서울', district: '영등포구', size_pyeong: 430, has_boulder: true, has_lead: false, has_top_rope: false, has_moonboard: false, has_kilter: false, has_tension: false },
                  { id: '3', name: '더클라임', branch: '양재점', city: '서울', district: '서초구', size_pyeong: 407, has_boulder: true, has_lead: false, has_top_rope: false, has_moonboard: false, has_kilter: false, has_tension: false },
                  { id: '4', name: '더클라임', branch: '연남점', city: '서울', district: '마포구', size_pyeong: 400, has_boulder: true, has_lead: false, has_top_rope: false, has_moonboard: false, has_kilter: false, has_tension: false },
                  { id: '5', name: '서울숲 클라이밍', branch: '구로점', city: '서울', district: '구로구', size_pyeong: 360, has_boulder: true, has_lead: false, has_top_rope: false, has_moonboard: false, has_kilter: false, has_tension: false },
                  { id: '6', name: '킨디 클라이밍', branch: 'KIN:D', city: '수원', district: '영통구', size_pyeong: 630, has_boulder: true, has_lead: false, has_top_rope: false, has_moonboard: true, has_kilter: true, has_tension: false },
                  { id: '7', name: '캐치스톤클라이밍짐', branch: null, city: '부천', district: '원미구', size_pyeong: 300, has_boulder: true, has_lead: false, has_top_rope: false, has_moonboard: false, has_kilter: false, has_tension: false },
                  { id: '8', name: '디스커버리클라이밍', branch: '클라임스퀘어 ICN', city: '인천', district: null, size_pyeong: 500, has_boulder: true, has_lead: true, has_top_rope: true, has_moonboard: false, has_kilter: false, has_tension: false },
                  { id: '9', name: '비블럭 클라이밍', branch: '송도점', city: '인천', district: '연수구', size_pyeong: 250, has_boulder: true, has_lead: false, has_top_rope: false, has_moonboard: false, has_kilter: false, has_tension: false }
                ],
                error: null,
              });
            } else if (table === 'sessions') {
              resolve({
                data: [
                  { id: '1', session_date: '2026-05-18', duration_min: 120, gym: { id: '1', name: '더클라임', branch: '강남점' } },
                  { id: '2', session_date: '2026-05-15', duration_min: 90, gym: { id: '2', name: '서울숲 클라이밍', branch: null } },
                  { id: '3', session_date: '2026-05-10', duration_min: 150, gym: { id: '3', name: '피커스', branch: '종로점' } },
                ],
                error: null,
              });
            } else {
              resolve({ data: [], error: null });
            }
          }
        };
        return chain;
      }
    } as any) 
  : createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
