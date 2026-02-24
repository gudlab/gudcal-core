#!/usr/bin/env node
/**
 * Bulk push environment variables from .env to Vercel.
 * Usage: node scripts/vercel-env-push.mjs [production|preview|development]
 *        ENV_FILE=.env.production node scripts/vercel-env-push.mjs production
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { tmpdir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const envFile = process.env.ENV_FILE || ".env";
const target = process.argv[2] || "production";

function parseEnv(content) {
  const vars = {};
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).replace(/\\(.)/g, "$1");
    }
    vars[key] = value;
  }
  return vars;
}

const path = join(root, envFile);
let content;
try {
  content = readFileSync(path, "utf8");
} catch (e) {
  console.error(`Failed to read ${envFile}:`, e.message);
  process.exit(1);
}

const vars = parseEnv(content);
const keys = Object.keys(vars).filter((k) => vars[k] !== "");
console.log(`Pushing ${keys.length} variables to Vercel (${target})...\n`);

const tmpDir = mkdtempSync(join(tmpdir(), "vercel-env-"));
const tmpFile = join(tmpDir, "val");

try {
  for (const key of keys) {
    const value = vars[key];
    writeFileSync(tmpFile, value, "utf8");
    try {
      execSync(`npx vercel env add "${key}" ${target} --force --yes < "${tmpFile}"`, {
        shell: true,
        cwd: root,
      });
      console.log(`  ✓ ${key}`);
    } catch (e) {
      try {
        execSync(`npx vercel env update "${key}" ${target} --yes < "${tmpFile}"`, {
          shell: true,
          cwd: root,
        });
        console.log(`  ✓ ${key} (updated)`);
      } catch (e2) {
        console.error(`  ✗ ${key}:`, (e2.stderr || e2.message || "failed").toString().split("\n")[0]);
      }
    }
  }
} finally {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

console.log("\nDone. Redeploy to apply changes.");
