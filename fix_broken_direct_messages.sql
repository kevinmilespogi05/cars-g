-- Function to fix broken direct message rooms
CREATE OR REPLACE FUNCTION fix_broken_direct_messages()
RETURNS TABLE(
    room_id UUID,
    action_taken TEXT,
    details TEXT
) AS $$
DECLARE
    room_record RECORD;
    participant_count INTEGER;
    current_user_id UUID;
    other_user_id UUID;
    room_name TEXT;
BEGIN
    -- Get current user ID (you'll need to run this as the authenticated user)
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Find all direct message rooms with issues
    FOR room_record IN 
        SELECT 
            cr.id,
            cr.name,
            cr.created_at
        FROM public.chat_rooms cr
        WHERE cr.is_direct_message = true
    LOOP
        -- Count participants for this room
        SELECT COUNT(*) INTO participant_count
        FROM public.chat_participants cp
        WHERE cp.room_id = room_record.id;
        
        -- Check if room has issues
        IF participant_count < 2 THEN
            -- Room has missing participants
            IF participant_count = 0 THEN
                -- No participants at all - delete the room
                DELETE FROM public.chat_messages WHERE room_id = room_record.id;
                DELETE FROM public.chat_participants WHERE room_id = room_record.id;
                DELETE FROM public.chat_rooms WHERE id = room_record.id;
                
                RETURN QUERY SELECT 
                    room_record.id,
                    'DELETED'::TEXT,
                    'Room had no participants'::TEXT;
                    
            ELSIF participant_count = 1 THEN
                -- Only one participant - try to find the other user
                -- Look for a user with a username that might match the room name
                SELECT p.id INTO other_user_id
                FROM public.profiles p
                WHERE p.username = room_record.name
                AND p.id != current_user_id
                LIMIT 1;
                
                IF other_user_id IS NOT NULL THEN
                    -- Found the other user, add them to the room
                    INSERT INTO public.chat_participants (room_id, user_id, joined_at)
                    VALUES (room_record.id, other_user_id, NOW())
                    ON CONFLICT (room_id, user_id) DO NOTHING;
                    
                    RETURN QUERY SELECT 
                        room_record.id,
                        'FIXED'::TEXT,
                        'Added missing participant: ' || other_user_id::TEXT;
                ELSE
                    -- Couldn't find the other user, mark room as broken
                    UPDATE public.chat_rooms 
                    SET name = 'Broken Direct Message'
                    WHERE id = room_record.id;
                    
                    RETURN QUERY SELECT 
                        room_record.id,
                        'MARKED_BROKEN'::TEXT,
                        'Could not find missing participant'::TEXT;
                END IF;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up broken rooms
CREATE OR REPLACE FUNCTION cleanup_broken_direct_messages()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    room_record RECORD;
BEGIN
    -- Delete rooms marked as broken
    FOR room_record IN 
        SELECT id FROM public.chat_rooms 
        WHERE name = 'Broken Direct Message'
    LOOP
        DELETE FROM public.chat_messages WHERE room_id = room_record.id;
        DELETE FROM public.chat_participants WHERE room_id = room_record.id;
        DELETE FROM public.chat_rooms WHERE id = room_record.id;
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get a summary of direct message rooms
CREATE OR REPLACE FUNCTION get_direct_message_summary()
RETURNS TABLE(
    room_id UUID,
    room_name TEXT,
    participant_count INTEGER,
    message_count INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.id,
        cr.name,
        COUNT(cp.user_id)::INTEGER as participant_count,
        COUNT(cm.id)::INTEGER as message_count,
        CASE 
            WHEN COUNT(cp.user_id) = 2 THEN 'OK'
            WHEN COUNT(cp.user_id) = 1 THEN 'MISSING_PARTICIPANT'
            WHEN COUNT(cp.user_id) = 0 THEN 'NO_PARTICIPANTS'
            ELSE 'UNKNOWN'
        END as status
    FROM public.chat_rooms cr
    LEFT JOIN public.chat_participants cp ON cr.id = cp.room_id
    LEFT JOIN public.chat_messages cm ON cr.id = cm.room_id
    WHERE cr.is_direct_message = true
    GROUP BY cr.id, cr.name
    ORDER BY cr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run diagnostics
SELECT 'Direct Message Room Summary' as info;
SELECT * FROM get_direct_message_summary();

-- Show broken rooms
SELECT 'Broken Rooms' as info, * FROM get_direct_message_summary() WHERE status != 'OK';

-- To fix broken rooms, run:
-- SELECT * FROM fix_broken_direct_messages();

-- To clean up broken rooms, run:
-- SELECT cleanup_broken_direct_messages(); 