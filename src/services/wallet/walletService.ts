import { supabase } from '../api/supabaseClient';
import type { IncomeRecord } from '../../types/income';

export async function addIncome(
  userId: string,
  amount: number,
  currency: string,
  note: string,
): Promise<string | null> {
  const { error } = await supabase.from('incomes').insert({
    user_id: userId,
    amount,
    currency,
    note: note.trim() || null,
  });
  return error?.message ?? null;
}

export async function fetchIncomes(userId: string): Promise<IncomeRecord[]> {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Не удалось загрузить доходы', error);
    return [];
  }
  return data ?? [];
}

// Баланс — только свои деньги (не семейные): доходы минус расходы, приведённые
// к основной валюте пользователя тем же курсом, что и остальная аналитика.
export async function fetchWalletBalance(
  userId: string,
): Promise<{ balance: number; totalIncome: number; totalExpense: number; currency: string }> {
  const [{ data: incomes }, { data: receipts }] = await Promise.all([
    supabase.from('incomes').select('amount, currency').eq('user_id', userId),
    supabase.from('receipts').select('total_amount, exchange_rate, base_currency, currency').eq('user_id', userId),
  ]);

  const totalIncome = (incomes ?? []).reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = (receipts ?? []).reduce(
    (sum, r) => sum + (r.total_amount ?? 0) * (r.exchange_rate ?? 1),
    0,
  );
  const currency = incomes?.[0]?.currency ?? receipts?.[0]?.base_currency ?? receipts?.[0]?.currency ?? '';

  return { balance: totalIncome - totalExpense, totalIncome, totalExpense, currency };
}

export async function deleteIncome(id: string): Promise<string | null> {
  const { error } = await supabase.from('incomes').delete().eq('id', id);
  return error?.message ?? null;
}
