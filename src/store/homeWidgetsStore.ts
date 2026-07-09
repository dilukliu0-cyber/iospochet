import { create } from 'zustand';
import { supabase } from '../services/api/supabaseClient';
import type { HomeWidget, HomeWidgetType } from '../types/homeWidget';

type HomeWidgetsState = {
  widgets: HomeWidget[];
  fetch: (userId: string) => Promise<void>;
  addWidget: (userId: string, type: HomeWidgetType, config?: HomeWidget['config']) => Promise<string | null>;
  removeWidget: (id: string) => Promise<void>;
};

export const useHomeWidgetsStore = create<HomeWidgetsState>((set, get) => ({
  widgets: [],

  fetch: async (userId) => {
    const { data, error } = await supabase
      .from('home_widgets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');

    if (error) {
      console.error('Не удалось загрузить виджеты', error);
      return;
    }
    set({ widgets: data ?? [] });
  },

  addWidget: async (userId, type, config = {}) => {
    const { data, error } = await supabase
      .from('home_widgets')
      .insert({ user_id: userId, type, config })
      .select()
      .single();

    if (error) return error.message;
    set({ widgets: [...get().widgets, data] });
    return null;
  },

  removeWidget: async (id) => {
    set({ widgets: get().widgets.filter((w) => w.id !== id) });
    await supabase.from('home_widgets').delete().eq('id', id);
  },
}));
