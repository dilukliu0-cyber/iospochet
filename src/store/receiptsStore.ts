import { create } from 'zustand';
import { supabase } from '../services/api/supabaseClient';
import type { ReceiptRecord } from '../types/receiptRecord';

export type OwnerProfile = { user_id: string; nickname: string | null; avatar_path: string | null; updated_at: string };

type ReceiptsState = {
  receipts: ReceiptRecord[];
  // Профили владельцев чужих (семейных) чеков — для пометки "кто потратил".
  ownerProfiles: Record<string, OwnerProfile>;
  isLoading: boolean;
  fetch: (userId: string) => Promise<void>;
  reset: () => void;
};

export const useReceiptsStore = create<ReceiptsState>((set) => ({
  receipts: [],
  ownerProfiles: {},
  isLoading: false,

  fetch: async (userId) => {
    set({ isLoading: true });
    // Без фильтра по user_id: RLS вернёт свои чеки + чеки членов семьи
    // (с учётом их настроек категорий).
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Не удалось загрузить чеки', error);
      set({ isLoading: false });
      return;
    }

    const receipts = data ?? [];
    const foreignIds = [...new Set(receipts.map((r) => r.user_id).filter((id) => id !== userId))];
    let ownerProfiles: Record<string, OwnerProfile> = {};
    if (foreignIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('user_settings')
        .select('user_id, nickname, avatar_path, updated_at')
        .in('user_id', foreignIds);
      (profileRows ?? []).forEach((p) => (ownerProfiles[p.user_id] = p));
    }

    set({ receipts, ownerProfiles, isLoading: false });
  },

  reset: () => set({ receipts: [], ownerProfiles: {}, isLoading: false }),
}));
