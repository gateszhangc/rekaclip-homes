#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const targets = [
  ".next/dev-web",
  ".next/dev-playwright",
  ".next/build",
  ".next/locks",
  "playwright-report",
  "test-results",
];

for (const relativeTarget of targets) {
  const absoluteTarget = path.join(projectRoot, relativeTarget);
  fs.rmSync(absoluteTarget, { recursive: true, force: true });
  console.log(`[dev:reset] removed ${relativeTarget}`);
}
