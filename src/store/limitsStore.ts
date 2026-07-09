import { create } from 'zustand';
import { supabase } from '../services/api/supabaseClient';
import type { Limit } from '../types/limit';

type LimitsState = {
  limits: Limit[];
  isLoading: boolean;
  fetch: (userId: string) => Promise<void>;
  upsertLimit: (userId: string, categoryName: string, amount: number, currency: string) => Promise<string | null>;
  deleteLimit: (id: string) => Promise<string | null>;
};

export const useLimitsStore = create<LimitsState>((set, get) => ({
  limits: [],
  isLoading: false,

  fetch: async (userId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('limits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');

    if (error) {
      console.error('Не удалось загрузить лимиты', error);
      set({ isLoading: false });
      return;
    }
    set({ limits: data ?? [], isLoading: false });
  },

  upsertLimit: async (userId, categoryName, amount, currency) => {
    const { data, error } = await supabase
      .from('limits')
      .upsert(
        { user_id: userId, category_name: categoryName, amount, currency },
        { onConflict: 'user_id,category_name' },
      )
      .select()
      .single();

    if (error) return error.message;

    const existing = get().limits.filter((l) => l.category_name !== categoryName);
    set({ limits: [...existing, data] });
    return null;
  },

  deleteLimit: async (id) => {
    const { error } = await supabase.from('limits').delete().eq('id', id);
    if (error) return error.message;
    set({ limits: get().limits.filter((l) => l.id !== id) });
    return null;
  },
}));
