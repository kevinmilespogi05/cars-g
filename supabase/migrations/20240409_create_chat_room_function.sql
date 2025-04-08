-- Create a function to create a chat room and add the creator as a participant
CREATE OR REPLACE FUNCTION create_chat_room(room_name TEXT, user_id UUID)
RETURNS chat_rooms
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_room chat_rooms;
BEGIN
  -- Create the room
  INSERT INTO chat_rooms (name)
  VALUES (room_name)
  RETURNING * INTO new_room;
  
  -- Add the creator as a participant
  INSERT INTO chat_participants (room_id, user_id)
  VALUES (new_room.id, user_id);
  
  RETURN new_room;
END;
$$; 