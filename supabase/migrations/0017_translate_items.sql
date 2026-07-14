-- Переводить названия товаров на язык интерфейса при сканировании чека.
alter table public.user_settings
  add column if not exists translate_items boolean not null default false;
