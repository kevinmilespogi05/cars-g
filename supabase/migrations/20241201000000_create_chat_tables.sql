-- Create chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure participants are different
  CONSTRAINT different_participants CHECK (participant1_id != participant2_id)
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'location')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat participants table for easier querying
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(conversation_id, user_id)
);

-- Insert participants when conversation is created
CREATE OR REPLACE FUNCTION insert_chat_participants()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_participants (conversation_id, user_id)
  VALUES (NEW.id, NEW.participant1_id), (NEW.id, NEW.participant2_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_insert_chat_participants
  AFTER INSERT ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION insert_chat_participants();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_participants 
  ON chat_conversations(participant1_id, participant2_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation 
  ON chat_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender 
  ON chat_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation 
  ON chat_participants(conversation_id);

CREATE INDEX IF NOT EXISTS idx_chat_participants_user 
  ON chat_participants(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Users can view their own conversations" ON chat_conversations
  FOR SELECT USING (
    auth.uid() IN (participant1_id, participant2_id)
  );

CREATE POLICY "Users can create conversations" ON chat_conversations
  FOR INSERT WITH CHECK (
    auth.uid() IN (participant1_id, participant2_id)
  );

CREATE POLICY "Users can update their own conversations" ON chat_conversations
  FOR UPDATE USING (
    auth.uid() IN (participant1_id, participant2_id)
  );

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their conversations" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE id = conversation_id 
      AND auth.uid() IN (participant1_id, participant2_id)
    )
  );

CREATE POLICY "Users can send messages in their conversations" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE id = conversation_id 
      AND auth.uid() IN (participant1_id, participant2_id)
    )
  );

CREATE POLICY "Users can update their own messages" ON chat_messages
  FOR UPDATE USING (
    sender_id = auth.uid()
  );

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants in their conversations" ON chat_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE id = conversation_id 
      AND auth.uid() IN (participant1_id, participant2_id)
    )
  );

CREATE POLICY "Users can be added to conversations" ON chat_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE id = conversation_id 
      AND auth.uid() IN (participant1_id, participant2_id)
    )
  );

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM chat_messages cm
    JOIN chat_participants cp ON cm.conversation_id = cp.conversation_id
    WHERE cp.user_id = user_uuid
    AND cm.created_at > cp.last_read_at
    AND cm.sender_id != user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_conversation_as_read(user_uuid UUID, conversation_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chat_participants
  SET last_read_at = NOW()
  WHERE user_id = user_uuid AND conversation_id = conversation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 