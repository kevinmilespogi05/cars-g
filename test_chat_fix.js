// Test script to verify chat recursion fix
// Run this in your browser console after applying the SQL fix

const ROOM_ID = '27035978-a1ea-4b17-9a0a-667a192731ac';
const USER_ID = 'c5e7d75b-3f1b-4f85-b5a5-6b3786daea48'; // From your error message

async function testChatFix() {
  console.log('🧪 Testing chat recursion fix...');
  
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
    
    // 2. Test the exact query that was failing (chat_participants)
    console.log('🔄 Testing chat_participants query...');
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participants')
      .select('room_id')
      .eq('user_id', user.id);
      
    if (participantsError) {
      console.error('❌ chat_participants query failed:', participantsError);
      console.error('Error details:', {
        code: participantsError.code,
        message: participantsError.message,
        details: participantsError.details,
        hint: participantsError.hint
      });
    } else {
      console.log('✅ chat_participants query succeeded!');
      console.log('User participates in rooms:', participants?.map(p => p.room_id));
    }
    
    // 3. Test getting rooms (the original failing function)
    console.log('🔄 Testing getRooms function...');
    try {
      const rooms = await chatService.getRooms();
      console.log('✅ getRooms succeeded!');
      console.log('Available rooms:', rooms?.length || 0);
      rooms?.forEach(room => {
        console.log(`  - ${room.name} (${room.id})`);
      });
    } catch (roomsError) {
      console.error('❌ getRooms failed:', roomsError);
    }
    
    // 4. Test getting messages for the specific room
    console.log('🔄 Testing getMessages for specific room...');
    try {
      const messages = await chatService.getMessages(ROOM_ID);
      console.log('✅ getMessages succeeded!');
      console.log('Messages in room:', messages?.length || 0);
    } catch (messagesError) {
      console.error('❌ getMessages failed:', messagesError);
    }
    
    // 5. Test the exact failing query from the error
    console.log('🔄 Testing the exact failing query...');
    const { data: testParticipants, error: testError } = await supabase
      .from('chat_participants')
      .select('room_id')
      .eq('user_id', USER_ID);
      
    if (testError) {
      console.error('❌ Exact query still failing:', testError);
    } else {
      console.log('✅ Exact query now works!');
      console.log('User participations:', testParticipants);
    }
    
    // 6. Test if user is a participant in the specific room
    console.log('🔄 Testing specific room participation...');
    const { data: roomParticipant, error: roomError } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('room_id', ROOM_ID)
      .eq('user_id', user.id)
      .single();
      
    if (roomError) {
      console.log('⚠️ User not a participant in room, attempting to add...');
      try {
        await chatService.addParticipant(ROOM_ID, user.id);
        console.log('✅ User added as participant');
      } catch (addError) {
        console.error('❌ Failed to add participant:', addError);
      }
    } else {
      console.log('✅ User is already a participant in room');
    }
    
    console.log('🎉 Chat fix test completed!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testChatFix(); 