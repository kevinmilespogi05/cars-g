import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png'];
const QUALITY = 80;

async function* walk(dir) {
  const files = await readdir(dir);
  for (const file of files) {
    const pathToFile = join(dir, file);
    const stats = await stat(pathToFile);
    if (stats.isDirectory()) {
      yield* walk(pathToFile);
    } else {
      yield pathToFile;
    }
  }
}

async function convertToWebP(inputPath) {
  const ext = extname(inputPath).toLowerCase();
  if (!SUPPORTED_FORMATS.includes(ext)) {
    return;
  }

  const outputPath = inputPath.replace(ext, '.webp');
  console.log(`Converting ${inputPath} to WebP...`);

  try {
    await sharp(inputPath)
      .webp({ quality: QUALITY })
      .toFile(outputPath);
    console.log(`Successfully converted ${inputPath} to WebP`);
  } catch (error) {
    console.error(`Error converting ${inputPath}:`, error);
  }
}

async function main() {
  const directories = ['public/images', 'src/assets'];
  
  for (const dir of directories) {
    try {
      for await (const file of walk(dir)) {
        await convertToWebP(file);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`Directory ${dir} does not exist, skipping...`);
      } else {
        console.error(`Error processing directory ${dir}:`, error);
      }
    }
  }
}

main().catch(console.error); 