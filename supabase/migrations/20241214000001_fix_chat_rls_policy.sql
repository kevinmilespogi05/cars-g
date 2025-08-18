-- Fix the broken RLS policy for chat_messages table
-- The original policy was missing proper syntax for INSERT operation

-- First, drop the existing broken policy
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON chat_messages;

-- Create the correct policy with proper syntax
CREATE POLICY "Users can send messages in their conversations" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE id = conversation_id 
      AND auth.uid() IN (participant1_id, participant2_id)
    )
  );

-- Also ensure the policy for chat_participants INSERT exists
DROP POLICY IF EXISTS "Users can be added to conversations" ON chat_participants;
CREATE POLICY "Users can be added to conversations" ON chat_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE id = conversation_id 
      AND auth.uid() IN (participant1_id, participant2_id)
    )
  );

