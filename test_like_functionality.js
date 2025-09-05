// Test script for like functionality
// Run this in the browser console to test and debug like functionality

console.log('=== Like Functionality Test ===');

// Check current localStorage data
const allLikesKey = 'report_comment_all_likes';
const allLikes = JSON.parse(localStorage.getItem(allLikesKey) || '{}');
console.log('Current allLikes in localStorage:', allLikes);

// Check individual user like data
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('report_comment_likes_')) {
    const userLikes = JSON.parse(localStorage.getItem(key) || '{}');
    console.log(`User ${key}:`, userLikes);
  }
});

// Function to manually add a like for testing
function addTestLike(commentId, userId = 'test-user-123') {
  const allLikes = JSON.parse(localStorage.getItem(allLikesKey) || '{}');
  if (!allLikes[userId]) {
    allLikes[userId] = {};
  }
  allLikes[userId][commentId] = true;
  localStorage.setItem(allLikesKey, JSON.stringify(allLikes));
  console.log('Added test like:', { commentId, userId });
  console.log('Updated allLikes:', allLikes);
}

// Function to clear all like data
function clearAllLikes() {
  localStorage.removeItem(allLikesKey);
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('report_comment_likes_')) {
      localStorage.removeItem(key);
    }
  });
  console.log('Cleared all like data');
}

console.log('Available functions:');
console.log('- addTestLike(commentId, userId) - Add a test like');
console.log('- clearAllLikes() - Clear all like data');
console.log('Example: addTestLike("your-comment-id-here")');
