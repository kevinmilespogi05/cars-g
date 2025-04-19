-- Create typing_indicators table
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS typing_indicators_room_id_idx ON typing_indicators(room_id);

-- Enable RLS
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view typing indicators in rooms they are in"
  ON typing_indicators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.room_id = typing_indicators.room_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own typing indicators"
  ON typing_indicators
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own typing indicators"
  ON typing_indicators
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create function to clean up old typing indicators
CREATE OR REPLACE FUNCTION clean_old_typing_indicators()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE updated_at < NOW() - INTERVAL '5 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to clean up old typing indicators
CREATE OR REPLACE TRIGGER clean_typing_indicators_trigger
AFTER INSERT OR UPDATE ON typing_indicators
EXECUTE FUNCTION clean_old_typing_indicators(); 