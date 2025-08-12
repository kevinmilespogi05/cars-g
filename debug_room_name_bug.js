// Debug room name bug - Run this in your browser console
// This will help identify why "kevin" is showing instead of "admin"

console.log('=== DEBUGGING ROOM NAME BUG ===');

// 1. Check current user
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user?.id, user?.email);

// 2. Get all rooms and their details
const { data: rooms, error: roomsError } = await supabase
  .from('chat_rooms')
  .select(`
    *,
    chat_participants(
      user_id,
      profiles(username, id)
    )
  `);

if (roomsError) {
  console.error('Error getting rooms:', roomsError);
} else {
  console.log('All rooms:', rooms);
  
  // 3. Find rooms with "kevin" in the name
  const kevinRooms = rooms.filter(room => 
    room.name === 'kevin' || room.name.includes('kevin')
  );
  
  console.log('Rooms with "kevin" in name:', kevinRooms);
  
  // 4. For each kevin room, show participants
  kevinRooms.forEach(room => {
    console.log(`\nRoom ${room.id} (${room.name}):`);
    console.log('Participants:', room.chat_participants);
    
    // Find the other participant (not the current user)
    const otherParticipants = room.chat_participants.filter(p => 
      p.user_id !== user?.id
    );
    
    console.log('Other participants:', otherParticipants);
    
    if (otherParticipants.length > 0) {
      const otherUsername = otherParticipants[0].profiles?.username;
      console.log(`Should be named: ${otherUsername}`);
    }
  });
}

// 5. Check if there are multiple rooms with same participants
const directMessageRooms = rooms.filter(room => room.is_direct_message);
console.log('\nDirect message rooms:', directMessageRooms);

// 6. Test the getRooms function from chatService
console.log('\n=== TESTING CHAT SERVICE ===');
try {
  // Import the chat service (you might need to adjust this path)
  const chatService = window.chatService || await import('./src/services/chatService.ts');
  
  if (chatService && chatService.chatService) {
    const serviceRooms = await chatService.chatService.getRooms();
    console.log('Rooms from chatService:', serviceRooms);
    
    // Find the room that should show "admin"
    const adminRoom = serviceRooms.find(room => 
      room.chat_participants?.some(p => p.profiles?.username === 'admin')
    );
    
    if (adminRoom) {
      console.log('Room that should show "admin":', adminRoom);
      console.log('Current name:', adminRoom.name);
    }
  }
} catch (error) {
  console.log('Could not test chatService directly:', error);
}

// 7. Check the current selected room in the UI
console.log('\n=== UI STATE ===');
const selectedRoomElement = document.querySelector('[data-room-id]');
if (selectedRoomElement) {
  console.log('Selected room element:', selectedRoomElement);
  console.log('Room ID:', selectedRoomElement.dataset.roomId);
}

// 8. Check for any React state that might be holding the wrong room name
console.log('\n=== REACT STATE CHECK ===');
// This will help identify if the issue is in React state management
const reactRoot = document.querySelector('#root');
if (reactRoot && reactRoot._reactInternalFiber) {
  console.log('React root found, checking for room state...');
  // You can inspect the React DevTools to see the component state
}

console.log('\n=== DEBUG COMPLETE ===');
console.log('Check the console output above to identify the issue.');
console.log('If you see "kevin" rooms, run the SQL fix script.');
console.log('If the chatService shows correct names but UI shows wrong names, it\'s a React state issue.'); 