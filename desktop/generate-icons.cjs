const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

async function main() {
  const svgPath = path.resolve(__dirname, "../public/ferah-logo.svg");
  const outDir = path.resolve(__dirname, "build");
  fs.mkdirSync(outDir, { recursive: true });
  const svg = fs.readFileSync(svgPath, "utf8");
  // Crop the square gold Ferah emblem from the left of the official wordmark.
  const iconSvg = svg.replace('viewBox="0 0 640 170"', 'width="166" height="166" viewBox="0 0 166 166"');
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024, { fit: "contain", background: "#080a0d" })
    .png()
    .toFile(path.join(outDir, "icon.png"));
}
main().catch(error => { console.error(error); process.exit(1); });
