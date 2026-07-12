-- Вид диаграммы на Главной: динамика (линия) / по дням (столбцы).
alter table public.user_settings
  add column if not exists home_chart text not null default 'line'
  check (home_chart in ('line', 'daily'));
