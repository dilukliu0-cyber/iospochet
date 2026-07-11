export type IncomeRecord = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  note: string | null;
  created_at: string;
};
