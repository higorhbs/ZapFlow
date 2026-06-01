#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(root, "apps/web");
const publicDir = join(web, "public");
const iconSvg = join(web, "src/app/icon.svg");
const appleSvg = join(web, "src/app/apple-icon.svg");
const require = createRequire(join(web, "package.json"));

async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.error("Instale sharp: pnpm add -D sharp --filter @flowdesk/web");
    process.exit(1);
  }

  mkdirSync(publicDir, { recursive: true });
  const small = readFileSync(iconSvg);
  const apple = readFileSync(appleSvg);

  const sizes = [
    [16, "favicon-16x16.png"],
    [32, "favicon-32x32.png"],
    [48, "icon-48x48.png"],
    [192, "icon-192.png"],
  ];

  for (const [size, name] of sizes) {
    await sharp(small).resize(size, size).png().toFile(join(publicDir, name));
  }

  await sharp(apple).resize(180, 180).png().toFile(join(publicDir, "apple-touch-icon.png"));

  const pngToIco = require("png-to-ico");
  const ico = await pngToIco([
    join(publicDir, "favicon-16x16.png"),
    join(publicDir, "favicon-32x32.png"),
  ]);
  writeFileSync(join(publicDir, "favicon.ico"), ico);

  console.log("Ícones PNG/ICO gerados em apps/web/public/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
