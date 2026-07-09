import { supabase } from '../api/supabaseClient';

// §24: раз в 2 дня — реальный ИИ-разбор трат вместо сообщения после каждого
// чека. Само решение "пора или нет" принимает Edge Function (last_ai_digest_at
// в user_settings), поэтому клиенту достаточно дергать это при каждом
// открытии Главной — лишнего вызова ИИ не случится.
export function checkAiDigest(): void {
  supabase.functions.invoke('ai-digest', { body: {} }).catch(() => {});
}
