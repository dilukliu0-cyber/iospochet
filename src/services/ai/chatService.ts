import { supabase } from '../api/supabaseClient';
import type { ChatMessage } from '../../types/chatMessage';

type SendChatMessageResult = { reply: ChatMessage; error: null } | { reply: null; error: string };

export async function sendChatMessage(
  message: string,
  receiptId?: string | null,
  receiptLabel?: string | null,
): Promise<SendChatMessageResult> {
  const { data, error } = await supabase.functions.invoke<{ reply?: ChatMessage; error?: string }>('ai-chat', {
    body: { message, receiptId: receiptId ?? null, receiptLabel: receiptLabel ?? null },
  });

  if (error) {
    return { reply: null, error: error.message ?? 'Не удалось получить ответ' };
  }
  if (!data?.reply) {
    return { reply: null, error: data?.error ?? 'Не удалось получить ответ' };
  }

  return { reply: data.reply, error: null };
}
