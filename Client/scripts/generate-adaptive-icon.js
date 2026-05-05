/**
 * generate-adaptive-icon.js
 *
 * Script untuk generate adaptive-icon.png baru yang sesuai spesifikasi Android:
 *   - Canvas: 1024 × 1024 px (representasi 108dp)
 *   - Icon di-scale-down dan di-center dalam background putih
 *   - Tidak ada padding transparan, supaya launcher tidak menampilkan warna biru
 *
 * Usage: node scripts/generate-adaptive-icon.js
 * Requires: sharp (sudah ada di devDependencies)
 */

const sharp = require("sharp");
const path = require("path");

const CANVAS = 1024;
// Input icon.png sudah punya rounded white card + logo di dalamnya.
// 84% menjaga bentuk tetap besar seperti launcher icon biasa, tapi aman dari
// mask Android yang bisa circle/squircle.
const SAFE_ZONE_RATIO = 0.84;
const LOGO_SIZE = Math.round(CANVAS * SAFE_ZONE_RATIO);
const OFFSET = Math.round((CANVAS - LOGO_SIZE) / 2);

const INPUT  = path.join(__dirname, "../assets/images/icon.png");
const OUTPUT = path.join(__dirname, "../assets/images/adaptive-icon.png");

async function run() {
  console.log(`Canvas       : ${CANVAS}x${CANVAS} px`);
  console.log(`Logo size    : ${LOGO_SIZE}x${LOGO_SIZE} px (${(SAFE_ZONE_RATIO * 100).toFixed(0)}%)`);
  console.log(`Padding      : ${OFFSET}px per side`);
  console.log(`Input        : ${INPUT}`);
  console.log(`Output       : ${OUTPUT}`);
  console.log("");

  // Resize icon ke LOGO_SIZE, pertahankan aspect ratio.
  const resizedLogo = await sharp(INPUT)
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();

  // Composite ke atas canvas putih supaya tidak ada edge biru di adaptive icon.
  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: resizedLogo, top: OFFSET, left: OFFSET }])
    .png({ compressionLevel: 9 })
    .toFile(OUTPUT);

  console.log(`adaptive-icon.png berhasil di-generate.`);
  console.log(`   Rebuild app untuk menerapkan icon baru.`);
}

run().catch((err) => {
  console.error("Gagal generate adaptive icon:", err);
  process.exit(1);
});
