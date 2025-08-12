// Immediate fix for direct message room names
// Run this in your browser console to fix the chat name issue

(async function fixDirectMessageNames() {
  console.log('🔧 Starting fix for direct message room names...');
  
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ User not authenticated');
      return;
    }
    
    console.log('👤 Current user:', user.id);
    
    // Get all direct message rooms for the current user
    const { data: rooms, error: roomsError } = await supabase
      .from('chat_rooms')
      .select(`
        id,
        name,
        created_by,
        chat_participants!inner(user_id)
      `)
      .eq('is_direct_message', true);
    
    if (roomsError) {
      console.error('❌ Error getting rooms:', roomsError);
      return;
    }
    
    if (!rooms || rooms.length === 0) {
      console.log('✅ No direct message rooms found');
      return;
    }
    
    console.log('🏠 Found direct message rooms:', rooms.length);
    
    // Get all unique user IDs from participants
    const allUserIds = new Set();
    rooms.forEach(room => {
      room.chat_participants?.forEach(p => allUserIds.add(p.user_id));
    });
    
    console.log('👥 All participant IDs:', Array.from(allUserIds));
    
    // Get usernames for all participants
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', Array.from(allUserIds));
    
    if (profilesError) {
      console.error('❌ Error getting profiles:', profilesError);
      return;
    }
    
    console.log('📋 Profiles found:', profiles);
    
    const usernameMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
    
    // Update each room's name
    for (const room of rooms) {
      console.log(`\n🔍 Processing room: ${room.id} (current name: "${room.name}")`);
      
      const allParticipants = room.chat_participants || [];
      console.log('👥 Room participants:', allParticipants.map(p => p.user_id));
      
      // Find the other participant (not the current user)
      const otherParticipant = allParticipants.find(p => p.user_id !== user.id);
      
      if (otherParticipant) {
        const otherUsername = usernameMap.get(otherParticipant.user_id);
        console.log(`👤 Other participant: ${otherParticipant.user_id} -> ${otherUsername}`);
        
        if (otherUsername && otherUsername !== room.name) {
          console.log(`🔄 Updating room name from "${room.name}" to "${otherUsername}"`);
          
          const { error: updateError } = await supabase
            .from('chat_rooms')
            .update({ name: otherUsername })
            .eq('id', room.id);
          
          if (updateError) {
            console.error(`❌ Error updating room ${room.id}:`, updateError);
          } else {
            console.log(`✅ Successfully updated room ${room.id} name`);
          }
        } else if (otherUsername === room.name) {
          console.log(`✅ Room name is already correct: "${room.name}"`);
        } else {
          console.log(`⚠️ No username found for participant ${otherParticipant.user_id}`);
        }
      } else {
        console.log(`⚠️ No other participant found for room ${room.id}`);
      }
    }
    
    console.log('\n🎉 Direct message room names fix completed!');
    console.log('🔄 Please refresh the page to see the updated chat list.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
})(); 