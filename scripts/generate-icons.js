import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const SIZES = {
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
  'apple-touch-icon.png': 180,
  'pwa-192x192.png': 192,
  'pwa-512x512.png': 512
};

async function generateIcons() {
  const sourceImage = path.join(process.cwd(), 'public', 'images', 'logo.jpg');
  
  try {
    // Create a square version of the logo first
    const metadata = await sharp(sourceImage).metadata();
    const size = Math.min(metadata.width, metadata.height);
    const squareLogo = await sharp(sourceImage)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .toBuffer();

    // Generate all sizes
    for (const [filename, size] of Object.entries(SIZES)) {
      await sharp(squareLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(process.cwd(), 'public', filename));
      
      console.log(`Generated ${filename}`);
    }

    // Generate favicon.ico (multi-size)
    const favicon = await sharp(squareLogo)
      .resize(32, 32)
      .toFormat('ico')
      .toFile(path.join(process.cwd(), 'public', 'favicon.ico'));

    console.log('Generated favicon.ico');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons(); 