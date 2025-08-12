// Simple fix for direct message room names
// Run this in your browser console

(async function fixChatNames() {
  console.log('🔧 Fixing direct message room names...');
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Not authenticated');
      return;
    }
    
    console.log('👤 Current user:', user.id);
    
    // Get all direct message rooms
    const { data: rooms, error } = await supabase
      .from('chat_rooms')
      .select(`
        id,
        name,
        created_by,
        chat_participants(user_id)
      `)
      .eq('is_direct_message', true);
    
    if (error) {
      console.error('❌ Error getting rooms:', error);
      return;
    }
    
    if (!rooms || rooms.length === 0) {
      console.log('✅ No direct message rooms found');
      return;
    }
    
    console.log('🏠 Found rooms:', rooms.length);
    
    // Get all user IDs
    const userIds = new Set();
    rooms.forEach(room => {
      room.chat_participants?.forEach(p => userIds.add(p.user_id));
    });
    
    // Get usernames
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', Array.from(userIds));
    
    const usernameMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
    
    // Fix each room
    for (const room of rooms) {
      const participants = room.chat_participants || [];
      const otherParticipant = participants.find(p => p.user_id !== user.id);
      
      if (otherParticipant) {
        const otherUsername = usernameMap.get(otherParticipant.user_id);
        
        if (otherUsername && otherUsername !== room.name) {
          console.log(`🔄 Updating room ${room.id}: "${room.name}" → "${otherUsername}"`);
          
          await supabase
            .from('chat_rooms')
            .update({ name: otherUsername })
            .eq('id', room.id);
          
          console.log(`✅ Updated room ${room.id}`);
        } else {
          console.log(`✅ Room ${room.id} already correct: "${room.name}"`);
        }
      } else {
        console.log(`⚠️ Room ${room.id} has no other participant`);
      }
    }
    
    console.log('🎉 Fix completed! Refresh the page to see changes.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})(); 