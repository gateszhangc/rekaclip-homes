import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSshProbeCommand,
  buildSshProbeArgs,
  buildSshDockerTunnelArgs,
  canBypassRuntimeCatalogLookup,
  isLocalDockerTargetHost,
  parseOpenClawTargetNodeProbeOutput,
  resolveFixedOpenClawTargetHost,
  resolveOpenClawDeployMode,
  resolveOpenClawTargetHost,
  resolveOpenClawTargetHostPool,
  selectBestOpenClawTargetNode,
} from "./docker.js";

const withEnv = (
  overrides: Record<string, string | undefined>,
  fn: () => void
) => {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

test("resolveOpenClawTargetHost returns null when env is missing", () => {
  withEnv(
    {
      OPENCLAW_TARGET_HOST: undefined,
    },
    () => {
      assert.equal(resolveOpenClawTargetHost(), null);
    }
  );
});

test("resolveOpenClawTargetHost trims the configured host", () => {
  withEnv(
    {
      OPENCLAW_TARGET_HOST: " 89.167.51.48 ",
    },
    () => {
      assert.equal(resolveOpenClawTargetHost(), "89.167.51.48");
    }
  );
});

test("resolveOpenClawDeployMode defaults to pool", () => {
  withEnv(
    {
      OPENCLAW_DEPLOY_MODE: undefined,
    },
    () => {
      assert.equal(resolveOpenClawDeployMode(), "pool");
    }
  );
});

test("resolveOpenClawDeployMode accepts fixed", () => {
  withEnv(
    {
      OPENCLAW_DEPLOY_MODE: "fixed",
    },
    () => {
      assert.equal(resolveOpenClawDeployMode(), "fixed");
    }
  );
});

test("resolveFixedOpenClawTargetHost requires an explicit target host", () => {
  withEnv(
    {
      OPENCLAW_TARGET_HOST: undefined,
    },
    () => {
      assert.throws(
        () => resolveFixedOpenClawTargetHost(),
        /OPENCLAW_TARGET_HOST is required/i
      );
    }
  );
});

test("resolveFixedOpenClawTargetHost returns the explicit development node", () => {
  withEnv(
    {
      OPENCLAW_TARGET_HOST: " 167.86.98.202 ",
    },
    () => {
      assert.equal(resolveFixedOpenClawTargetHost(), "167.86.98.202");
    }
  );
});

test("isLocalDockerTargetHost matches the configured backend host", () => {
  withEnv(
    {
      BACKEND_SERVER_HOST: "144.91.114.233",
    },
    () => {
      assert.equal(isLocalDockerTargetHost("144.91.114.233"), true);
      assert.equal(isLocalDockerTargetHost("89.167.51.48"), false);
    }
  );
});

test("isLocalDockerTargetHost treats the fixed development node as local docker", () => {
  withEnv(
    {
      BACKEND_SERVER_HOST: "167.86.98.202",
      OPENCLAW_DEPLOY_MODE: "fixed",
      OPENCLAW_TARGET_HOST: "167.86.98.202",
    },
    () => {
      assert.equal(isLocalDockerTargetHost("167.86.98.202"), true);
      assert.equal(isLocalDockerTargetHost("144.91.114.233"), false);
    }
  );
});

test("resolveOpenClawTargetHostPool defaults to the built-in node pool", () => {
  withEnv(
    {
      OPENCLAW_TARGET_HOST: undefined,
      OPENCLAW_TARGET_HOST_POOL_JSON: undefined,
    },
    () => {
      assert.deepEqual(resolveOpenClawTargetHostPool(), [
        { host: "144.91.74.92" },
        { host: "144.91.66.233" },
        { host: "144.91.70.84" },
        { host: "144.91.64.239" },
      ]);
    }
  );
});

test("resolveOpenClawTargetHostPool accepts JSON strings and host objects", () => {
  withEnv(
    {
      OPENCLAW_TARGET_HOST: undefined,
      OPENCLAW_TARGET_HOST_POOL_JSON:
        '["89.167.51.48", {"host":"89.167.51.49"}, {"host":" 89.167.51.48 "}]',
    },
    () => {
      assert.deepEqual(resolveOpenClawTargetHostPool(), [
        { host: "89.167.51.48" },
        { host: "89.167.51.49" },
      ]);
    }
  );
});

test("resolveOpenClawTargetHostPool ignores legacy fixed-host config and keeps pool defaults", () => {
  withEnv(
    {
      OPENCLAW_TARGET_HOST: "89.167.51.50",
      OPENCLAW_TARGET_HOST_POOL_JSON: undefined,
    },
    () => {
      assert.deepEqual(resolveOpenClawTargetHostPool(), [
        { host: "144.91.74.92" },
        { host: "144.91.66.233" },
        { host: "144.91.70.84" },
        { host: "144.91.64.239" },
      ]);
    }
  );
});

test("parseOpenClawTargetNodeProbeOutput reads cpu and memory usage", () => {
  assert.deepEqual(
    parseOpenClawTargetNodeProbeOutput(
      "cpu=12.3 mem=48.7 image=1\n",
      "89.167.51.48"
    ),
    {
      host: "89.167.51.48",
      cpuPercent: 12.3,
      memoryPercent: 48.7,
      hasImage: true,
    }
  );
});

test("parseOpenClawTargetNodeProbeOutput rejects malformed output", () => {
  assert.throws(
    () => parseOpenClawTargetNodeProbeOutput("oops", "89.167.51.48"),
    /Invalid probe output/i
  );
});

test("selectBestOpenClawTargetNode keeps only nodes below both thresholds and picks the lowest max load", () => {
  assert.deepEqual(
    selectBestOpenClawTargetNode([
      { host: "89.167.51.48", cpuPercent: 68.1, memoryPercent: 64.2, hasImage: false },
      { host: "89.167.51.49", cpuPercent: 42.4, memoryPercent: 65.9, hasImage: false },
      { host: "89.167.51.50", cpuPercent: 71.0, memoryPercent: 20.0, hasImage: true },
      { host: "89.167.51.51", cpuPercent: 33.1, memoryPercent: 73.0, hasImage: true },
    ]),
    {
      host: "89.167.51.49",
      cpuPercent: 42.4,
      memoryPercent: 65.9,
      hasImage: false,
    }
  );
});

test("selectBestOpenClawTargetNode returns null when every node is above threshold", () => {
  assert.equal(
    selectBestOpenClawTargetNode([
      { host: "89.167.51.48", cpuPercent: 70.0, memoryPercent: 60.0, hasImage: false },
      { host: "89.167.51.49", cpuPercent: 60.0, memoryPercent: 70.0, hasImage: true },
    ]),
    null
  );
});

test("selectBestOpenClawTargetNode keeps pool order when two nodes have the same max load", () => {
  assert.deepEqual(
    selectBestOpenClawTargetNode([
      { host: "89.167.51.48", cpuPercent: 42.0, memoryPercent: 55.0, hasImage: true },
      { host: "144.91.114.233", cpuPercent: 55.0, memoryPercent: 42.0, hasImage: true },
    ]),
    {
      host: "89.167.51.48",
      cpuPercent: 42.0,
      memoryPercent: 55.0,
      hasImage: true,
    }
  );
});

test("selectBestOpenClawTargetNode prefers warm nodes over colder-but-empty nodes", () => {
  assert.deepEqual(
    selectBestOpenClawTargetNode([
      { host: "144.91.114.233", cpuPercent: 4.0, memoryPercent: 5.0, hasImage: false },
      { host: "161.97.165.119", cpuPercent: 22.0, memoryPercent: 18.0, hasImage: true },
    ]),
    {
      host: "161.97.165.119",
      cpuPercent: 22.0,
      memoryPercent: 18.0,
      hasImage: true,
    }
  );
});

test("buildSshProbeCommand checks docker availability and image warmth", () => {
  const command = buildSshProbeCommand("fourplayers/openclaw:2026.3.23-2", 250);
  assert.match(command, /command -v docker/);
  assert.match(command, /docker info/);
  assert.match(command, /docker image inspect "fourplayers\/openclaw:2026\.3\.23-2"/);
  assert.match(command, /printf 'cpu=%s mem=%s image=%s\\n' "\$cpu" "\$mem" "\$image"/);
});

test("canBypassRuntimeCatalogLookup only allows prevalidated homepage models", () => {
  assert.equal(canBypassRuntimeCatalogLookup("openrouter/openai/gpt-5.4"), true);
  assert.equal(canBypassRuntimeCatalogLookup("openrouter/anthropic/claude-opus-4"), true);
  assert.equal(canBypassRuntimeCatalogLookup("anthropic/claude-opus-4-6"), false);
});

test("buildSshDockerTunnelArgs uses root and forwards the remote docker socket", () => {
  assert.deepEqual(buildSshDockerTunnelArgs("89.167.51.48", 23751), [
    "-o",
    "BatchMode=yes",
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    "UserKnownHostsFile=/dev/null",
    "-o",
    "LogLevel=ERROR",
    "-o",
    "ExitOnForwardFailure=yes",
    "-o",
    "ServerAliveInterval=15",
    "-o",
    "ServerAliveCountMax=3",
    "-N",
    "-L",
    "127.0.0.1:23751:/var/run/docker.sock",
    "root@89.167.51.48",
  ]);
});

test("buildSshProbeArgs disables host key checks for pool probes", () => {
  assert.deepEqual(buildSshProbeArgs("89.167.51.48", 5000), [
    "-T",
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=5",
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    "UserKnownHostsFile=/dev/null",
    "-o",
    "LogLevel=ERROR",
    "root@89.167.51.48",
    "sh",
  ]);
});
