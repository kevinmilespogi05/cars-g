-- Drop existing policies
drop policy if exists "Users can view reactions for messages they can see" on public.message_reactions;
drop policy if exists "Users can add reactions to messages they can see" on public.message_reactions;
drop policy if exists "Users can remove their own reactions" on public.message_reactions;

-- Create updated policies
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

-- Add a policy for updating reactions
create policy "Users can update their own reactions"
  on public.message_reactions for update
  using (
    auth.uid() = user_id
  )
  with check (
    auth.uid() = user_id
  ); 