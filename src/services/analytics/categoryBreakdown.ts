import { supabase } from '../api/supabaseClient';

export type CategoryBreakdownEntry = {
  categoryName: string;
  total: number;
  count: number;
  percent: number;
};

type ItemWithReceipt = {
  price: number;
  category_name: string;
  receipt: {
    purchase_date: string | null;
    created_at: string;
    currency: string;
    exchange_rate: number | null;
    base_currency: string | null;
  } | null;
};

function isSameMonth(dateStr: string | null, createdAt: string, now: Date) {
  const d = dateStr ? new Date(dateStr) : new Date(createdAt);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export async function fetchMonthlyCategoryBreakdown(
  userId: string,
  targetDate: Date = new Date(),
  // §пожелание: диаграмма должна совпадать со списком чеков — тот тоже
  // включает семью через RLS. По умолчанию — только свои (Главная, Лимиты).
  includeFamily = false,
): Promise<{ entries: CategoryBreakdownEntry[]; currency: string }> {
  let query = supabase
    .from('receipt_items')
    .select('price, category_name, receipt:receipts(purchase_date, created_at, currency, exchange_rate, base_currency)');
  if (!includeFamily) query = query.eq('user_id', userId);
  const { data, error } = await query;

  if (error || !data) {
    console.error('Не удалось загрузить товары для разбивки по категориям', error);
    return { entries: [], currency: '' };
  }

  const items = (data as unknown as ItemWithReceipt[]).filter(
    (item) => item.receipt && isSameMonth(item.receipt.purchase_date, item.receipt.created_at, targetDate),
  );

  // §14.1: суммы приводятся к базовой валюте пользователя по курсу чека.
  const currency = items[0]?.receipt?.base_currency ?? items[0]?.receipt?.currency ?? '';
  const totalsByCategory = new Map<string, { total: number; count: number }>();

  for (const item of items) {
    const existing = totalsByCategory.get(item.category_name) ?? { total: 0, count: 0 };
    existing.total += item.price * (item.receipt?.exchange_rate ?? 1);
    existing.count += 1;
    totalsByCategory.set(item.category_name, existing);
  }

  const grandTotal = [...totalsByCategory.values()].reduce((sum, v) => sum + v.total, 0);

  const entries = [...totalsByCategory.entries()]
    .map(([categoryName, { total, count }]) => ({
      categoryName,
      total,
      count,
      percent: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return { entries, currency };
}

// Средняя трата по категории за месяц (по фактическим месяцам с покупками) —
// подсказка суммы при создании лимита, чтобы не гадать с цифрой.
export async function fetchCategoryMonthlyAverage(
  userId: string,
  categoryName: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('receipt_items')
    .select('price, receipt:receipts(purchase_date, created_at, exchange_rate)')
    .eq('user_id', userId)
    .eq('category_name', categoryName);

  if (error || !data || data.length === 0) return null;

  const totalsByMonth = new Map<string, number>();
  for (const item of data as unknown as ItemWithReceipt[]) {
    const dateStr = item.receipt?.purchase_date ?? item.receipt?.created_at;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const amount = item.price * (item.receipt?.exchange_rate ?? 1);
    totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + amount);
  }

  if (totalsByMonth.size === 0) return null;
  const sum = [...totalsByMonth.values()].reduce((a, b) => a + b, 0);
  return sum / totalsByMonth.size;
}
