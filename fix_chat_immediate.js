// Immediate fix for orphaned direct message rooms
// Run this in your browser console when you encounter the chat issue

(async function fixOrphanedChatRooms() {
  console.log('🔧 Starting immediate fix for orphaned chat rooms...');
  
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ User not authenticated');
      return;
    }
    
    console.log('👤 Current user:', user.id);
    
    // Find the problematic room
    const { data: problematicRoom, error: roomError } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', '27035978-a1ea-4b17-9a0a-667a192731ac');
    
    if (roomError) {
      console.error('❌ Error finding room:', roomError);
      return;
    }
    
    if (!problematicRoom || problematicRoom.length === 0) {
      console.log('✅ Room not found - may have been already cleaned up');
      return;
    }
    
    console.log('🏠 Found problematic room:', problematicRoom[0]);
    
    // Get participants for this room
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('room_id', '27035978-a1ea-4b17-9a0a-667a192731ac');
    
    if (participantsError) {
      console.error('❌ Error getting participants:', participantsError);
      return;
    }
    
    console.log('👥 Current participants:', participants);
    
    // Check if current user is a participant
    const currentUserParticipant = participants.find(p => p.user_id === user.id);
    
    if (!currentUserParticipant) {
      console.log('➕ Adding current user to the room...');
      
      // Add current user as participant
      const { error: addError } = await supabase
        .from('chat_participants')
        .insert({
          room_id: '27035978-a1ea-4b17-9a0a-667a192731ac',
          user_id: user.id
        });
      
      if (addError) {
        console.error('❌ Error adding user to room:', addError);
        return;
      }
      
      console.log('✅ Successfully added current user to room');
    } else {
      console.log('✅ Current user is already a participant');
    }
    
    // Verify the fix
    const { data: updatedParticipants, error: verifyError } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('room_id', '27035978-a1ea-4b17-9a0a-667a192731ac');
    
    if (verifyError) {
      console.error('❌ Error verifying fix:', verifyError);
      return;
    }
    
    console.log('✅ Room now has', updatedParticipants.length, 'participants:', updatedParticipants);
    
    if (updatedParticipants.length >= 2) {
      console.log('🎉 Fix successful! The chat should now work properly.');
      console.log('🔄 Please refresh the page to see the updated chat list.');
    } else {
      console.log('⚠️ Room still has insufficient participants. Consider deleting the room.');
      
      // Option to delete the problematic room
      const shouldDelete = confirm('The room still has issues. Would you like to delete it?');
      if (shouldDelete) {
        const { error: deleteError } = await supabase
          .from('chat_rooms')
          .delete()
          .eq('id', '27035978-a1ea-4b17-9a0a-667a192731ac');
        
        if (deleteError) {
          console.error('❌ Error deleting room:', deleteError);
        } else {
          console.log('🗑️ Successfully deleted problematic room');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
})(); 