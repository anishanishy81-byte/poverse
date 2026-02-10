import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const logoPath = path.join(projectRoot, 'assets', 'logo.png');

// Android mipmap sizes
const androidSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Adaptive icon foreground sizes (with padding - foreground should be 108dp with 18dp safe zone)
const adaptiveSizes = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

async function generateIcons() {
  console.log('Generating Android app icons from logo.png...');
  
  if (!fs.existsSync(logoPath)) {
    console.error('Logo not found at:', logoPath);
    process.exit(1);
  }

  const androidResPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');

  // Generate launcher icons
  for (const [folder, size] of Object.entries(androidSizes)) {
    const outputDir = path.join(androidResPath, folder);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate square launcher icon
    await sharp(logoPath)
      .resize(size, size, { fit: 'contain', background: { r: 102, g: 126, b: 234, alpha: 1 } })
      .png()
      .toFile(path.join(outputDir, 'ic_launcher.png'));
    
    // Generate round launcher icon
    const roundSize = size;
    const circleBuffer = Buffer.from(
      `<svg width="${roundSize}" height="${roundSize}">
        <circle cx="${roundSize/2}" cy="${roundSize/2}" r="${roundSize/2}" fill="white"/>
      </svg>`
    );
    
    await sharp(logoPath)
      .resize(size, size, { fit: 'contain', background: { r: 102, g: 126, b: 234, alpha: 1 } })
      .composite([{
        input: circleBuffer,
        blend: 'dest-in'
      }])
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_round.png'));

    console.log(`Generated icons for ${folder} (${size}x${size})`);
  }

  // Generate adaptive icon foreground
  for (const [folder, size] of Object.entries(adaptiveSizes)) {
    const outputDir = path.join(androidResPath, folder);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // For adaptive icons, the logo should be centered with padding
    const logoSize = Math.floor(size * 0.66); // Logo takes 66% of the space
    const padding = Math.floor((size - logoSize) / 2);
    
    await sharp(logoPath)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_foreground.png'));

    console.log(`Generated adaptive foreground for ${folder} (${size}x${size})`);
  }

  // Generate notification icon (white silhouette on transparent background)
  const notificationSizes = {
    'drawable-mdpi': 24,
    'drawable-hdpi': 36,
    'drawable-xhdpi': 48,
    'drawable-xxhdpi': 72,
    'drawable-xxxhdpi': 96,
  };

  for (const [folder, size] of Object.entries(notificationSizes)) {
    const outputDir = path.join(androidResPath, folder);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await sharp(logoPath)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .grayscale()
      .threshold(128)
      .negate()
      .png()
      .toFile(path.join(outputDir, 'ic_stat_icon.png'));

    console.log(`Generated notification icon for ${folder} (${size}x${size})`);
  }

  // Also save to public/icons for PWA
  const publicIconsDir = path.join(projectRoot, 'public', 'icons');
  if (!fs.existsSync(publicIconsDir)) {
    fs.mkdirSync(publicIconsDir, { recursive: true });
  }

  await sharp(logoPath)
    .resize(192, 192, { fit: 'contain', background: { r: 102, g: 126, b: 234, alpha: 1 } })
    .png()
    .toFile(path.join(publicIconsDir, 'icon-192x192.png'));

  await sharp(logoPath)
    .resize(512, 512, { fit: 'contain', background: { r: 102, g: 126, b: 234, alpha: 1 } })
    .png()
    .toFile(path.join(publicIconsDir, 'icon-512x512.png'));

  console.log('Generated PWA icons');
  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
