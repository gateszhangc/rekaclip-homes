import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  getPersistedDeploymentTargetHost,
  persistDeploymentTargetHost,
  readDeploymentTargetHostState,
  resetDeploymentTargetHostStoreForTests,
  resolveDeploymentTargetHostStateFile,
  resolvePersistedDeploymentTargetHost,
  setDeploymentTargetHostColumnSupportForTests,
} from "./deployment-target-host-store.js";

const withTempStateFile = async (
  fn: (filePath: string) => Promise<void>
): Promise<void> => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "easyclaw-target-hosts-"));
  const previousStateFile = process.env.OPENCLAW_TARGET_HOST_STATE_FILE;
  const filePath = path.join(tempDir, "deployment-target-hosts.json");

  process.env.OPENCLAW_TARGET_HOST_STATE_FILE = filePath;
  resetDeploymentTargetHostStoreForTests();

  try {
    await fn(filePath);
  } finally {
    if (previousStateFile === undefined) {
      delete process.env.OPENCLAW_TARGET_HOST_STATE_FILE;
    } else {
      process.env.OPENCLAW_TARGET_HOST_STATE_FILE = previousStateFile;
    }
    resetDeploymentTargetHostStoreForTests();
    await rm(tempDir, { recursive: true, force: true });
  }
};

test("resolveDeploymentTargetHostStateFile defaults under a local state directory", () => {
  const previousStateFile = process.env.OPENCLAW_TARGET_HOST_STATE_FILE;
  delete process.env.OPENCLAW_TARGET_HOST_STATE_FILE;

  try {
    assert.match(
      resolveDeploymentTargetHostStateFile(),
      /state[\/\\]deployment-target-hosts\.json$/
    );
  } finally {
    if (previousStateFile === undefined) {
      delete process.env.OPENCLAW_TARGET_HOST_STATE_FILE;
    } else {
      process.env.OPENCLAW_TARGET_HOST_STATE_FILE = previousStateFile;
    }
  }
});

test("persistDeploymentTargetHost writes and reads deployment target hosts from a JSON state file", async () => {
  await withTempStateFile(async (filePath) => {
    await persistDeploymentTargetHost("dep-1", " 89.167.51.48 ");
    await persistDeploymentTargetHost("dep-2", "144.91.114.233");

    assert.equal(await getPersistedDeploymentTargetHost("dep-1"), "89.167.51.48");
    assert.equal(await getPersistedDeploymentTargetHost("dep-2"), "144.91.114.233");

    const state = await readDeploymentTargetHostState(filePath);
    assert.equal(state["dep-1"]?.targetHost, "89.167.51.48");
    assert.equal(state["dep-2"]?.targetHost, "144.91.114.233");
    assert.match(state["dep-1"]?.updatedAt || "", /^\d{4}-\d{2}-\d{2}T/);
  });
});

test("resolvePersistedDeploymentTargetHost prefers the database value when present", async () => {
  await withTempStateFile(async () => {
    setDeploymentTargetHostColumnSupportForTests(false);
    await persistDeploymentTargetHost("dep-1", "89.167.51.48");

    assert.equal(
      await resolvePersistedDeploymentTargetHost("dep-1", " 144.91.114.233 "),
      "144.91.114.233"
    );
  });
});

test("resolvePersistedDeploymentTargetHost falls back to the JSON store when the database lacks target_host", async () => {
  await withTempStateFile(async () => {
    setDeploymentTargetHostColumnSupportForTests(false);
    await persistDeploymentTargetHost("dep-1", "89.167.51.48");

    assert.equal(
      await resolvePersistedDeploymentTargetHost("dep-1", null),
      "89.167.51.48"
    );
  });
});
