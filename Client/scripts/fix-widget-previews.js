/**
 * fix-widget-previews.js
 * 
 * Creates PREMIUM AAPT2-safe widget preview PNGs.
 * Better styling while staying safe from metadata errors.
 */

const sharp = require("sharp");
const path = require("path");

const PREVIEW_DIR = path.join(__dirname, "../assets/widget-preview");

// Design tokens
const BLUE = "#2563EB";
const DARK_BLUE = "#1E40AF";
const BG_GRAY = "#F9FAFB";
const TEXT_MAIN = "#1F2937";
const TEXT_MUTED = "#6B7280";

async function createPremiumPreview(filename, width, height, title, value, detail, items = []) {
  const itemHtml = items.map((it, i) => `
    <g transform="translate(20, ${140 + i * 35})">
      <rect width="10" height="10" rx="3" fill="${BLUE}" y="2"/>
      <text x="20" y="12" font-family="sans-serif" font-size="12" fill="${TEXT_MAIN}">${it}</text>
    </g>
  `).join('');

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f3f4f6;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background Card -->
      <rect width="${width}" height="${height}" fill="url(#grad)" rx="20" stroke="#E5E7EB" stroke-width="1"/>
      
      <!-- Header -->
      <rect x="20" y="20" width="32" height="32" rx="8" fill="${BLUE}"/>
      <text x="62" y="42" font-family="sans-serif" font-size="16" font-weight="bold" fill="${BLUE}">Langganinaja</text>
      
      <!-- Title & Value -->
      <text x="20" y="85" font-family="sans-serif" font-size="13" fill="${TEXT_MUTED}">${title}</text>
      <text x="20" y="120" font-family="sans-serif" font-size="28" font-weight="bold" fill="${BLUE}">${value}</text>
      
      <!-- Detail -->
      <text x="20" y="${items.length > 0 ? 145 : 150}" font-family="sans-serif" font-size="13" fill="${TEXT_MUTED}">${detail}</text>
      
      <!-- List Items (for Medium/Large) -->
      ${itemHtml}
      
      <!-- Subtle Bottom Accents -->
      <rect x="0" y="${height - 8}" width="${width}" height="8" fill="${BLUE}" opacity="0.1" rx="0"/>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(PREVIEW_DIR, filename));

  console.log(`✓ Polished: ${filename}`);
}

(async () => {
  console.log("Polishing widget previews to be premium & safe...\n");

  await createPremiumPreview("small.png", 250, 180, "Total Tagihan", "Rp 540rb", "5 langganan aktif");
  
  await createPremiumPreview("medium.png", 400, 250, "Tagihan Bulan Ini", "Rp 540.000", "Tagihan Terdekat:", [
    "Netflix - 3 hari lagi",
    "Spotify - 7 hari lagi"
  ]);

  await createPremiumPreview("large.png", 500, 400, "Dashboard Langganan", "Rp 540.000", "Daftar Tagihan:", [
    "Netflix — Rp 54.000",
    "Spotify — Rp 54.990",
    "YouTube — Rp 59.000",
    "iCloud — Rp 15.000"
  ]);

  console.log("\nPreview dipoles! Silakan cek lagi bang.");
})();
