import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = {
  icons: [192, 512],
  screenshots: [
    { width: 1280, height: 720, formFactor: 'wide' },
    { width: 750, height: 1334, formFactor: 'narrow' }
  ]
};

async function generateAssets() {
  // Create public directory if it doesn't exist
  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }

  // Convert SVG to PNG for icons
  const svgBuffer = fs.readFileSync(path.join(__dirname, '../src/assets/logo.svg'));
  
  // Generate icons
  for (const size of sizes.icons) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, `pwa-${size}x${size}.png`));
  }

  // Create a simple screenshot for both desktop and mobile
  const screenshotBuffer = await sharp({
    create: {
      width: 1280,
      height: 720,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([
    {
      input: svgBuffer,
      gravity: 'center',
      width: 256,
      height: 256
    }
  ])
  .png()
  .toBuffer();

  // Generate screenshots
  for (const screenshot of sizes.screenshots) {
    await sharp(screenshotBuffer)
      .resize(screenshot.width, screenshot.height)
      .toFile(path.join(publicDir, `screenshot-${screenshot.formFactor}.png`));
  }
}

generateAssets().catch(console.error); 