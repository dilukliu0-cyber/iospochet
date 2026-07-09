-- AI Finance Assistant — чеки, позиции чека, учёт стоимости AI (§10)
-- Упрощения относительно полной схемы документа (сознательно, для MVP):
--   * нет отдельных таблиц stores/products — название магазина и категория
--     хранятся текстом прямо в receipts/receipt_items (сопоставление товаров
--     между чеками §21.1 — отдельная post-MVP задача);
--   * нет мультивалютной конвертации (§14.1 exchange_rate) — храним только
--     валюту и сумму чека как есть;
--   * нет receipt_hash дедупликации (§28.1) — тоже последующий шаг.

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_path text not null,
  store_name text,
  store_address text,
  purchase_date date,
  purchase_time time,
  currency text not null,
  total_amount numeric(12, 2),
  payment_method text,
  status text not null default 'processing' check (status in ('processing', 'recognized', 'needs_review', 'error')),
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.receipts enable row level security;

drop policy if exists "receipts_all" on public.receipts;
create policy "receipts_all"
  on public.receipts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_name text,
  cleaned_name text not null,
  brand text,
  category_name text not null default 'Другое',
  price numeric(12, 2) not null default 0,
  quantity numeric(12, 3) not null default 1,
  unit text not null default 'pcs',
  weight_value numeric(12, 3),
  weight_unit text,
  unit_price numeric(12, 2),
  confidence numeric(3, 2),
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.receipt_items enable row level security;

drop policy if exists "receipt_items_all" on public.receipt_items;
create policy "receipt_items_all"
  on public.receipt_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Учёт стоимости AI-вызовов (§2.1, §39.17 — без исключений для любого вызова AI)
create table if not exists public.ai_api_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  receipt_id uuid references public.receipts(id) on delete set null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ai_api_usage enable row level security;

drop policy if exists "ai_api_usage_select" on public.ai_api_usage;
create policy "ai_api_usage_select"
  on public.ai_api_usage for select
  using (user_id = auth.uid());

-- Записи сюда пишет только Edge Function через service role (в обход RLS),
-- поэтому insert-политика для обычных пользователей не нужна.

-- Приватное хранилище фото чеков (§34 — приватные bucket'ы с RLS)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "receipts_storage_rw" on storage.objects;
create policy "receipts_storage_rw"
  on storage.objects for all
  using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
