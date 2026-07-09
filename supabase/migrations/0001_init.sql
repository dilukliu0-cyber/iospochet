-- AI Finance Assistant — initial schema (onboarding scope)
-- Соответствует §10 master-документа. Для MVP таблицы USERS/USER_SETTINGS
-- объединены в одну user_settings (личность пользователя уже есть в auth.users).

-- 1. Категории (§11) -----------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "categories_select" on public.categories;
create policy "categories_select"
  on public.categories for select
  using (is_default = true or user_id = auth.uid());

drop policy if exists "categories_insert" on public.categories;
create policy "categories_insert"
  on public.categories for insert
  with check (user_id = auth.uid());

drop policy if exists "categories_update" on public.categories;
create policy "categories_update"
  on public.categories for update
  using (user_id = auth.uid());

drop policy if exists "categories_delete" on public.categories;
create policy "categories_delete"
  on public.categories for delete
  using (user_id = auth.uid());

insert into public.categories (name, icon, color, is_default)
select * from (values
  ('Продукты', 'shopping-cart', '#34D399', true),
  ('Снеки', 'cookie', '#F59E0B', true),
  ('Напитки', 'cup-soda', '#38BDF8', true),
  ('Кофе', 'coffee', '#A78BFA', true),
  ('Кафе и рестораны', 'utensils', '#FB7185', true),
  ('Доставка еды', 'bike', '#FBBF24', true),
  ('Транспорт', 'car', '#60A5FA', true),
  ('Дом', 'home', '#4ADE80', true),
  ('Гигиена', 'droplet', '#22D3EE', true),
  ('Одежда', 'shirt', '#F472B6', true),
  ('Подписки', 'credit-card', '#818CF8', true),
  ('Развлечения', 'gamepad-2', '#C084FC', true),
  ('Здоровье', 'heart-pulse', '#F87171', true),
  ('Питомцы', 'paw-print', '#FCD34D', true),
  ('Другое', 'ellipsis', '#9CA3AF', true)
) as seed(name, icon, color, is_default)
where not exists (select 1 from public.categories where is_default = true);

-- 2. Настройки пользователя (§10 USERS + USER_SETTINGS, объединено) ------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'ru',
  currency text not null default 'CZK',
  region text,
  notifications_enabled boolean not null default true,
  ai_tips_enabled boolean not null default true,
  theme text not null default 'dark',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select" on public.user_settings;
create policy "user_settings_select"
  on public.user_settings for select
  using (user_id = auth.uid());

drop policy if exists "user_settings_insert" on public.user_settings;
create policy "user_settings_insert"
  on public.user_settings for insert
  with check (user_id = auth.uid());

drop policy if exists "user_settings_update" on public.user_settings;
create policy "user_settings_update"
  on public.user_settings for update
  using (user_id = auth.uid());

-- 3. Автосоздание строки настроек при регистрации ------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Для уже существующих пользователей (например, вашего тестового аккаунта),
-- у которых триггер ещё не сработал:
insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;
