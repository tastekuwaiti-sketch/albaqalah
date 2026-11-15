-- Naqwah Pay demo top-ups: users can only read and add their own rows.
-- Enable anonymous sign-ins under Supabase Authentication before testing.

create table if not exists public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0 and amount <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists wallet_topups_user_created_idx
  on public.wallet_topups (user_id, created_at desc);

alter table public.wallet_topups enable row level security;

revoke all on table public.wallet_topups from anon, public;
grant select, insert on table public.wallet_topups to authenticated;

drop policy if exists "Read own wallet top-ups" on public.wallet_topups;
create policy "Read own wallet top-ups"
  on public.wallet_topups
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Add own wallet top-ups" on public.wallet_topups;
create policy "Add own wallet top-ups"
  on public.wallet_topups
  for insert
  to authenticated
  with check (auth.uid() = user_id);
