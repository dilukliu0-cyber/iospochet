-- Виджеты на Главной, которые пользователь добавляет сам (диаграмма/закреплённый лимит).
create table if not exists public.home_widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('category_chart', 'pinned_limit')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.home_widgets enable row level security;

drop policy if exists "home_widgets_all" on public.home_widgets;
create policy "home_widgets_all"
  on public.home_widgets for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
