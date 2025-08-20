-- Create notifications table if not exists
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  read boolean not null default false,
  link text,
  created_at timestamptz not null default now()
);

-- Basic RLS for notifications
alter table public.notifications enable row level security;
do $$ begin
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can read own notifications';
  if not found then
    create policy "Users can read own notifications" on public.notifications for select using (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can insert own notifications';
  if not found then
    create policy "Users can insert own notifications" on public.notifications for insert with check (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can update own notifications';
  if not found then
    create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);
  end if;
end $$;

-- Create push_subscriptions table
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'web',
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
do $$ begin
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'Users manage own subscriptions';
  if not found then
    create policy "Users manage own subscriptions" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Helper function to ensure table exists for backend upsert
create or replace function public.ensure_push_subscriptions_table()
returns void
language plpgsql
security definer
as $$
begin
  -- No-op, function existence is enough to allow calling from service role
  return;
end;
$$;

grant execute on function public.ensure_push_subscriptions_table() to service_role;


