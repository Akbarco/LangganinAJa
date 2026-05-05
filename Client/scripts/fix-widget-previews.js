/**
 * deep-sanitize-previews.js
 * 
 * Re-saves the original AI images using a raw pixel transfer.
 * This guarantees the visual is 100% IDENTICAL to the original,
 * but the PNG file structure will be 100% clean for AAPT2.
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const PREVIEW_DIR = path.join(__dirname, "../assets/widget-preview");
const files = ["small.png", "medium.png", "large.png"];

async function sanitize(filename) {
  const file = path.join(PREVIEW_DIR, filename);
  const temp = path.join(PREVIEW_DIR, `_temp_${filename}`);

  // 1. Read to raw pixels
  const { data, info } = await sharp(file)
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 2. Write back from raw pixels (this strips ALL metadata/ICC/iCCP chunks)
  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  })
  .png({ 
    compressionLevel: 9,
    palette: false, // Keep full color depth
    adaptiveFiltering: false 
  })
  .toFile(temp);

  // 3. Replace
  fs.unlinkSync(file);
  fs.renameSync(temp, file);
  
  console.log(`✓ Sanitized (Identical Look): ${filename}`);
}

(async () => {
  console.log("Restoring original looks while fixing technical errors...\n");
  for (const f of files) {
    try {
      await sanitize(f);
    } catch (err) {
      console.error(`✗ Error ${f}:`, err.message);
    }
  }
  console.log("\nSelesai! Gambarnya sekarang sudah 'bersih' tapi tetap 'Wow'.");
})();
