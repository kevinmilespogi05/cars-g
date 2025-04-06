import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const avatars = [
  {
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
    filename: 'avatar1.png'
  },
  {
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
    filename: 'avatar2.png'
  },
  {
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
    filename: 'avatar3.png'
  },
  {
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
    filename: 'avatar4.png'
  },
  {
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
    filename: 'avatar5.png'
  }
];

const avatarsDir = path.join(__dirname, '../public/avatars');

// Create avatars directory if it doesn't exist
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Download each avatar
avatars.forEach(avatar => {
  const filePath = path.join(avatarsDir, avatar.filename);
  
  https.get(avatar.url, (response) => {
    const fileStream = fs.createWriteStream(filePath);
    response.pipe(fileStream);
    
    fileStream.on('finish', () => {
      console.log(`Downloaded ${avatar.filename}`);
      fileStream.close();
    });
  }).on('error', (err) => {
    console.error(`Error downloading ${avatar.filename}:`, err.message);
  });
}); 