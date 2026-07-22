-- Push-уведомления: Expo push token устройства пользователя.
-- Записывается клиентом при входе, используется Edge Function'ами
-- (ai-digest и т.д.) для отправки push через Expo Push API.
alter table public.user_settings
  add column if not exists push_token text;
