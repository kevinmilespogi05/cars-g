-- Apply seen tracking migration manually
-- This script adds seen_at column and related functions to the chat_messages table

-- Add seen tracking to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS seen_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for seen_at for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_seen_at ON chat_messages(seen_at);

-- Create function to mark messages as seen by admin
CREATE OR REPLACE FUNCTION mark_messages_as_seen(
    message_ids UUID[],
    admin_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update messages as seen by admin
    UPDATE chat_messages 
    SET 
        seen_at = NOW(),
        is_read = TRUE,
        updated_at = NOW()
    WHERE 
        id = ANY(message_ids) 
        AND receiver_id = admin_user_id
        AND seen_at IS NULL;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get unread message count for admin
CREATE OR REPLACE FUNCTION get_admin_unread_count(admin_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) 
        FROM chat_messages 
        WHERE receiver_id = admin_user_id 
        AND seen_at IS NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION mark_messages_as_seen(UUID[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_unread_count(UUID) TO authenticated;
