-- Лимиты по категориям (§26). Период всегда месячный на MVP — недельные/
-- семейные лимиты (§37 этап 15 вопросы) осознанно оставлены на потом.
create table if not exists public.limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_name text not null,
  amount numeric(12, 2) not null,
  currency text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_name)
);

alter table public.limits enable row level security;

drop policy if exists "limits_all" on public.limits;
create policy "limits_all"
  on public.limits for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
