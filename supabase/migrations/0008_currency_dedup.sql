-- Мультивалютность (§14.1) и дедупликация чеков (§28.1).
alter table public.receipts
  add column if not exists exchange_rate numeric(12, 6) not null default 1,
  add column if not exists base_currency text,
  add column if not exists receipt_hash text;

create index if not exists receipts_hash_idx on public.receipts (user_id, receipt_hash);
