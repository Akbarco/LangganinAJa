/**
 * fix-widget-previews.js
 *
 * Creates AAPT2-safe widget preview PNGs from scratch using sharp.
 * These are simple branded cards — no AI image metadata, no ICC profiles.
 *
 * Run: node scripts/fix-widget-previews.js
 */

const sharp = require("sharp");
const path = require("path");

const PREVIEW_DIR = path.join(__dirname, "../assets/widget-preview");

// Brand colors
const WHITE = { r: 255, g: 255, b: 255 };
const BLUE = { r: 37, g: 99, b: 235 }; // #2563EB
const GRAY = { r: 156, g: 163, b: 175 };

/**
 * Create a simple solid-color PNG with an SVG overlay for text.
 * SVG text rendering via sharp is guaranteed AAPT2-safe.
 */
async function createPreview(filename, width, height, lines) {
  // Build SVG with text lines
  const textLines = lines
    .map(
      (l, i) =>
        `<text x="${width / 2}" y="${60 + i * 32}" text-anchor="middle" ` +
        `font-family="sans-serif" font-size="${l.size}" ` +
        `font-weight="${l.bold ? "bold" : "normal"}" ` +
        `fill="${l.color}">${escapeXml(l.text)}</text>`
    )
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" rx="16" fill="white"/>
  <rect x="16" y="12" width="24" height="24" rx="6" fill="rgb(${BLUE.r},${BLUE.g},${BLUE.b})"/>
  <text x="48" y="30" font-family="sans-serif" font-size="14" font-weight="bold"
        fill="rgb(${BLUE.r},${BLUE.g},${BLUE.b})">Langganinaja</text>
  ${textLines}
</svg>`;

  const svgBuffer = Buffer.from(svg);

  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: WHITE,
    },
  })
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toFile(path.join(PREVIEW_DIR, filename));

  console.log(`✓ Created: ${filename} (${width}x${height})`);
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

(async () => {
  console.log("Creating AAPT2-safe widget preview PNGs...\n");

  // Small (2x1) — 200x100
  await createPreview("small.png", 200, 100, [
    { text: "Rp 540.000", size: 20, bold: true, color: `rgb(${BLUE.r},${BLUE.g},${BLUE.b})` },
    { text: "5 langganan aktif", size: 12, bold: false, color: `rgb(${GRAY.r},${GRAY.g},${GRAY.b})` },
  ]);

  // Medium (3x2) — 300x200
  await createPreview("medium.png", 300, 200, [
    { text: "Rp 540.000 / bulan", size: 18, bold: true, color: `rgb(${BLUE.r},${BLUE.g},${BLUE.b})` },
    { text: "Budget Terpakai: 72%", size: 12, bold: false, color: `rgb(${GRAY.r},${GRAY.g},${GRAY.b})` },
    { text: "", size: 12, bold: false, color: "white" },
    { text: "Netflix - 3 hari lagi", size: 13, bold: false, color: "#374151" },
  ]);

  // Large (4x3) — 400x300
  await createPreview("large.png", 400, 300, [
    { text: "Total Tagihan", size: 13, bold: false, color: `rgb(${GRAY.r},${GRAY.g},${GRAY.b})` },
    { text: "Rp 540.000 / bulan", size: 20, bold: true, color: `rgb(${BLUE.r},${BLUE.g},${BLUE.b})` },
    { text: "Budget: 72%", size: 12, bold: false, color: `rgb(${GRAY.r},${GRAY.g},${GRAY.b})` },
    { text: "", size: 10, bold: false, color: "white" },
    { text: "Tagihan Terdekat", size: 14, bold: true, color: "#1F2937" },
    { text: "Netflix — Rp 54.000 — 3 hari", size: 12, bold: false, color: "#374151" },
    { text: "Spotify — Rp 54.990 — 7 hari", size: 12, bold: false, color: "#374151" },
  ]);

  console.log("\n✅ All previews created! Now run:");
  console.log("   npx expo prebuild --clean");
  console.log("   eas build -p android --profile preview");
})();
