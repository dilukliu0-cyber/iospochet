import { decode } from 'base64-arraybuffer';
import { supabase } from '../api/supabaseClient';
import { scanReceipt } from '../ai/scanReceipt';
import { useToastStore } from '../../store/toastStore';
import type { RecognizedReceipt } from '../../types/receipt';
import { autoCheckShoppingList } from './receiptsService';

// §13 (пожелание): фото не блокирует пользователя. Чек создаётся сразу со
// статусом processing, Gemini работает в фоне, строка в «Расходах» обновится
// сама при следующем фокусе экрана.

type SubmitResult = { receiptId: string | null; error: string | null };

export async function submitScan(
  userId: string,
  imageBase64: string,
  baseCurrency: string,
): Promise<SubmitResult> {
  const imagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(imagePath, decode(imageBase64), { contentType: 'image/jpeg' });

  if (uploadError) {
    return { receiptId: null, error: uploadError.message };
  }

  const { data: receipt, error: insertError } = await supabase
    .from('receipts')
    .insert({
      user_id: userId,
      image_path: imagePath,
      currency: baseCurrency,
      status: 'processing',
      warnings: [],
      base_currency: baseCurrency,
      exchange_rate: 1,
    })
    .select('id')
    .single();

  if (insertError || !receipt) {
    return { receiptId: null, error: insertError?.message ?? 'Не удалось создать чек' };
  }

  // Фон: не await'ится вызывающим — ошибки переводят чек в статус error.
  processInBackground(receipt.id, userId, imageBase64, baseCurrency).catch(async () => {
    await supabase
      .from('receipts')
      .update({ status: 'error', warnings: ['Не удалось распознать чек. Удалите его и отсканируйте заново.'] })
      .eq('id', receipt.id);
  });

  return { receiptId: receipt.id, error: null };
}

async function processInBackground(
  receiptId: string,
  userId: string,
  imageBase64: string,
  baseCurrency: string,
): Promise<void> {
  const { data: recognized, error } = await scanReceipt(imageBase64, 'image/jpeg');
  if (error || !recognized) {
    throw new Error(error ?? 'empty result');
  }

  const status = recognized.items.some((item) => item.needsReview) ? 'needs_review' : 'recognized';
  const warnings = [...recognized.warnings];

  let rate: number | null = 1;
  if (recognized.currency !== baseCurrency) {
    rate = await fetchRate(recognized.currency, baseCurrency);
    if (rate === null) {
      warnings.push('Курс валют недоступен — суммы в аналитике посчитаны без конвертации.');
    }
  }

  const { error: updateError } = await supabase
    .from('receipts')
    .update({
      store_name: recognized.storeName,
      store_address: recognized.storeAddress,
      purchase_date: recognized.purchaseDate,
      purchase_time: recognized.purchaseTime,
      currency: recognized.currency,
      total_amount: recognized.totalAmount,
      payment_method: recognized.paymentMethod,
      status,
      warnings,
      exchange_rate: rate ?? 1,
      receipt_hash: computeHash(recognized),
    })
    .eq('id', receiptId);

  if (updateError) throw new Error(updateError.message);

  const itemsPayload = recognized.items.map((item) => ({
    receipt_id: receiptId,
    user_id: userId,
    raw_name: item.rawName,
    cleaned_name: item.cleanedName,
    brand: item.brand,
    category_name: item.category,
    price: item.price,
    quantity: item.quantity,
    unit: item.unit,
    weight_value: item.weightValue,
    weight_unit: item.weightUnit,
    unit_price: item.unitPrice,
    confidence: item.confidence,
    needs_review: item.needsReview,
  }));

  if (itemsPayload.length > 0) {
    const { error: itemsError } = await supabase.from('receipt_items').insert(itemsPayload);
    if (itemsError) throw new Error(itemsError.message);
  }

  const checked = await autoCheckShoppingList(userId, recognized.items);
  const show = useToastStore.getState().show;
  if (checked > 0) {
    const word = checked === 1 ? 'товар' : checked < 5 ? 'товара' : 'товаров';
    show(`Чек «${recognized.storeName ?? ''}» распознан. Список покупок: отмечено ${checked} ${word}`);
  } else {
    show(`Чек${recognized.storeName ? ` «${recognized.storeName}»` : ''} распознан`);
  }
}

async function fetchRate(from: string, to: string): Promise<number | null> {
  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`);
    if (!response.ok) return null;
    const data = await response.json();
    const rate = data?.rates?.[to];
    return typeof rate === 'number' && Number.isFinite(rate) ? rate : null;
  } catch {
    return null;
  }
}

function computeHash(recognized: RecognizedReceipt): string {
  const parts = [
    (recognized.storeName ?? '').toLowerCase().trim(),
    recognized.purchaseDate ?? '',
    recognized.purchaseTime ?? '',
    recognized.totalAmount.toFixed(2),
    String(recognized.items.length),
    ...recognized.items.slice(0, 3).map((i) => i.cleanedName.toLowerCase().trim()),
  ].join('|');

  let hash = 5381;
  for (let i = 0; i < parts.length; i++) {
    hash = ((hash << 5) + hash + parts.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
}
