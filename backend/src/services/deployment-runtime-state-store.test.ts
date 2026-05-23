import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  getPersistedDeploymentRuntimeState,
  persistDeploymentRuntimeState,
  readDeploymentRuntimeState,
  removePersistedDeploymentRuntimeState,
  resetDeploymentRuntimeStateStoreForTests,
  resolveDeploymentRuntimeStateFile,
} from "./deployment-runtime-state-store.js";

const withTempStateFile = async (
  fn: (filePath: string) => Promise<void>
): Promise<void> => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "easyclaw-runtime-state-"));
  const previousStateFile = process.env.OPENCLAW_RUNTIME_STATE_FILE;
  const filePath = path.join(tempDir, "deployment-runtime-state.json");

  process.env.OPENCLAW_RUNTIME_STATE_FILE = filePath;
  resetDeploymentRuntimeStateStoreForTests();

  try {
    await fn(filePath);
  } finally {
    if (previousStateFile === undefined) {
      delete process.env.OPENCLAW_RUNTIME_STATE_FILE;
    } else {
      process.env.OPENCLAW_RUNTIME_STATE_FILE = previousStateFile;
    }
    resetDeploymentRuntimeStateStoreForTests();
    await rm(tempDir, { recursive: true, force: true });
  }
};

test("resolveDeploymentRuntimeStateFile defaults under a local state directory", () => {
  const previousStateFile = process.env.OPENCLAW_RUNTIME_STATE_FILE;
  delete process.env.OPENCLAW_RUNTIME_STATE_FILE;

  try {
    assert.match(
      resolveDeploymentRuntimeStateFile(),
      /state[\/\\]deployment-runtime-state\.json$/
    );
  } finally {
    if (previousStateFile === undefined) {
      delete process.env.OPENCLAW_RUNTIME_STATE_FILE;
    } else {
      process.env.OPENCLAW_RUNTIME_STATE_FILE = previousStateFile;
    }
  }
});

test("persistDeploymentRuntimeState writes and reads provider metadata from a JSON state file", async () => {
  await withTempStateFile(async (filePath) => {
    await persistDeploymentRuntimeState("dep-k8s", {
      provider: "k8s",
      k8sNamespace: " easyclaw-openclaw ",
    });
    await persistDeploymentRuntimeState("dep-docker", {
      provider: "docker",
      dockerTargetHost: " 144.91.74.92 ",
    });

    const persistedK8s = await getPersistedDeploymentRuntimeState("dep-k8s");
    const persistedDocker = await getPersistedDeploymentRuntimeState("dep-docker");

    assert.deepEqual(persistedK8s, {
      provider: "k8s",
      dockerTargetHost: null,
      k8sNamespace: "easyclaw-openclaw",
      updatedAt: persistedK8s?.updatedAt,
    });
    assert.deepEqual(persistedDocker, {
      provider: "docker",
      dockerTargetHost: "144.91.74.92",
      k8sNamespace: null,
      updatedAt: persistedDocker?.updatedAt,
    });

    const state = await readDeploymentRuntimeState(filePath);
    assert.equal(state["dep-k8s"]?.provider, "k8s");
    assert.equal(state["dep-k8s"]?.k8sNamespace, "easyclaw-openclaw");
    assert.equal(state["dep-docker"]?.dockerTargetHost, "144.91.74.92");
  });
});

test("removePersistedDeploymentRuntimeState deletes a stored runtime record", async () => {
  await withTempStateFile(async () => {
    await persistDeploymentRuntimeState("dep-k8s", {
      provider: "k8s",
      k8sNamespace: "easyclaw-openclaw",
    });

    await removePersistedDeploymentRuntimeState("dep-k8s");

    assert.equal(await getPersistedDeploymentRuntimeState("dep-k8s"), null);
  });
});
