import { supabase } from '../api/supabaseClient';
import type { RecognizedReceipt } from '../../types/receipt';

type ScanReceiptResult =
  | { data: RecognizedReceipt; error: null }
  | { data: null; error: string };

export async function scanReceipt(
  imageBase64: string,
  mimeType: string,
  options?: { language?: string; translateItems?: boolean },
): Promise<ScanReceiptResult> {
  const { data, error } = await supabase.functions.invoke<{ result?: RecognizedReceipt; error?: string }>(
    'scan-receipt',
    { body: { imageBase64, mimeType, language: options?.language, translateItems: options?.translateItems } },
  );

  if (error) {
    return { data: null, error: error.message ?? 'Не удалось обработать чек' };
  }
  if (!data?.result) {
    return { data: null, error: data?.error ?? 'Не удалось обработать чек' };
  }

  return { data: data.result, error: null };
}
