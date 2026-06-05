// Generate PNG icons from SVG for PWA + Android
// Usage: node scripts/generate-icons.js
// Requires: npm install sharp (run first)

async function main() {
  try {
    const sharp = require('sharp');
    const fs = require('fs');
    const path = require('path');

    const svgBuffer = fs.readFileSync(path.join(__dirname, '..', 'public', 'icon.svg'));
    const sizes = [192, 512];
    const androidSizes = [
      { name: 'mdpi', size: 48 },
      { name: 'hdpi', size: 72 },
      { name: 'xhdpi', size: 96 },
      { name: 'xxhdpi', size: 144 },
      { name: 'xxxhdpi', size: 192 },
    ];

    for (const size of sizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(__dirname, '..', 'public', `icon-${size}.png`));
      console.log(`Created icon-${size}.png`);
    }

    // Android adaptive icon backgrounds
    const androidRes = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
    for (const { name, size } of androidSizes) {
      const dir = path.join(androidRes, `mipmap-${name}`);
      if (fs.existsSync(dir)) {
        await sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toFile(path.join(dir, 'ic_launcher.png'));
        await sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toFile(path.join(dir, 'ic_launcher_round.png'));
        console.log(`Android icon: mipmap-${name}`);
      }
    }

    console.log('All icons generated successfully!');
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('sharp not installed. Install with: npm install -D sharp');
      console.log('For now, use SVG icons (modern browsers support them in manifests).');
    } else {
      console.error('Icon generation failed:', err.message);
    }
  }
}

main();
