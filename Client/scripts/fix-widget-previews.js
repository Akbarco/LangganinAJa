/**
 * fix-widget-previews.js
 * 
 * Re-encodes widget preview PNGs to be AAPT2-compatible.
 * Strips ICC color profiles and non-standard metadata that cause
 * Android resource compiler to reject the files.
 * 
 * Run: node scripts/fix-widget-previews.js
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const PREVIEW_DIR = path.join(__dirname, "../assets/widget-preview");

const files = [
  { src: "small.png", out: "small.png" },
  { src: "medium.png", out: "medium.png" },
  { src: "large.png", out: "large.png" },
];

async function fixPng(src, out) {
  const input = path.join(PREVIEW_DIR, src);
  const output = path.join(PREVIEW_DIR, `_fixed_${out}`);

  await sharp(input)
    // Force re-encode: flatten transparency to white, output sRGB 8-bit, strip all metadata
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .toColorspace("srgb")
    .png({
      compressionLevel: 6,
      // No icc profile, no exif, no xmp
      force: true,
    })
    .withMetadata({}) // strip all
    .toFile(output);

  // Replace original with fixed version (rename is atomic, avoids Windows file locks)
  fs.renameSync(output, input);
  console.log(`✓ Fixed: ${src}`);
}

(async () => {
  console.log("Fixing widget preview PNGs for AAPT2 compatibility...\n");
  for (const file of files) {
    try {
      await fixPng(file.src, file.out);
    } catch (err) {
      console.error(`✗ Failed ${file.src}:`, err.message);
    }
  }
  console.log("\nDone! Re-run: eas build -p android --profile preview");
})();
