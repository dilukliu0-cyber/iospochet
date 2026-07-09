-- Умный список покупок, базовая MVP-версия (§29, §36 п.14):
-- только ручной режим + автоотметка после сканирования чека, без предсказаний.
create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Мой список',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shopping_lists enable row level security;

drop policy if exists "shopping_lists_all" on public.shopping_lists;
create policy "shopping_lists_all"
  on public.shopping_lists for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shopping_list_items enable row level security;

drop policy if exists "shopping_list_items_all" on public.shopping_list_items;
create policy "shopping_list_items_all"
  on public.shopping_list_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
