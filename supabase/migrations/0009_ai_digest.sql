-- Периодический ИИ-анализ вместо сообщения после каждого чека.
-- last_ai_digest_at хранит момент последнего разбора трат; ai-digest
-- (Edge Function) сверяется с ним и запускает Gemini не чаще, чем раз в 2 дня.

alter table public.user_settings
  add column if not exists last_ai_digest_at timestamptz;
