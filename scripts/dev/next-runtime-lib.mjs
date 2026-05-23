import fs from "node:fs";
import path from "node:path";

export const DIST_DIR_BY_PROFILE = Object.freeze({
  web: ".next/dev-web",
  playwright: ".next/dev-playwright",
  build: ".next/build",
});
export const LOCAL_BACKEND_DEFAULT = "http://127.0.0.1:5000";

const LOCAL_BACKEND_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

const VALID_COMMANDS = new Set(["dev", "build", "start"]);
const VALID_PROFILES = new Set(["web", "playwright", "build"]);

export function normalizeCommand(rawCommand) {
  const command = (rawCommand || "").trim();
  if (!VALID_COMMANDS.has(command)) {
    throw new Error(
      `Unsupported Next command "${rawCommand}". Use one of: dev, build, start.`
    );
  }
  return command;
}

export function normalizeProfile(rawProfile, command) {
  const defaultProfile = command === "dev" ? "web" : "build";
  const profile = (rawProfile || defaultProfile).trim();
  if (!VALID_PROFILES.has(profile)) {
    throw new Error(
      `Unsupported runtime profile "${rawProfile}". Use one of: web, playwright, build.`
    );
  }
  return profile;
}

export function resolveDistDir({ command, profile, env = process.env }) {
  const explicitDistDir = env.NEXT_DIST_DIR?.trim();
  if (explicitDistDir) {
    return explicitDistDir;
  }

  if (command === "build" || command === "start" || profile === "build") {
    return DIST_DIR_BY_PROFILE.build;
  }

  if (profile === "playwright") {
    return DIST_DIR_BY_PROFILE.playwright;
  }

  return DIST_DIR_BY_PROFILE.web;
}

export function resolveDefaultDevPort({ profile, env = process.env }) {
  if (profile === "playwright") {
    return env.PLAYWRIGHT_PORT?.trim() || "3002";
  }

  return env.PORT?.trim() || "3000";
}

export function hasPortArg(args) {
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (
      value === "--port" ||
      value === "-p" ||
      value.startsWith("--port=") ||
      value.startsWith("-p=")
    ) {
      return true;
    }
  }

  return false;
}

export function readPortArg(args) {
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if ((value === "--port" || value === "-p") && args[index + 1]) {
      return args[index + 1];
    }
    if (value.startsWith("--port=")) {
      return value.split("=", 2)[1];
    }
    if (value.startsWith("-p=")) {
      return value.split("=", 2)[1];
    }
  }

  return null;
}

export function buildNextArgv({
  command,
  profile,
  passthroughArgs,
  env = process.env,
}) {
  const nextArgs = [command, ...passthroughArgs];

  if (command === "dev" && !hasPortArg(passthroughArgs)) {
    nextArgs.push("--port", resolveDefaultDevPort({ profile, env }));
  }

  return nextArgs;
}

export function normalizeBackendBaseUrl(baseUrl) {
  const normalized = (baseUrl || "").trim().replace(/\/+$/, "");
  if (!normalized) {
    return LOCAL_BACKEND_DEFAULT;
  }

  try {
    const url = new URL(normalized);
    if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    // Keep original value when it is not a full URL.
  }

  return normalized;
}

export function isLocalBackendBaseUrl(baseUrl) {
  try {
    const url = new URL(baseUrl);
    return LOCAL_BACKEND_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function resolveBackendBaseUrl(env = process.env) {
  const raw = env.BACKEND_BASE_URL?.trim() || env.NEXT_PUBLIC_API_URL?.trim();
  return normalizeBackendBaseUrl(raw || LOCAL_BACKEND_DEFAULT);
}

export function shouldAutoStartLocalBackend({
  command,
  env = process.env,
} = {}) {
  if (command !== "dev") {
    return false;
  }

  const raw = env.BACKEND_AUTOSTART?.trim().toLowerCase();
  if (raw === "false") {
    return false;
  }

  return isLocalBackendBaseUrl(resolveBackendBaseUrl(env));
}

export function getLockFile(projectRoot, profile) {
  return path.join(projectRoot, ".next", "locks", `${profile}.json`);
}

export function getServiceLockFile(projectRoot, service) {
  return path.join(projectRoot, ".next", "locks", `${service}.json`);
}

export function isPidRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function inspectProfileLock(lockFile) {
  if (!fs.existsSync(lockFile)) {
    return { status: "missing", lock: null };
  }

  let rawLock;
  try {
    rawLock = JSON.parse(fs.readFileSync(lockFile, "utf8"));
  } catch {
    return { status: "stale", lock: null, reason: "invalid_json" };
  }

  if (isPidRunning(rawLock?.pid) || isPidRunning(rawLock?.childPid)) {
    return { status: "active", lock: rawLock };
  }

  return { status: "stale", lock: rawLock, reason: "dead_pid" };
}

export function writeProfileLock(lockFile, lockData) {
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  fs.writeFileSync(lockFile, `${JSON.stringify(lockData, null, 2)}\n`, "utf8");
}

export function removeProfileLock(lockFile, expectedPid) {
  if (!fs.existsSync(lockFile)) {
    return;
  }

  try {
    const current = JSON.parse(fs.readFileSync(lockFile, "utf8"));
    if (current?.pid !== expectedPid) {
      return;
    }
  } catch {
    // Delete malformed lock files when cleaning up.
  }

  fs.rmSync(lockFile, { force: true });
}

export function removeLockFile(lockFile) {
  fs.rmSync(lockFile, { force: true });
}
