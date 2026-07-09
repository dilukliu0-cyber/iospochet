import { create } from 'zustand';
import { supabase } from '../services/api/supabaseClient';
import type { ShoppingListItem } from '../types/shoppingList';

type ShoppingListState = {
  listId: string | null;
  items: ShoppingListItem[];
  isLoading: boolean;
  init: (userId: string) => Promise<void>;
  addItem: (text: string) => Promise<void>;
  toggleItem: (id: string, checked: boolean) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
};

export const useShoppingListStore = create<ShoppingListState>((set, get) => ({
  listId: null,
  items: [],
  isLoading: false,

  init: async (userId) => {
    set({ isLoading: true });

    let { data: list } = await supabase
      .from('shopping_lists')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (!list) {
      const { data: created, error } = await supabase
        .from('shopping_lists')
        .insert({ user_id: userId })
        .select('id')
        .single();
      if (error) {
        console.error('Не удалось создать список покупок', error);
        set({ isLoading: false });
        return;
      }
      list = created;
    }

    const { data: items, error: itemsError } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('list_id', list!.id)
      .order('created_at');

    if (itemsError) {
      console.error('Не удалось загрузить товары списка покупок', itemsError);
    }

    set({ listId: list!.id, items: items ?? [], isLoading: false });
  },

  addItem: async (text) => {
    const { listId } = get();
    if (!listId || !text.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('shopping_list_items')
      .insert({ list_id: listId, user_id: user.id, text: text.trim() })
      .select()
      .single();

    if (error) {
      console.error('Не удалось добавить товар', error);
      return;
    }
    set({ items: [...get().items, data] });
  },

  toggleItem: async (id, checked) => {
    set({ items: get().items.map((item) => (item.id === id ? { ...item, checked } : item)) });
    const { error } = await supabase.from('shopping_list_items').update({ checked }).eq('id', id);
    if (error) console.error('Не удалось обновить товар', error);
  },

  deleteItem: async (id) => {
    set({ items: get().items.filter((item) => item.id !== id) });
    const { error } = await supabase.from('shopping_list_items').delete().eq('id', id);
    if (error) console.error('Не удалось удалить товар', error);
  },
}));
