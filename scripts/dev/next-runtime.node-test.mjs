import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DIST_DIR_BY_PROFILE,
  buildNextArgv,
  isLocalBackendBaseUrl,
  inspectProfileLock,
  normalizeBackendBaseUrl,
  resolveBackendBaseUrl,
  resolveDistDir,
  shouldAutoStartLocalBackend,
} from "./next-runtime-lib.mjs";

test("resolveDistDir isolates web, playwright, and build outputs", () => {
  assert.equal(resolveDistDir({ command: "dev", profile: "web", env: {} }), DIST_DIR_BY_PROFILE.web);
  assert.equal(
    resolveDistDir({ command: "dev", profile: "playwright", env: {} }),
    DIST_DIR_BY_PROFILE.playwright
  );
  assert.equal(
    resolveDistDir({ command: "build", profile: "build", env: {} }),
    DIST_DIR_BY_PROFILE.build
  );
});

test("buildNextArgv adds profile-specific default ports for dev", () => {
  assert.deepEqual(buildNextArgv({
    command: "dev",
    profile: "web",
    passthroughArgs: [],
    env: {},
  }), ["dev", "--port", "3000"]);

  assert.deepEqual(buildNextArgv({
    command: "dev",
    profile: "playwright",
    passthroughArgs: [],
    env: {},
  }), ["dev", "--port", "3002"]);
});

test("buildNextArgv preserves explicit port overrides", () => {
  assert.deepEqual(buildNextArgv({
    command: "dev",
    profile: "web",
    passthroughArgs: ["--port", "4010"],
    env: {},
  }), ["dev", "--port", "4010"]);

  assert.deepEqual(buildNextArgv({
    command: "dev",
    profile: "playwright",
    passthroughArgs: ["--port=4555"],
    env: {},
  }), ["dev", "--port=4555"]);
});

test("resolveBackendBaseUrl normalizes localhost to IPv4 loopback", () => {
  assert.equal(
    normalizeBackendBaseUrl("http://localhost:5000/"),
    "http://127.0.0.1:5000"
  );
  assert.equal(
    resolveBackendBaseUrl({ BACKEND_BASE_URL: "http://localhost:5000/" }),
    "http://127.0.0.1:5000"
  );
  assert.equal(isLocalBackendBaseUrl("http://127.0.0.1:5000"), true);
  assert.equal(isLocalBackendBaseUrl("http://144.91.114.233:5001"), false);
});

test("shouldAutoStartLocalBackend only enables local backend targets in dev", () => {
  assert.equal(
    shouldAutoStartLocalBackend({ command: "dev", env: {} }),
    true
  );
  assert.equal(
    shouldAutoStartLocalBackend({
      command: "dev",
      env: { BACKEND_BASE_URL: "http://144.91.114.233:5001" },
    }),
    false
  );
  assert.equal(
    shouldAutoStartLocalBackend({
      command: "dev",
      env: { BACKEND_AUTOSTART: "false" },
    }),
    false
  );
  assert.equal(
    shouldAutoStartLocalBackend({ command: "build", env: {} }),
    false
  );
});

test("inspectProfileLock reports active and stale locks", async () => {
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "next-runtime-lock-")
  );
  const activeLock = path.join(tempDir, "active.json");
  const childActiveLock = path.join(tempDir, "child-active.json");
  const staleLock = path.join(tempDir, "stale.json");

  await fs.promises.writeFile(
    activeLock,
    JSON.stringify({ pid: process.pid, distDir: DIST_DIR_BY_PROFILE.web })
  );
  await fs.promises.writeFile(
    childActiveLock,
    JSON.stringify({ pid: 999999, childPid: process.pid, distDir: DIST_DIR_BY_PROFILE.web })
  );
  await fs.promises.writeFile(
    staleLock,
    JSON.stringify({ pid: 999999, distDir: DIST_DIR_BY_PROFILE.playwright })
  );

  assert.equal(inspectProfileLock(activeLock).status, "active");
  assert.equal(inspectProfileLock(childActiveLock).status, "active");
  assert.equal(inspectProfileLock(staleLock).status, "stale");
});
