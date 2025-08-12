// Diagnostic script for chat 400 Bad Request error
// Run this in your browser console or as a Node.js script

const ROOM_ID = '27035978-a1ea-4b17-9a0a-667a192731ac';

// Function to check the current state
async function diagnoseChatError() {
  console.log('🔍 Diagnosing chat error...');
  
  try {
    // 1. Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }
    
    if (!user) {
      console.error('❌ User not authenticated');
      return;
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // 2. Check if room exists
    const { data: room, error: roomError } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', ROOM_ID)
      .single();
      
    if (roomError) {
      console.error('❌ Room not found:', roomError);
      return;
    }
    
    console.log('✅ Room exists:', room.name);
    
    // 3. Check if user is a participant
    const { data: participant, error: participantError } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('room_id', ROOM_ID)
      .eq('user_id', user.id)
      .single();
      
    if (participantError) {
      console.log('⚠️ User not a participant in room');
      
      // Try to add user as participant
      console.log('🔄 Attempting to add user as participant...');
      const { error: addError } = await supabase
        .from('chat_participants')
        .insert([{ room_id: ROOM_ID, user_id: user.id }]);
        
      if (addError) {
        console.error('❌ Failed to add participant:', addError);
      } else {
        console.log('✅ User added as participant');
      }
    } else {
      console.log('✅ User is a participant');
    }
    
    // 4. Check if there are any messages in the room
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('id, content, sender_id, created_at')
      .eq('room_id', ROOM_ID)
      .order('created_at', { ascending: true });
      
    if (messagesError) {
      console.error('❌ Error fetching messages:', messagesError);
      console.error('Error details:', {
        code: messagesError.code,
        message: messagesError.message,
        details: messagesError.details,
        hint: messagesError.hint
      });
    } else {
      console.log(`✅ Found ${messages?.length || 0} messages in room`);
    }
    
    // 5. Test the exact query that's failing
    console.log('🔄 Testing the exact failing query...');
    const { data: testMessages, error: testError } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles:sender_id (
          username,
          avatar_url
        )
      `)
      .eq('room_id', ROOM_ID)
      .order('created_at', { ascending: true });
      
    if (testError) {
      console.error('❌ Test query failed:', testError);
      console.error('Error details:', {
        code: testError.code,
        message: testError.message,
        details: testError.details,
        hint: testError.hint
      });
    } else {
      console.log('✅ Test query succeeded!');
      console.log('Messages with profiles:', testMessages);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the diagnosis
diagnoseChatError(); 