#!/usr/bin/env node

import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  buildNextArgv,
  getLockFile,
  getServiceLockFile,
  inspectProfileLock,
  normalizeCommand,
  normalizeProfile,
  readPortArg,
  removeLockFile,
  removeProfileLock,
  resolveBackendBaseUrl,
  resolveDefaultDevPort,
  resolveDistDir,
  shouldAutoStartLocalBackend,
  writeProfileLock,
} from "./next-runtime-lib.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const [, , rawCommand, rawProfile, ...passthroughArgs] = process.argv;

const command = normalizeCommand(rawCommand || "dev");
const profile = normalizeProfile(rawProfile, command);
const distDir = resolveDistDir({ command, profile });
const nextArgs = buildNextArgv({
  command,
  profile,
  passthroughArgs,
});

const childEnv = {
  ...process.env,
  NEXT_RUNTIME_PROFILE: profile,
  NEXT_DIST_DIR: distDir,
};
const backendRoot = path.join(projectRoot, "backend");
const backendBaseUrl = resolveBackendBaseUrl(childEnv);
const backendLockFile = getServiceLockFile(projectRoot, "backend");
const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";

let child = null;
let backendChild = null;
let ownsBackendChild = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOk(url, timeoutMs = 1000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForLocalBackendReady(baseUrl, timeoutMs, childProcess) {
  const healthUrl = new URL("/health", `${baseUrl}/`).toString();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await fetchOk(healthUrl)) {
      return;
    }

    if (childProcess && childProcess.exitCode !== null) {
      throw new Error(
        `[next-runtime] Local backend exited before becoming ready (code ${childProcess.exitCode}).`
      );
    }

    await sleep(250);
  }

  throw new Error(
    `[next-runtime] Timed out waiting for local backend at ${healthUrl}. ` +
      `Set BACKEND_AUTOSTART=false to disable auto-start or start it manually with ` +
      `"npm --prefix backend run dev".`
  );
}

async function ensureLocalBackend() {
  if (!shouldAutoStartLocalBackend({ command, env: childEnv })) {
    return;
  }

  if (await fetchOk(new URL("/health", `${backendBaseUrl}/`).toString())) {
    console.log(`[next-runtime] Reusing local backend at ${backendBaseUrl}`);
    return;
  }

  const lockState = inspectProfileLock(backendLockFile);
  if (lockState.status === "stale") {
    removeLockFile(backendLockFile);
  }

  if (lockState.status === "active") {
    console.log(
      `[next-runtime] Waiting for local backend at ${backendBaseUrl} ` +
        `(pid ${lockState.lock?.childPid || lockState.lock?.pid}).`
    );
    await waitForLocalBackendReady(backendBaseUrl, 20_000);
    console.log(`[next-runtime] Local backend ready: ${backendBaseUrl}`);
    return;
  }

  console.log(`[next-runtime] Starting local backend at ${backendBaseUrl}`);
  backendChild = spawn(npmBin, ["run", "dev"], {
    cwd: backendRoot,
    env: process.env,
    stdio: "inherit",
  });
  ownsBackendChild = true;

  writeProfileLock(backendLockFile, {
    pid: process.pid,
    childPid: backendChild.pid,
    profile: "shared",
    command: "dev",
    distDir: backendRoot,
    port: new URL(backendBaseUrl).port || "5000",
    startedAt: new Date().toISOString(),
    argv: ["npm", "run", "dev"],
  });

  backendChild.on("error", (error) => {
    console.error(`[next-runtime] Failed to start local backend: ${error.message}`);
  });

  await waitForLocalBackendReady(backendBaseUrl, 20_000, backendChild);
  console.log(`[next-runtime] Local backend ready: ${backendBaseUrl}`);
}

function cleanupOwnedBackend() {
  if (!ownsBackendChild) {
    return;
  }

  removeProfileLock(backendLockFile, process.pid);
  if (backendChild?.exitCode === null) {
    backendChild.kill("SIGINT");
  }
}

const lockFile = getLockFile(projectRoot, profile);
if (command === "dev") {
  const lockState = inspectProfileLock(lockFile);
  if (lockState.status === "active") {
    const activePort =
      lockState.lock?.port || resolveDefaultDevPort({ profile, env: childEnv });
    console.error(
      `[next-runtime] profile "${profile}" is already running ` +
        `(pid ${lockState.lock.pid}, port ${activePort}, distDir ${lockState.lock.distDir}).`
    );
    console.error(
      `[next-runtime] Stop the existing process or run "npm run dev:reset" before retrying.`
    );
    process.exit(1);
  }

  if (lockState.status === "stale") {
    removeProfileLock(lockFile, lockState.lock?.pid);
  }
}

try {
  await ensureLocalBackend();
} catch (error) {
  cleanupOwnedBackend();
  console.error(
    error instanceof Error
      ? error.message
      : `[next-runtime] Failed to prepare local backend: ${String(error)}`
  );
  process.exit(1);
}

child = spawn(process.execPath, [nextBin, ...nextArgs], {
  cwd: projectRoot,
  env: childEnv,
  stdio: "inherit",
});

if (command === "dev") {
  const requestedPort =
    readPortArg(nextArgs) || resolveDefaultDevPort({ profile, env: childEnv });
  writeProfileLock(lockFile, {
    pid: process.pid,
    childPid: child.pid,
    profile,
    command,
    distDir,
    port: requestedPort,
    startedAt: new Date().toISOString(),
    argv: nextArgs,
  });
}

let cleanedUp = false;
const cleanup = () => {
  if (cleanedUp) {
    return;
  }
  cleanedUp = true;
  if (command === "dev") {
    removeProfileLock(lockFile, process.pid);
  }
  cleanupOwnedBackend();
};

const forwardSignal = (signal) => {
  cleanup();
  if (child.exitCode === null) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));
process.on("exit", cleanup);

child.on("exit", (code, signal) => {
  cleanup();
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  cleanup();
  console.error(`[next-runtime] Failed to start Next.js: ${error.message}`);
  process.exit(1);
});
