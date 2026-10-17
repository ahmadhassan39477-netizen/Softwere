/** Pack public/icon-48.png (+ 32/16 if present) into public/favicon.ico with 48px FIRST. */
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const sizes = [48, 32, 16];
const pngs = [];

for (const size of sizes) {
  const src = size === 48 ? "public/icon-48.png" : `/tmp/favicon-${size}.png`;
  if (size !== 48) {
    const r = spawnSync(
      "python3",
      [
        "-c",
        `from PIL import Image; Image.open("public/icon-48.png").resize((${size},${size}), Image.Resampling.LANCZOS).save("${src}")`,
      ],
      { encoding: "utf8" },
    );
    if (r.status !== 0) {
      console.warn(r.stderr || r.stdout);
      continue;
    }
  }
  if (!fs.existsSync(src)) continue;
  pngs.push({ size, buf: fs.readFileSync(src) });
}

if (!pngs.length) {
  throw new Error("No PNG frames for favicon.ico");
}

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = 6 + pngs.length * 16;
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
fs.writeFileSync("public/favicon.ico", Buffer.concat(parts));
console.info(
  "[favicon] wrote public/favicon.ico first-frame",
  pngs[0].size,
  "frames",
  pngs.map((p) => p.size).join(","),
);
