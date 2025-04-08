-- Drop existing function if it exists
DROP FUNCTION IF EXISTS delete_chat_room(UUID);

-- Add function to delete a chat room
CREATE OR REPLACE FUNCTION delete_chat_room(target_room_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  room_exists BOOLEAN;
  is_participant BOOLEAN;
  is_direct_message BOOLEAN;
BEGIN
  -- Check if room exists and if it's a direct message
  SELECT 
    EXISTS(SELECT 1 FROM chat_rooms WHERE id = target_room_id),
    EXISTS(SELECT 1 FROM chat_participants WHERE room_id = target_room_id AND user_id = auth.uid()),
    chat_rooms.is_direct_message
  FROM chat_rooms 
  WHERE id = target_room_id
  INTO room_exists, is_participant, is_direct_message;
    
  -- Only allow deletion if user is a participant
  IF room_exists AND is_participant THEN
    -- Delete all messages first (this will cascade to other related data)
    DELETE FROM chat_messages WHERE room_id = target_room_id;
    -- Delete all participants
    DELETE FROM chat_participants WHERE room_id = target_room_id;
    -- Delete the room itself
    DELETE FROM chat_rooms WHERE id = target_room_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$; 