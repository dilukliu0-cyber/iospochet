-- Семейный аккаунт: семья, участники, инвайты по внутреннему ID.
-- allowed_categories: null = участник делится всеми категориями,
-- иначе — только перечисленными (фильтрует видимость его чеков/позиций).

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Моя семья',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  allowed_categories text[],
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  allowed_categories text[],
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

-- security definer: обход RLS для "мои семьи", иначе политики family_members
-- рекурсивно ссылались бы сами на себя.
create or replace function public.my_family_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select family_id from public.family_members where user_id = auth.uid();
$$;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;

drop policy if exists "families_select" on public.families;
create policy "families_select"
  on public.families for select
  using (owner_id = auth.uid() or id in (select public.my_family_ids()));

drop policy if exists "families_insert" on public.families;
create policy "families_insert"
  on public.families for insert
  with check (owner_id = auth.uid());

drop policy if exists "families_delete" on public.families;
create policy "families_delete"
  on public.families for delete
  using (owner_id = auth.uid());

drop policy if exists "family_members_select" on public.family_members;
create policy "family_members_select"
  on public.family_members for select
  using (user_id = auth.uid() or family_id in (select public.my_family_ids()));

-- Вступить можно только самому: либо ты владелец семьи, либо у тебя принятый инвайт.
drop policy if exists "family_members_insert" on public.family_members;
create policy "family_members_insert"
  on public.family_members for insert
  with check (
    user_id = auth.uid()
    and (
      exists (select 1 from public.families f where f.id = family_id and f.owner_id = auth.uid())
      or exists (
        select 1 from public.family_invites i
        where i.family_id = family_members.family_id
          and i.invitee_id = auth.uid()
          and i.status = 'accepted'
      )
    )
  );

drop policy if exists "family_members_update" on public.family_members;
create policy "family_members_update"
  on public.family_members for update
  using (user_id = auth.uid());

drop policy if exists "family_members_delete" on public.family_members;
create policy "family_members_delete"
  on public.family_members for delete
  using (
    user_id = auth.uid()
    or exists (select 1 from public.families f where f.id = family_id and f.owner_id = auth.uid())
  );

drop policy if exists "family_invites_select" on public.family_invites;
create policy "family_invites_select"
  on public.family_invites for select
  using (inviter_id = auth.uid() or invitee_id = auth.uid());

drop policy if exists "family_invites_insert" on public.family_invites;
create policy "family_invites_insert"
  on public.family_invites for insert
  with check (inviter_id = auth.uid() and family_id in (select public.my_family_ids()));

drop policy if exists "family_invites_update" on public.family_invites;
create policy "family_invites_update"
  on public.family_invites for update
  using (invitee_id = auth.uid());

-- Чеки членов семьи видны (с учётом их фильтра категорий).
drop policy if exists "receipts_family_select" on public.receipts;
create policy "receipts_family_select"
  on public.receipts for select
  using (
    exists (
      select 1 from public.family_members them
      where them.user_id = receipts.user_id
        and them.user_id <> auth.uid()
        and them.family_id in (select public.my_family_ids())
        and (
          them.allowed_categories is null
          or exists (
            select 1 from public.receipt_items ri
            where ri.receipt_id = receipts.id
              and ri.category_name = any (them.allowed_categories)
          )
        )
    )
  );

drop policy if exists "receipt_items_family_select" on public.receipt_items;
create policy "receipt_items_family_select"
  on public.receipt_items for select
  using (
    exists (
      select 1 from public.family_members them
      where them.user_id = receipt_items.user_id
        and them.user_id <> auth.uid()
        and them.family_id in (select public.my_family_ids())
        and (
          them.allowed_categories is null
          or receipt_items.category_name = any (them.allowed_categories)
        )
    )
  );

-- Ник и аватарка членов семьи (для подписи "кто потратил").
drop policy if exists "user_settings_family_select" on public.user_settings;
create policy "user_settings_family_select"
  on public.user_settings for select
  using (
    exists (
      select 1 from public.family_members fm
      where fm.user_id = user_settings.user_id
        and fm.family_id in (select public.my_family_ids())
    )
  );
