-- Create table to store edit history for report comments
create table if not exists public.report_comment_edits (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.report_comments(id) on delete cascade,
  previous_comment text not null,
  created_at timestamptz not null default now()
);

-- Helpful index for lookups by comment
create index if not exists idx_report_comment_edits_comment_id_created_at
  on public.report_comment_edits (comment_id, created_at desc);

-- Enable RLS and add permissive policies mirroring report_comments
alter table public.report_comment_edits enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'report_comment_edits' and policyname = 'Allow read to authenticated'
  ) then
    create policy "Allow read to authenticated" on public.report_comment_edits
      for select using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'report_comment_edits' and policyname = 'Allow insert by service or triggers'
  ) then
    create policy "Allow insert by service or triggers" on public.report_comment_edits
      for insert with check (auth.uid() is not null);
  end if;
end$$;


