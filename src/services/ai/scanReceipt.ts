import { supabase } from '../api/supabaseClient';
import type { RecognizedReceipt } from '../../types/receipt';

type ScanReceiptResult =
  | { data: RecognizedReceipt; error: null }
  | { data: null; error: string };

export async function scanReceipt(imageBase64: string, mimeType: string): Promise<ScanReceiptResult> {
  const { data, error } = await supabase.functions.invoke<{ result?: RecognizedReceipt; error?: string }>(
    'scan-receipt',
    { body: { imageBase64, mimeType } },
  );

  if (error) {
    return { data: null, error: error.message ?? 'Не удалось обработать чек' };
  }
  if (!data?.result) {
    return { data: null, error: data?.error ?? 'Не удалось обработать чек' };
  }

  return { data: data.result, error: null };
}
