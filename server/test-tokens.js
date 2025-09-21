import fetch from 'node-fetch';

console.log('Testing Server JWT Token Generation');

const API_URL = 'http://localhost:3001';

async function testLogin(email, password, description) {
  try {
    console.log(`Testing login for ${description} (${email})`);
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`Login successful for ${description}`);
      console.log(`User ID: ${data.user.id}`);
      console.log(`Access Token: ${data.tokens.accessToken.substring(0, 50)}...`);
      
      // Decode the token to see the payload
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.decode(data.tokens.accessToken);
        console.log(`Token payload:`, {
          userId: decoded.userId,
          email: decoded.email,
          jti: decoded.jti,
          iat: decoded.iat
        });
      } catch (error) {
        console.log(`Error decoding token: ${error.message}`);
      }
      
      return data.tokens.accessToken;
    } else {
      console.log(`Login failed for ${description}: ${data.error}`);
      return null;
    }
  } catch (error) {
    console.log(`Network error for ${description}: ${error.message}`);
    return null;
  }
}

// Test with different users
const users = [
  { email: 'user1@example.com', password: 'password123', desc: 'User 1' },
  { email: 'user2@example.com', password: 'password123', desc: 'User 2' },
  { email: 'user3@example.com', password: 'password123', desc: 'User 3' }
];

const tokens = [];
for (const user of users) {
  const token = await testLogin(user.email, user.password, user.desc);
  if (token) tokens.push(token);
  console.log('---');
  await new Promise(resolve => setTimeout(resolve, 100));
}

console.log('Analysis:');
console.log(`Total tokens: ${tokens.length}`);
const uniqueTokens = new Set(tokens);
console.log(`Unique tokens: ${uniqueTokens.size}`);

if (uniqueTokens.size === tokens.length) {
  console.log('All tokens are unique!');
} else {
  console.log('Some tokens are identical!');
}
