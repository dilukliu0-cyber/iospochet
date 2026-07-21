import { create } from 'zustand';
import { supabase } from '../services/api/supabaseClient';
import type { Category } from '../types/category';

// Приглушённая палитра для своих категорий — того же семейства, что и
// у встроенных (см. CATEGORY_COLOR_BY_NAME), а не яркие крайоны.
const PALETTE = ['#7C9BB5', '#B5915F', '#9B7FA8', '#B57C8A', '#7FA88A', '#A88F6F', '#6F9A9E', '#A7A15F'];

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
