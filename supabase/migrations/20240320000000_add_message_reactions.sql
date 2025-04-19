-- Create message_reactions table
create table if not exists public.message_reactions (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references public.chat_messages(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  reaction text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(message_id, user_id, reaction)
);

-- Enable RLS
alter table public.message_reactions enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view reactions for messages they can see" on public.message_reactions;
drop policy if exists "Users can add reactions to messages they can see" on public.message_reactions;
drop policy if exists "Users can remove their own reactions" on public.message_reactions;

-- Create policies
create policy "Users can view reactions for messages they can see"
  on public.message_reactions for select
  using (
    exists (
      select 1 from public.chat_messages
      where id = message_reactions.message_id
      and exists (
        select 1 from public.chat_participants
        where room_id = chat_messages.room_id
        and user_id = auth.uid()
      )
    )
  );

create policy "Users can add reactions to messages they can see"
  on public.message_reactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.chat_messages
      where id = message_reactions.message_id
      and exists (
        select 1 from public.chat_participants
        where room_id = chat_messages.room_id
        and user_id = auth.uid()
      )
    )
  );

create policy "Users can remove their own reactions"
  on public.message_reactions for delete
  using (
    auth.uid() = user_id
  );

-- Create index for better performance
create index if not exists message_reactions_message_id_idx
  on public.message_reactions(message_id);

-- Create index for better performance
create index if not exists message_reactions_user_id_idx
  on public.message_reactions(user_id);

-- Create function to clean up old reactions
create or replace function public.clean_old_reactions()
returns trigger as $$
begin
  delete from public.message_reactions
  where created_at < now() - interval '30 days';
  return null;
end;
$$ language plpgsql security definer;

-- Create trigger to clean up old reactions
create trigger clean_old_reactions_trigger
  after insert on public.message_reactions
  execute function public.clean_old_reactions(); 