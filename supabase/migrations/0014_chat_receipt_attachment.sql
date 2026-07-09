-- Прикрепление конкретного чека к вопросу в ИИ-чате.
-- receipt_label — денормализованный снимок ("TESCO · 149.50 CZK") для истории,
-- переживает удаление самого чека (receipt_id тогда просто обнулится).

alter table public.ai_messages
  add column if not exists receipt_id uuid references public.receipts(id) on delete set null,
  add column if not exists receipt_label text;
