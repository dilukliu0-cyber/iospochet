-- Вид диаграммы в Расходах (кольцо/столбцы) + шаблоны списков покупок.

alter table public.user_settings
  add column if not exists chart_style text not null default 'donut'
  check (chart_style in ('donut', 'bars'));

create table if not exists public.shopping_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.shopping_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.shopping_templates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.shopping_templates enable row level security;
alter table public.shopping_template_items enable row level security;

drop policy if exists "shopping_templates_all" on public.shopping_templates;
create policy "shopping_templates_all"
  on public.shopping_templates for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "shopping_template_items_all" on public.shopping_template_items;
create policy "shopping_template_items_all"
  on public.shopping_template_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
