import { create } from 'zustand';
import { supabase } from '../services/api/supabaseClient';
import type { Category } from '../types/category';

const PALETTE = ['#34D399', '#F59E0B', '#38BDF8', '#A78BFA', '#FB7185', '#FBBF24', '#60A5FA', '#4ADE80'];

type CategoriesState = {
  categories: Category[];
  fetch: (userId: string) => Promise<void>;
  addCategory: (userId: string, name: string, icon: string) => Promise<string | null>;
};

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],

  fetch: async (userId) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`is_default.eq.true,user_id.eq.${userId}`)
      .order('is_default', { ascending: false })
      .order('name');

    if (error) {
      console.error('Не удалось загрузить категории', error);
      return;
    }
    set({ categories: data ?? [] });
  },

  addCategory: async (userId, name, icon) => {
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: userId, name, icon, color, is_default: false })
      .select()
      .single();

    if (error) return error.message;
    set({ categories: [...get().categories, data] });
    return null;
  },
}));
