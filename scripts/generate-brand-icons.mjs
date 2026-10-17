/**
 * Regenerates crawlable Temp Empire brand icons from the existing green mark.
 * Colors match dark-theme BrandMark (--accent / --on-accent). No new brand.
 */
import sharp from "sharp";
import fs from "node:fs";

const ACCENT = "#3dff2e";
const ON = "#061006";

const markSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 40 40" fill="none">
  <rect width="40" height="40" rx="10" fill="${ACCENT}"/>
  <path d="M20 8.5L29.5 14v12L20 31.5 10.5 26V14L20 8.5Z" stroke="${ON}" stroke-width="1.6" fill="none"/>
  <path d="M20 14.2L25.8 17.6v6.8L20 27.8l-5.8-3.4v-6.8L20 14.2Z" fill="${ON}" opacity="0.92"/>
  <circle cx="20" cy="20.5" r="2.2" fill="${ACCENT}"/>
</svg>`;

async function writePng(size, out) {
  await sharp(Buffer.from(markSvg)).resize(size, size).png().toFile(out);
}

async function writeIco(sizes, outPath) {
  const pngs = [];
  for (const size of sizes) {
    pngs.push({
      size,
      buf: await sharp(Buffer.from(markSvg)).resize(size, size).png().toBuffer(),
    });
  }
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  let offset = 6 + count * 16;
  const parts = [header];
  for (const { size, buf } of pngs) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    parts.push(entry);
    offset += buf.length;
  }
  for (const { buf } of pngs) parts.push(buf);
  fs.writeFileSync(outPath, Buffer.concat(parts));
}

const ogSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#061006"/>
      <stop offset="55%" stop-color="#0a1a0a"/>
      <stop offset="100%" stop-color="#102410"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="980" cy="120" r="220" fill="${ACCENT}" opacity="0.08"/>
  <circle cx="160" cy="520" r="180" fill="${ACCENT}" opacity="0.06"/>
  <g transform="translate(120,165)">
    <svg width="300" height="300" viewBox="0 0 40 40">
      <rect width="40" height="40" rx="10" fill="${ACCENT}"/>
      <path d="M20 8.5L29.5 14v12L20 31.5 10.5 26V14L20 8.5Z" stroke="${ON}" stroke-width="1.6" fill="none"/>
      <path d="M20 14.2L25.8 17.6v6.8L20 27.8l-5.8-3.4v-6.8L20 14.2Z" fill="${ON}" opacity="0.92"/>
      <circle cx="20" cy="20.5" r="2.2" fill="${ACCENT}"/>
    </svg>
  </g>
  <text x="460" y="290" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700" fill="#f4f7f4" letter-spacing="-1.5">temp <tspan fill="${ACCENT}">empire</tspan></text>
  <text x="460" y="360" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#9aab9a">Temporary OTP &amp; email marketplace</text>
</svg>`;

fs.mkdirSync("public/brand", { recursive: true });
fs.writeFileSync("public/brand/temp-empire-mark.svg", markSvg);
await writePng(48, "public/icon-48.png");
await writePng(96, "public/icon-96.png");
await writePng(192, "public/icon-192.png");
await writePng(512, "public/icon-512.png");
await writePng(180, "public/apple-touch-icon.png");
fs.copyFileSync("public/icon-192.png", "public/logo.png");
await sharp(Buffer.from(ogSvg)).png().toFile("public/og-image.png");
// 48px first — Google rejects a 16×16-leading ICO and falls back to a letter avatar.
await writeIco([48, 32, 16], "public/favicon.ico");
// Do not write src/app/favicon.ico: Next.js emits sizes="16x16" for that file.
fs.copyFileSync("public/icon-192.png", "src/app/icon.png");
fs.copyFileSync("public/apple-touch-icon.png", "src/app/apple-icon.png");
console.info("[brand-icons] regenerated");
