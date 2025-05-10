-- Create comments table
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references public.reports(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Add foreign key to profiles table
  constraint fk_user_profile foreign key (user_id) references public.profiles(id) on delete cascade
);

-- Drop existing policies if they exist
drop policy if exists "Comments are viewable by everyone" on public.comments;
drop policy if exists "Users can insert their own comments" on public.comments;
drop policy if exists "Users can update their own comments" on public.comments;
drop policy if exists "Users can delete their own comments" on public.comments;

-- Add RLS policies
alter table public.comments enable row level security;

-- Allow anyone to read comments
create policy "Comments are viewable by everyone"
  on public.comments for select
  using (true);

-- Allow authenticated users to insert their own comments
create policy "Users can insert their own comments"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Allow users to update their own comments
create policy "Users can update their own comments"
  on public.comments for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow users to delete their own comments
create policy "Users can delete their own comments"
  on public.comments for delete
  to authenticated
  using (auth.uid() = user_id);

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop existing trigger if it exists
drop trigger if exists handle_comments_updated_at on public.comments;

-- Create trigger to automatically update updated_at
create trigger handle_comments_updated_at
  before update on public.comments
  for each row
  execute function public.handle_updated_at();