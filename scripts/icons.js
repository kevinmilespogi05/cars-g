#!/usr/bin/env node

import sharp from 'sharp';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function generateIcons() {
  try {
    console.log('🎨 Generating app icons...');
    
    const inputPath = resolve(__dirname, '../public/images/logo.jpg');
    const outputDir = resolve(__dirname, '../public');
    
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    const sizes = [
      { size: 16, name: 'favicon-16x16.png' },
      { size: 32, name: 'favicon-32x32.png' },
      { size: 192, name: 'pwa-192x192.png' },
      { size: 512, name: 'pwa-512x512.png' },
      { size: 180, name: 'apple-touch-icon.png' }
    ];
    
    for (const { size, name } of sizes) {
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(resolve(outputDir, name));
      
      console.log(`✅ Generated ${name} (${size}x${size})`);
    }
    
    console.log('🎉 All icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
