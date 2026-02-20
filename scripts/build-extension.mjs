/*
 * CamKeeper - Cross-site creator profile manager
 * Copyright (C) 2026  Shabito
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function getArgValue(flag, fallback = "") {
  const arg = process.argv.find((entry) => entry.startsWith(`${flag}=`));
  if (!arg) return fallback;
  return arg.slice(flag.length + 1);
}

async function copyRuntimeStaticFiles(outdir) {
  const runtimePaths = [
    "src/entries/popup/index.html",
    "src/entries/popup/styles.css",
    "src/entries/options/index.html",
    "src/entries/options/styles.css",
    "src/entries/options/assets",
    "src/styles/common.css",
    "src/assets",
  ];

  await Promise.all(runtimePaths.map(async (relativePath) => {
    const sourcePath = path.resolve(rootDir, relativePath);
    const targetPath = path.resolve(outdir, relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await cp(sourcePath, targetPath, { recursive: true, force: true });
  }));
}

async function buildExtension(outdir) {
  const entryPoints = [
    path.resolve(rootDir, "src/entries/background/index.js"),
    path.resolve(rootDir, "src/entries/popup/script.js"),
    path.resolve(rootDir, "src/entries/options/script.js"),
  ];

  await build({
    entryPoints,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["chrome109", "firefox109"],
    outdir,
    outbase: rootDir,
    entryNames: "[dir]/[name]",
    minify: false,
    sourcemap: false,
    legalComments: "none",
    logLevel: "info",
  });
}

async function main() {
  const outdirArg = getArgValue("--outdir", "dist/build-extension");
  const outdir = path.resolve(rootDir, outdirArg);

  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });

  await buildExtension(outdir);
  await copyRuntimeStaticFiles(outdir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
