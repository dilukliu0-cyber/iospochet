-- Живое ИИ-сообщение в «Умном» списке покупок (кэш, чтобы не звать Gemini
-- на каждое открытие вкладки — раз в INSIGHT_INTERVAL, см. Edge Function).

create table if not exists public.shopping_insights (
  user_id uuid primary key references auth.users(id) on delete cascade,
  message text,
  created_at timestamptz not null default now()
);

alter table public.shopping_insights enable row level security;

drop policy if exists "shopping_insights_select" on public.shopping_insights;
create policy "shopping_insights_select"
  on public.shopping_insights for select
  using (user_id = auth.uid());

-- Пишет только Edge Function через service role (в обход RLS).
