#!/usr/bin/env node
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vendorRoot = join(root, "apps/web/vendor/@zapflow");

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

function copyPkg(name) {
  const src = join(root, "packages", name);
  const dest = join(vendorRoot, name);
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, {
    recursive: true,
    filter: (p) => !p.includes(`${name}/node_modules`) && !p.includes(`${name}/.turbo`),
  });
}

run("pnpm --filter @zapflow/firebase build");
run("pnpm --filter @zapflow/shared build");
mkdirSync(vendorRoot, { recursive: true });
copyPkg("firebase");
copyPkg("shared");
console.log("Hosting vendor pronto em apps/web/vendor/@zapflow");
