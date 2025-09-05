// Script to clear old like data from localStorage
// Run this in the browser console to reset like counts

// Clear old like data
localStorage.removeItem('report_comment_base_likes');

// Clear any old individual user like data
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('report_comment_likes_')) {
    localStorage.removeItem(key);
  }
});

console.log('Old like data cleared! Like counts will now start from 0.');
