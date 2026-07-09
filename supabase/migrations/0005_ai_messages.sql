-- История ИИ-чата (§10, §23).
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_messages enable row level security;

drop policy if exists "ai_messages_all" on public.ai_messages;
create policy "ai_messages_all"
  on public.ai_messages for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
