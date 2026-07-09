import { create } from 'zustand';
import { sendChatMessage } from '../services/ai/chatService';
import { supabase } from '../services/api/supabaseClient';
import type { ChatMessage } from '../types/chatMessage';

type ChatState = {
  messages: ChatMessage[];
  isLoadingHistory: boolean;
  isSending: boolean;
  error: string | null;
  fetchHistory: (userId: string) => Promise<void>;
  sendMessage: (userId: string, text: string, receiptId?: string | null, receiptLabel?: string | null) => Promise<void>;
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoadingHistory: false,
  isSending: false,
  error: null,

  fetchHistory: async (userId) => {
    set({ isLoadingHistory: true });
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Не удалось загрузить историю чата', error);
      set({ isLoadingHistory: false });
      return;
    }
    set({ messages: data ?? [], isLoadingHistory: false });
  },

  sendMessage: async (userId, text, receiptId, receiptLabel) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: userId,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
      receipt_id: receiptId ?? null,
      receipt_label: receiptLabel ?? null,
    };

    set({ messages: [...get().messages, optimisticMessage], isSending: true, error: null });

    const { reply, error } = await sendChatMessage(trimmed, receiptId, receiptLabel);

    if (error || !reply) {
      set({ isSending: false, error: error ?? 'Не удалось получить ответ' });
      return;
    }

    set({ messages: [...get().messages, reply], isSending: false });
  },
}));
