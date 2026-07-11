-- Доходы для личного кошелька (§ пожелание: баланс = доходы − расходы,
-- вводится вручную на Главной, отображается во флип-кнопке "кошелёк" в Расходах).

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.incomes enable row level security;

drop policy if exists "incomes_all" on public.incomes;
create policy "incomes_all"
  on public.incomes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
