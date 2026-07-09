export type ReceiptStatus = 'processing' | 'recognized' | 'needs_review' | 'error';

export type ReceiptRecord = {
  id: string;
  user_id: string;
  image_path: string | null;
  source: 'scan' | 'manual';
  store_name: string | null;
  store_address: string | null;
  purchase_date: string | null;
  purchase_time: string | null;
  currency: string;
  total_amount: number | null;
  payment_method: string | null;
  status: ReceiptStatus;
  warnings: string[];
  exchange_rate: number | null;
  base_currency: string | null;
  receipt_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type ReceiptItemRecord = {
  id: string;
  receipt_id: string;
  user_id: string;
  raw_name: string | null;
  cleaned_name: string;
  brand: string | null;
  category_name: string;
  price: number;
  quantity: number;
  unit: string;
  weight_value: number | null;
  weight_unit: string | null;
  unit_price: number | null;
  confidence: number | null;
  needs_review: boolean;
  created_at: string;
};
