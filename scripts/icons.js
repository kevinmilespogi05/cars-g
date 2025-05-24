import sharp from 'sharp';
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
    for (const [filename, size] of Object.entries(SIZES)) {
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(process.cwd(), 'public', filename));
      
      console.log(`Generated ${filename}`);
    }

    // Use 32x32 as favicon
    await sharp(sourceImage)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(process.cwd(), 'public', 'favicon.png'));

    console.log('Generated favicon.png');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons(); 