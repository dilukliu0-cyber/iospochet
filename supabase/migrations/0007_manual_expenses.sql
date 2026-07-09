-- Ручное добавление расхода (§16) — у таких чеков нет фото.
alter table public.receipts alter column image_path drop not null;

alter table public.receipts
  add column if not exists source text not null default 'scan' check (source in ('scan', 'manual'));
