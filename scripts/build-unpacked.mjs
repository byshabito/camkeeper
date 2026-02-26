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

import { cp } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const BROWSER_CHROME = "chrome";
const BROWSER_FIREFOX = "firefox";
const SUPPORTED_BROWSERS = new Set([BROWSER_CHROME, BROWSER_FIREFOX]);

function getArgValue(flag, fallback = "") {
  const arg = process.argv.find((entry) => entry.startsWith(`${flag}=`));
  if (!arg) return fallback;
  return arg.slice(flag.length + 1);
}

function resolveBrowser() {
  const browser = getArgValue("--browser", BROWSER_CHROME).trim().toLowerCase();
  if (!SUPPORTED_BROWSERS.has(browser)) {
    throw new Error(`Unsupported browser \"${browser}\". Use --browser=chrome or --browser=firefox.`);
  }
  return browser;
}

function resolveManifestSource(browser) {
  if (browser === BROWSER_FIREFOX) {
    return path.resolve(rootDir, "manifest.firefox.json");
  }
  return path.resolve(rootDir, "manifest.json");
}

function runNodeScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: rootDir,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed with exit code ${code}: node ${scriptPath} ${args.join(" ")}`));
    });
  });
}

async function main() {
  const browser = resolveBrowser();
  const outdirArg = getArgValue("--outdir", `dist/unpacked-${browser}`);
  const outdir = path.resolve(rootDir, outdirArg);

  const buildScriptPath = path.resolve(rootDir, "scripts/build-extension.mjs");
  await runNodeScript(buildScriptPath, [`--outdir=${outdir}`]);

  await cp(path.resolve(rootDir, "icons"), path.resolve(outdir, "icons"), {
    recursive: true,
    force: true,
  });

  await cp(resolveManifestSource(browser), path.resolve(outdir, "manifest.json"), {
    force: true,
  });

  console.log(`Unpacked ${browser} extension ready at ${outdir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
