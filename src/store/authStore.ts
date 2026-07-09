import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../services/api/supabaseClient';

type AuthState = {
  session: Session | null;
  isInitializing: boolean;
  isReady: boolean;
  error: string | null;
  init: () => void;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isInitializing: true,
  isReady: false,
  error: null,

  init: () => {
    // Подписываемся один раз (init вызывается из RootNavigator при монтировании).
    if (get().isReady) return;
    set({ isReady: true });

    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, isInitializing: false });
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      // Не трогаем состояние, если пользователь тот же — иначе идентичность
      // объекта session меняется на каждый авто-рефреш токена и вызывает
      // шторм ре-рендеров/запросов.
      const current = get().session;
      if (current?.user.id === session?.user.id) return;
      set({ session });
    });
  },

  signUp: async (email, password) => {
    set({ error: null });
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) set({ error: error.message });
    return { error: error?.message ?? null };
  },

  signIn: async (email, password) => {
    set({ error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) set({ error: error.message });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
