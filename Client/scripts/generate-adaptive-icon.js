/**
 * generate-adaptive-icon.js
 *
 * Script untuk generate adaptive-icon.png baru yang sesuai spesifikasi Android:
 *   - Canvas: 1024 × 1024 px (representasi 108dp)
 *   - Safe zone: 61% dari canvas (~624px) = logo tidak terpotong oleh mask Android
 *   - Logo di-scale-down dan di-center, sisa ruang = transparent padding
 *
 * Usage: node scripts/generate-adaptive-icon.js
 * Requires: sharp (sudah ada di devDependencies)
 */

const sharp = require("sharp");
const path = require("path");

const CANVAS = 1024;
// Safe zone Android = 66dp dari 108dp total = 61.1% → kita pakai 60% supaya ada
// sedikit margin ekstra yang aman dari semua jenis mask (circle, squircle, dst)
const SAFE_ZONE_RATIO = 0.60;
const LOGO_SIZE = Math.round(CANVAS * SAFE_ZONE_RATIO); // 614px
const OFFSET = Math.round((CANVAS - LOGO_SIZE) / 2);    // 205px di tiap sisi

const INPUT  = path.join(__dirname, "../assets/images/icon.png");
const OUTPUT = path.join(__dirname, "../assets/images/adaptive-icon.png");

async function run() {
  console.log(`📐 Canvas       : ${CANVAS}×${CANVAS} px`);
  console.log(`🎯 Logo size    : ${LOGO_SIZE}×${LOGO_SIZE} px (${(SAFE_ZONE_RATIO * 100).toFixed(0)}%)`);
  console.log(`📏 Padding      : ${OFFSET}px per sisi`);
  console.log(`📂 Input        : ${INPUT}`);
  console.log(`📂 Output       : ${OUTPUT}`);
  console.log("");

  // Resize logo ke LOGO_SIZE, pertahankan aspect ratio, background transparent
  const resizedLogo = await sharp(INPUT)
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Composite logo ke atas canvas 1024×1024 transparan
  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resizedLogo, top: OFFSET, left: OFFSET }])
    .png({ compressionLevel: 9 })
    .toFile(OUTPUT);

  console.log(`✅ adaptive-icon.png berhasil di-generate!`);
  console.log(`   Rebuild app untuk menerapkan icon baru.`);
}

run().catch((err) => {
  console.error("❌ Gagal generate adaptive icon:", err);
  process.exit(1);
});
