import { supabase } from '../api/supabaseClient';

const cache = new Map<string, string>();

export async function getReceiptImageUrl(imagePath: string | null): Promise<string | null> {
  if (!imagePath) return null;
  const cached = cache.get(imagePath);
  if (cached) return cached;

  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(imagePath, 3600);
  if (error || !data) return null;

  cache.set(imagePath, data.signedUrl);
  return data.signedUrl;
}
