-- Add is_direct_message column to chat_rooms table if it doesn't exist
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS is_direct_message BOOLEAN DEFAULT FALSE;

-- Create a function to create a direct message room
CREATE OR REPLACE FUNCTION create_direct_message_room(other_user_id UUID, room_name TEXT)
RETURNS chat_rooms
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_room chat_rooms;
  current_user_id UUID;
  existing_room_id UUID;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Check if a direct message room already exists between these users
  SELECT cr.id INTO existing_room_id
  FROM chat_rooms cr
  WHERE cr.is_direct_message = true
  AND EXISTS (
    SELECT 1 FROM chat_participants cp1
    WHERE cp1.room_id = cr.id AND cp1.user_id = current_user_id
  )
  AND EXISTS (
    SELECT 1 FROM chat_participants cp2
    WHERE cp2.room_id = cr.id AND cp2.user_id = other_user_id
  )
  LIMIT 1;

  -- If room exists, return it
  IF existing_room_id IS NOT NULL THEN
    SELECT * INTO new_room FROM chat_rooms WHERE id = existing_room_id;
    RETURN new_room;
  END IF;
  
  -- Create the room
  INSERT INTO chat_rooms (name, is_direct_message)
  VALUES (room_name, TRUE)
  RETURNING * INTO new_room;
  
  -- Add both users as participants
  INSERT INTO chat_participants (room_id, user_id)
  VALUES 
    (new_room.id, current_user_id),
    (new_room.id, other_user_id);
  
  RETURN new_room;
END;
$$; 