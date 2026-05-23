import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import net from "node:net";
import { Writable } from "node:stream";
import Docker from "dockerode";
import { v4 as uuidv4 } from "uuid";
import { assignFreshAccount } from "./account-pool.js";
import { dockerLogger, deployLogger } from "../utils/logger.js";

const resolveSocketPath = () => {
  const host = process.env.DOCKER_HOST || "unix:///var/run/docker.sock";
  if (host.startsWith("unix://")) {
    return host.replace("unix://", "");
  }
  return host;
};

const docker = new Docker({ socketPath: resolveSocketPath() });
const SSH_USER = "root";
const REMOTE_DOCKER_SOCKET_PATH = "/var/run/docker.sock";
const DEFAULT_OPENCLAW_TARGET_HOST_POOL = [
  { host: "144.91.74.92" },
  { host: "144.91.66.233" },
  { host: "144.91.70.84" },
  { host: "144.91.64.239" },
] as const;
const SSH_TUNNEL_READY_TIMEOUT_MS = Number(
  process.env.OPENCLAW_SSH_TUNNEL_READY_TIMEOUT_MS || 10_000
);
const SSH_TUNNEL_POLL_INTERVAL_MS = 150;
const SSH_HOST_KEY_BYPASS_ARGS = [
  "-o",
  "StrictHostKeyChecking=no",
  "-o",
  "UserKnownHostsFile=/dev/null",
  "-o",
  "LogLevel=ERROR",
] as const;
const OPENCLAW_TARGET_NODE_MAX_CPU_PERCENT = Number(
  process.env.OPENCLAW_TARGET_NODE_MAX_CPU_PERCENT || 70
);
const OPENCLAW_TARGET_NODE_MAX_MEMORY_PERCENT = Number(
  process.env.OPENCLAW_TARGET_NODE_MAX_MEMORY_PERCENT || 70
);
const OPENCLAW_TARGET_NODE_PROBE_TIMEOUT_MS = Number(
  process.env.OPENCLAW_TARGET_NODE_PROBE_TIMEOUT_MS || 5_000
);
const OPENCLAW_TARGET_NODE_CPU_SAMPLE_MS = Number(
  process.env.OPENCLAW_TARGET_NODE_CPU_SAMPLE_MS || 250
);
const OPENCLAW_POOL_PREWARM_ENABLED =
  process.env.OPENCLAW_POOL_PREWARM_ENABLED !== "false";
const OPENCLAW_POOL_PREWARM_CONCURRENCY = Math.max(
  1,
  Math.floor(Number(process.env.OPENCLAW_POOL_PREWARM_CONCURRENCY || 1)) || 1
);
const OPENCLAW_POOL_PREWARM_INTERVAL_MS = Math.max(
  0,
  Math.floor(Number(process.env.OPENCLAW_POOL_PREWARM_INTERVAL_MS || 0)) || 0
);

type DockerRuntime = {
  client: Docker;
  targetHost: string | null;
  dispose: () => Promise<void>;
};

export type OpenClawTargetNode = {
  host: string;
};

export type OpenClawTargetNodeProbe = {
  host: string;
  cpuPercent: number;
  memoryPercent: number;
  hasImage: boolean;
};

export const NO_AVAILABLE_NODE_ERROR_CODE = "NO_AVAILABLE_NODE";
export type OpenClawDeployMode = "pool" | "fixed";

const LOCAL_TARGET_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const NO_SUCH_IMAGE_PATTERN = /no such image/i;
const NO_SUCH_OBJECT_PATTERN = /no such (image|object)/i;
const IMAGE_NAME =
  process.env.OPENCLAW_IMAGE || "fourplayers/openclaw:2026.3.23-2";
let openClawPoolPrewarmLoopStarted = false;
let openClawPoolPrewarmRunInFlight = false;

const normalizeHost = (value: string): string => value.trim().toLowerCase();

const resolveBackendServerHost = (): string | null => {
  const raw = process.env.BACKEND_SERVER_HOST?.trim();
  if (!raw) {
    return null;
  }

  try {
    return normalizeHost(new URL(raw).hostname);
  } catch {
    return normalizeHost(raw);
  }
};

export const isLocalDockerTargetHost = (
  targetHost?: string | null
): boolean => {
  const normalizedTargetHost =
    typeof targetHost === "string" && targetHost.trim()
      ? normalizeHost(targetHost)
      : null;

  if (!normalizedTargetHost) {
    return true;
  }

  if (LOCAL_TARGET_HOSTS.has(normalizedTargetHost)) {
    return true;
  }

  const backendServerHost = resolveBackendServerHost();
  return backendServerHost !== null && normalizedTargetHost === backendServerHost;
};

export const resolveOpenClawTargetHost = (): string | null => {
  const raw = process.env.OPENCLAW_TARGET_HOST?.trim();
  return raw && raw.length > 0 ? raw : null;
};

export const resolveOpenClawDeployMode = (): OpenClawDeployMode => {
  const raw = process.env.OPENCLAW_DEPLOY_MODE?.trim().toLowerCase();
  if (raw === "fixed") {
    return "fixed";
  }

  return "pool";
};

export const resolveFixedOpenClawTargetHost = (): string => {
  const targetHost = resolveOpenClawTargetHost();
  if (!targetHost) {
    throw new Error(
      "OPENCLAW_TARGET_HOST is required when OPENCLAW_DEPLOY_MODE=fixed"
    );
  }

  return targetHost;
};

const uniqueTargetNodes = (nodes: OpenClawTargetNode[]): OpenClawTargetNode[] => {
  const seen = new Set<string>();
  const resolved: OpenClawTargetNode[] = [];

  for (const node of nodes) {
    const host = node.host.trim();
    if (!host || seen.has(host)) {
      continue;
    }
    seen.add(host);
    resolved.push({ host });
  }

  return resolved;
};

export const resolveOpenClawTargetHostPool = (): OpenClawTargetNode[] => {
  const rawPool = process.env.OPENCLAW_TARGET_HOST_POOL_JSON?.trim();
  if (rawPool) {
    const parsed = JSON.parse(rawPool);
    if (!Array.isArray(parsed)) {
      throw new Error("OPENCLAW_TARGET_HOST_POOL_JSON must be a JSON array");
    }

    const resolvedPool = uniqueTargetNodes(
      parsed
        .map((entry) =>
          typeof entry === "string"
            ? { host: entry }
            : typeof entry?.host === "string"
              ? { host: entry.host }
              : null
        )
        .filter((entry): entry is OpenClawTargetNode => entry !== null)
    );

    if (resolvedPool.length > 0) {
      return resolvedPool;
    }
  }

  return [...DEFAULT_OPENCLAW_TARGET_HOST_POOL];
};

export const buildSshProbeCommand = (
  imageName: string = IMAGE_NAME,
  cpuSampleMs: number = OPENCLAW_TARGET_NODE_CPU_SAMPLE_MS
): string => {
  const sampleSeconds = Math.max(cpuSampleMs, 50) / 1000;
  const imageLiteral = JSON.stringify(imageName);

  return [
    "set -eu",
    "command -v docker >/dev/null 2>&1",
    "docker info >/dev/null 2>&1",
    "read _ u1 n1 s1 i1 io1 irq1 sirq1 steal1 _ < /proc/stat",
    "total1=$((u1+n1+s1+i1+io1+irq1+sirq1+steal1))",
    "idle1=$((i1+io1))",
    `sleep ${sampleSeconds.toFixed(3)}`,
    "read _ u2 n2 s2 i2 io2 irq2 sirq2 steal2 _ < /proc/stat",
    "total2=$((u2+n2+s2+i2+io2+irq2+sirq2+steal2))",
    "idle2=$((i2+io2))",
    "cpu=$(awk -v t1=\"$total1\" -v t2=\"$total2\" -v i1=\"$idle1\" -v i2=\"$idle2\" 'BEGIN { dt=t2-t1; di=i2-i1; if (dt <= 0) { printf \"0.0\" } else { printf \"%.1f\", ((dt-di)*100)/dt } }')",
    "mem=$(awk '/MemTotal:/ { total=$2 } /MemAvailable:/ { avail=$2 } END { if (total <= 0) { printf \"0.0\" } else { printf \"%.1f\", ((total-avail)*100)/total } }' /proc/meminfo)",
    `if docker image inspect ${imageLiteral} >/dev/null 2>&1; then image=1; else image=0; fi`,
    "printf 'cpu=%s mem=%s image=%s\\n' \"$cpu\" \"$mem\" \"$image\"",
  ].join("; ");
};

export const parseOpenClawTargetNodeProbeOutput = (
  output: string,
  host: string
): OpenClawTargetNodeProbe => {
  const match = output.match(
    /cpu=(\d+(?:\.\d+)?)\s+mem=(\d+(?:\.\d+)?)(?:\s+image=(0|1))?/i
  );
  if (!match) {
    throw new Error(`Invalid probe output for ${host}: ${output.trim() || "<empty>"}`);
  }

  const cpuPercent = Number(match[1]);
  const memoryPercent = Number(match[2]);
  if (!Number.isFinite(cpuPercent) || !Number.isFinite(memoryPercent)) {
    throw new Error(`Invalid numeric probe output for ${host}: ${output.trim() || "<empty>"}`);
  }

  return {
    host,
    cpuPercent,
    memoryPercent,
    hasImage: match[3] === "1",
  };
};

export const selectBestOpenClawTargetNode = (
  probes: OpenClawTargetNodeProbe[],
  thresholds: {
    maxCpuPercent?: number;
    maxMemoryPercent?: number;
  } = {}
): OpenClawTargetNodeProbe | null => {
  const maxCpuPercent =
    thresholds.maxCpuPercent ?? OPENCLAW_TARGET_NODE_MAX_CPU_PERCENT;
  const maxMemoryPercent =
    thresholds.maxMemoryPercent ?? OPENCLAW_TARGET_NODE_MAX_MEMORY_PERCENT;

  const eligible = probes.filter(
    (probe) =>
      probe.cpuPercent < maxCpuPercent && probe.memoryPercent < maxMemoryPercent
  );

  if (eligible.length === 0) {
    return null;
  }

  const preferred = eligible.filter((probe) => probe.hasImage);
  const candidatePool = preferred.length > 0 ? preferred : eligible;

  return candidatePool.reduce((best, current) => {
    const currentScore = Math.max(current.cpuPercent, current.memoryPercent);
    const bestScore = Math.max(best.cpuPercent, best.memoryPercent);
    return currentScore < bestScore ? current : best;
  });
};

const isDockerImageMissingError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const statusCode = (error as { statusCode?: number }).statusCode;
  const message =
    error instanceof Error ? error.message : String(error ?? "");

  return (
    statusCode === 404 ||
    NO_SUCH_IMAGE_PATTERN.test(message) ||
    NO_SUCH_OBJECT_PATTERN.test(message)
  );
};

const hasDockerImage = async (
  client: Docker,
  imageName: string
): Promise<boolean> => {
  try {
    await client.getImage(imageName).inspect();
    return true;
  } catch (error) {
    if (isDockerImageMissingError(error)) {
      return false;
    }
    throw error;
  }
};

const readCpuSample = async (): Promise<{ total: number; idle: number }> => {
  const stat = await readFile("/proc/stat", "utf8");
  const cpuLine = stat
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("cpu "));

  if (!cpuLine) {
    throw new Error("Missing cpu line in /proc/stat");
  }

  const values = cpuLine
    .split(/\s+/)
    .slice(1)
    .map((value) => Number(value));

  if (values.length < 8 || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`Invalid cpu sample from /proc/stat: ${cpuLine}`);
  }

  const total = values
    .slice(0, 8)
    .reduce((sum, value) => sum + value, 0);
  const idle = values[3] + values[4];

  return { total, idle };
};

const readMemoryPercent = async (): Promise<number> => {
  const meminfo = await readFile("/proc/meminfo", "utf8");
  const totalMatch = meminfo.match(/^MemTotal:\s+(\d+)/m);
  const availableMatch = meminfo.match(/^MemAvailable:\s+(\d+)/m);
  if (!totalMatch || !availableMatch) {
    throw new Error("Missing memory fields in /proc/meminfo");
  }

  const total = Number(totalMatch[1]);
  const available = Number(availableMatch[1]);
  if (!Number.isFinite(total) || !Number.isFinite(available) || total <= 0) {
    throw new Error("Invalid memory sample from /proc/meminfo");
  }

  return Number((((total - available) * 100) / total).toFixed(1));
};

const probeLocalOpenClawTargetNode = async (
  host: string,
  cpuSampleMs: number = OPENCLAW_TARGET_NODE_CPU_SAMPLE_MS
): Promise<OpenClawTargetNodeProbe> => {
  const sampleDelayMs = Math.max(cpuSampleMs, 50);
  const firstSample = await readCpuSample();
  await new Promise((resolve) => setTimeout(resolve, sampleDelayMs));
  const secondSample = await readCpuSample();

  const deltaTotal = secondSample.total - firstSample.total;
  const deltaIdle = secondSample.idle - firstSample.idle;
  const cpuPercent =
    deltaTotal <= 0
      ? 0
      : Number((((deltaTotal - deltaIdle) * 100) / deltaTotal).toFixed(1));

  return {
    host,
    cpuPercent,
    memoryPercent: await readMemoryPercent(),
    hasImage: await hasDockerImage(docker, IMAGE_NAME),
  };
};

export const buildSshProbeArgs = (
  targetHost: string,
  timeoutMs: number = OPENCLAW_TARGET_NODE_PROBE_TIMEOUT_MS
): string[] => [
  "-T",
  "-o",
  "BatchMode=yes",
  "-o",
  `ConnectTimeout=${Math.max(1, Math.ceil(timeoutMs / 1000))}`,
  ...SSH_HOST_KEY_BYPASS_ARGS,
  `${SSH_USER}@${targetHost}`,
  "sh",
];

const runSshScript = async (
  targetHost: string,
  script: string,
  timeoutMs: number = OPENCLAW_TARGET_NODE_PROBE_TIMEOUT_MS
): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn("ssh", buildSshProbeArgs(targetHost, timeoutMs), {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finalize = (error?: Error, output?: string) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (error) {
        reject(error);
        return;
      }
      resolve(output || "");
    };

    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.once("error", (error) => {
      finalize(
        new Error(`Failed to start SSH probe to ${SSH_USER}@${targetHost}: ${error.message}`)
      );
    });
    child.once("close", (code, signal) => {
      if (code === 0) {
        finalize(undefined, stdout);
        return;
      }

      const detail = stderr.trim();
      const status =
        signal !== null
          ? `signal=${signal}`
          : code !== null
            ? `exit=${code}`
            : "unknown exit";
      finalize(
        new Error(
          `SSH probe to ${SSH_USER}@${targetHost} failed (${status})${
            detail ? `: ${detail}` : ""
          }`
        )
      );
    });

    const timeout = setTimeout(() => {
      void stopChildProcess(child);
      finalize(
        new Error(
          `Timed out probing ${SSH_USER}@${targetHost}${
            stderr.trim() ? `: ${stderr.trim()}` : ""
          }`
        )
      );
    }, timeoutMs);
    timeout.unref();

    child.stdin?.end(`${script}\n`);
  });

const probeOpenClawTargetNode = async (
  node: OpenClawTargetNode
): Promise<OpenClawTargetNodeProbe> => {
  if (isLocalDockerTargetHost(node.host)) {
    return probeLocalOpenClawTargetNode(node.host);
  }

  const output = await runSshScript(node.host, buildSshProbeCommand());
  return parseOpenClawTargetNodeProbeOutput(output, node.host);
};

export const selectOpenClawTargetHost = async (): Promise<string | null> => {
  const deployMode = resolveOpenClawDeployMode();
  if (deployMode === "fixed") {
    return resolveFixedOpenClawTargetHost();
  }

  const pool = resolveOpenClawTargetHostPool();
  if (pool.length === 0) {
    return null;
  }

  const probes = (
    await Promise.all(
      pool.map(async (node) => {
        try {
          const probe = await probeOpenClawTargetNode(node);
          dockerLogger.info(
            {
              host: node.host,
              cpuPercent: probe.cpuPercent,
              memoryPercent: probe.memoryPercent,
              hasImage: probe.hasImage,
            },
            "OpenClaw target node probe completed"
          );
          return probe;
        } catch (error) {
          dockerLogger.warn(
            {
              host: node.host,
              error: error instanceof Error ? error.message : String(error),
            },
            "OpenClaw target node probe failed"
          );
          return null;
        }
      })
    )
  ).filter((probe): probe is OpenClawTargetNodeProbe => probe !== null);

  const selected = selectBestOpenClawTargetNode(probes);
  if (!selected) {
    throw new Error(NO_AVAILABLE_NODE_ERROR_CODE);
  }

  dockerLogger.info(
    {
      selectedHost: selected.host,
      cpuPercent: selected.cpuPercent,
      memoryPercent: selected.memoryPercent,
      hasImage: selected.hasImage,
      candidateCount: probes.length,
    },
    "Selected OpenClaw target node from pool"
  );

  return selected.host;
};

export const buildSshDockerTunnelArgs = (
  targetHost: string,
  localPort: number
): string[] => [
  "-o",
  "BatchMode=yes",
  ...SSH_HOST_KEY_BYPASS_ARGS,
  "-o",
  "ExitOnForwardFailure=yes",
  "-o",
  "ServerAliveInterval=15",
  "-o",
  "ServerAliveCountMax=3",
  "-N",
  "-L",
  `127.0.0.1:${localPort}:${REMOTE_DOCKER_SOCKET_PATH}`,
  `${SSH_USER}@${targetHost}`,
];

const getAvailableLocalPort = async (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate a local port")));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });

const isPortOpen = async (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = new net.Socket();

    const finish = (open: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, "127.0.0.1");
  });

const waitForTunnelReady = async (
  targetHost: string,
  port: number,
  child: ReturnType<typeof spawn>
): Promise<void> => {
  const deadline = Date.now() + SSH_TUNNEL_READY_TIMEOUT_MS;
  let stderr = "";
  let childErrorMessage: string | null = null;

  const onStderr = (chunk: Buffer | string) => {
    stderr += chunk.toString();
  };
  const onError = (error: Error) => {
    childErrorMessage = error.message;
  };

  child.stderr?.on("data", onStderr);
  child.once("error", onError);

  try {
    while (Date.now() < deadline) {
      if (childErrorMessage) {
        throw new Error(
          `Failed to start SSH tunnel to ${SSH_USER}@${targetHost}: ${childErrorMessage}`
        );
      }

      if (child.exitCode !== null) {
        const details = stderr.trim();
        throw new Error(
          `SSH tunnel to ${SSH_USER}@${targetHost} exited early${
            details ? `: ${details}` : ""
          }`
        );
      }

      if (await isPortOpen(port)) {
        return;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, SSH_TUNNEL_POLL_INTERVAL_MS)
      );
    }
  } finally {
    child.stderr?.off("data", onStderr);
    child.off("error", onError);
  }

  const details = stderr.trim();
  throw new Error(
    `Timed out waiting for SSH tunnel to ${SSH_USER}@${targetHost}${
      details ? `: ${details}` : ""
    }`
  );
};

const stopChildProcess = async (
  child: ReturnType<typeof spawn>
): Promise<void> =>
  new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }

    const finalize = () => {
      child.removeAllListeners("exit");
      child.removeAllListeners("error");
      resolve();
    };

    child.once("exit", finalize);
    child.once("error", finalize);
    child.kill("SIGTERM");

    setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
    }, 1_000).unref();
  });

const createDockerRuntime = async (
  targetHost: string | null
): Promise<DockerRuntime> => {
  if (isLocalDockerTargetHost(targetHost)) {
    return {
      client: docker,
      targetHost: targetHost || null,
      dispose: async () => {},
    };
  }

  if (!targetHost) {
    throw new Error("Missing target host for remote Docker runtime");
  }

  const localPort = await getAvailableLocalPort();
  const child = spawn("ssh", buildSshDockerTunnelArgs(targetHost, localPort), {
    stdio: ["ignore", "ignore", "pipe"],
  });

  try {
    await waitForTunnelReady(targetHost, localPort, child);
  } catch (error) {
    await stopChildProcess(child);
    throw error;
  }

  return {
    client: new Docker({ host: "127.0.0.1", port: localPort, protocol: "http" }),
    targetHost,
    dispose: async () => {
      await stopChildProcess(child);
    },
  };
};

const withDockerRuntime = async <T>(
  targetHost: string | null,
  fn: (runtime: DockerRuntime) => Promise<T>
): Promise<T> => {
  const runtime = await createDockerRuntime(targetHost);
  try {
    return await fn(runtime);
  } finally {
    await runtime.dispose();
  }
};

export type OpenClawContainerStatus = {
  exists: boolean;
  name: string;
  id?: string;
  status?: string;
  running?: boolean;
  exitCode?: number;
  startedAt?: string;
  finishedAt?: string;
};

export const inspectOpenClawContainer = async (
  deploymentId: string,
  targetHost?: string | null
): Promise<OpenClawContainerStatus> => {
  const name = `openclaw-${deploymentId}`;
  return withDockerRuntime(targetHost || null, async ({ client }) => {
    try {
      const inspection = await client.getContainer(name).inspect();
      return {
        exists: true,
        name,
        id: inspection.Id,
        status: inspection.State?.Status,
        running: inspection.State?.Running,
        exitCode: inspection.State?.ExitCode,
        startedAt: inspection.State?.StartedAt,
        finishedAt: inspection.State?.FinishedAt,
      };
    } catch (error: any) {
      const statusCode = error?.statusCode;
      const message = error instanceof Error ? error.message : String(error);
      if (statusCode === 404 || /no such container/i.test(message)) {
        return { exists: false, name };
      }
      throw error;
    }
  });
};

const STABILITY_WAIT_MS = Number(process.env.OPENCLAW_STABILITY_WAIT_MS || 3000);
// First-time boot/config can take a few minutes (browser/skills prep, etc.)
const READY_WAIT_MS = Number(
  process.env.OPENCLAW_READY_WAIT_MS ||
    process.env.OPENCLAW_CONFIG_WAIT_MS ||
    300_000
);
const GATEWAY_MODE = process.env.OPENCLAW_GATEWAY_MODE || "local";
const OPENCLAW_CLI_TIMEOUT_MS = Number(
  process.env.OPENCLAW_CLI_TIMEOUT_MS || 300_000
);
const OPENCLAW_UPDATE_TIMEOUT_MS = Number(
  process.env.OPENCLAW_UPDATE_TIMEOUT_MS || 600_000
);
const OPENCLAW_VOLUME_PREPARE_TIMEOUT_MS = Number(
  process.env.OPENCLAW_VOLUME_PREPARE_TIMEOUT_MS || 120_000
);
const OPENCLAW_AUTO_UPDATE_FOR_OPENROUTER =
  process.env.OPENCLAW_AUTO_UPDATE_FOR_OPENROUTER === "true";
const CHANNEL_READY_STABILITY_MS = Number(
  process.env.OPENCLAW_CHANNEL_READY_STABILITY_MS ||
    process.env.OPENCLAW_TELEGRAM_READY_STABILITY_MS ||
    1500
);
const OPENCLAW_CHANNEL_STATUS_TIMEOUT_MS = Number(
  process.env.OPENCLAW_CHANNEL_STATUS_TIMEOUT_MS || 15_000
);
const OPENCLAW_STRICT_MODEL_MATCH =
  process.env.OPENCLAW_STRICT_MODEL_MATCH !== "false";
const OPENCLAW_HOME_DIR = "/home/node/.openclaw";
const OPENCLAW_IMAGE_BUILD_DATE_FILE = "/IMAGE_BUILD_DATE";
const OPENCLAW_LAST_IMAGE_UPDATE_FILE = `${OPENCLAW_HOME_DIR}/.last_image_update`;
const OPENCLAW_VOLUME_PREPARED_MARKER = "OPENCLAW_IMAGE_MARKER_WRITTEN=1";
const OPENCLAW_VOLUME_MISSING_MARKER = "OPENCLAW_IMAGE_MARKER_WRITTEN=0";

const waitForPull = (client: Docker, stream: NodeJS.ReadableStream) =>
  new Promise<void>((resolve, reject) => {
    client.modem.followProgress(stream, (err: Error | null) =>
      err ? reject(err) : resolve()
    );
  });

const ensureImage = async (
  client: Docker,
  imageName: string,
  deploymentId?: string
) => {
  const log = deploymentId ? deployLogger(deploymentId) : dockerLogger;
  try {
    await client.getImage(imageName).inspect();
    log.info({ image: imageName }, "Docker image found locally");
  } catch (error) {
    log.info({ image: imageName }, "Image not found locally, pulling...");
    try {
      const stream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => {
        client.pull(
          imageName,
          (err: Error | null, pullStream?: NodeJS.ReadableStream) => {
            if (err) {
              reject(err);
              return;
            }
            if (!pullStream) {
              reject(new Error("Docker pull returned empty stream"));
              return;
            }
            resolve(pullStream);
          }
        );
      });
      await waitForPull(client, stream);
    } catch (pullError) {
      const message =
        pullError instanceof Error ? pullError.message : "unknown pull error";
      throw new Error(
        `OpenClaw image unavailable: ${imageName}. Pull failed: ${message}`
      );
    }
  }
};

const prewarmOpenClawImageOnHost = async (targetHost: string): Promise<void> => {
  const log = dockerLogger.child({
    task: "openclaw_image_prewarm",
    targetHost,
    image: IMAGE_NAME,
  });

  try {
    await withDockerRuntime(targetHost, async ({ client, targetHost: runtimeHost }) => {
      const resolvedTargetHost = runtimeHost || "<local>";
      if (await hasDockerImage(client, IMAGE_NAME)) {
        log.info(
          { targetHost: resolvedTargetHost },
          "OpenClaw image already warm on target node"
        );
        return;
      }

      log.info(
        { targetHost: resolvedTargetHost },
        "Prewarming OpenClaw image on target node"
      );
      await ensureImage(client, IMAGE_NAME);
      log.info(
        { targetHost: resolvedTargetHost },
        "Completed OpenClaw image prewarm on target node"
      );
    });
  } catch (error) {
    log.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to prewarm OpenClaw image on target node"
    );
  }
};

const runOpenClawPoolPrewarmOnce = async (): Promise<void> => {
  if (openClawPoolPrewarmRunInFlight) {
    return;
  }

  if (!OPENCLAW_POOL_PREWARM_ENABLED || resolveOpenClawDeployMode() !== "pool") {
    return;
  }

  const pool = resolveOpenClawTargetHostPool();
  if (pool.length === 0) {
    return;
  }

  openClawPoolPrewarmRunInFlight = true;
  dockerLogger.info(
    {
      candidateCount: pool.length,
      concurrency: OPENCLAW_POOL_PREWARM_CONCURRENCY,
      image: IMAGE_NAME,
    },
    "Starting OpenClaw pool image prewarm"
  );

  let nextIndex = 0;
  try {
    const workers = Array.from(
      { length: Math.min(OPENCLAW_POOL_PREWARM_CONCURRENCY, pool.length) },
      async () => {
        while (true) {
          const currentIndex = nextIndex;
          nextIndex += 1;
          const node = pool[currentIndex];
          if (!node) {
            return;
          }
          await prewarmOpenClawImageOnHost(node.host);
        }
      }
    );

    await Promise.all(workers);
    dockerLogger.info(
      { candidateCount: pool.length, image: IMAGE_NAME },
      "Completed OpenClaw pool image prewarm"
    );
  } finally {
    openClawPoolPrewarmRunInFlight = false;
  }
};

export const startOpenClawPoolPrewarmLoop = (): void => {
  if (openClawPoolPrewarmLoopStarted) {
    return;
  }
  openClawPoolPrewarmLoopStarted = true;

  if (!OPENCLAW_POOL_PREWARM_ENABLED) {
    dockerLogger.info("OpenClaw pool image prewarm disabled");
    return;
  }

  if (resolveOpenClawDeployMode() !== "pool") {
    dockerLogger.info(
      { deployMode: resolveOpenClawDeployMode() },
      "Skipping OpenClaw pool image prewarm outside pool mode"
    );
    return;
  }

  void runOpenClawPoolPrewarmOnce().catch((error) => {
    dockerLogger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "OpenClaw pool image prewarm run failed"
    );
  });

  if (OPENCLAW_POOL_PREWARM_INTERVAL_MS <= 0) {
    return;
  }

  const timer = setInterval(() => {
    void runOpenClawPoolPrewarmOnce().catch((error) => {
      dockerLogger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        "Scheduled OpenClaw pool image prewarm run failed"
      );
    });
  }, OPENCLAW_POOL_PREWARM_INTERVAL_MS);
  timer.unref();

  dockerLogger.info(
    {
      intervalMs: OPENCLAW_POOL_PREWARM_INTERVAL_MS,
      concurrency: OPENCLAW_POOL_PREWARM_CONCURRENCY,
      image: IMAGE_NAME,
    },
    "Scheduled periodic OpenClaw pool image prewarm"
  );
};

const stripUnsafeControlChars = (value: string) =>
  value
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

const tryDecodeDockerMultiplexedLogs = (raw: Buffer): string | null => {
  if (raw.length < 8) {
    return null;
  }

  let offset = 0;
  const chunks: string[] = [];

  while (offset + 8 <= raw.length) {
    const streamType = raw[offset];
    // docker multiplex header: [stream][0][0][0][size:4-byte-be]
    if (
      (streamType !== 0 && streamType !== 1 && streamType !== 2 && streamType !== 3) ||
      raw[offset + 1] !== 0 ||
      raw[offset + 2] !== 0 ||
      raw[offset + 3] !== 0
    ) {
      return null;
    }

    const frameSize = raw.readUInt32BE(offset + 4);
    const start = offset + 8;
    const end = start + frameSize;

    if (end > raw.length) {
      return null;
    }

    if (frameSize > 0) {
      chunks.push(raw.subarray(start, end).toString("utf-8"));
    }
    offset = end;
  }

  // Any trailing bytes means this buffer isn't a clean multiplexed stream.
  if (offset !== raw.length) {
    return null;
  }

  return chunks.join("");
};

const decodeLogs = (rawLogs: unknown) => {
  if (Buffer.isBuffer(rawLogs)) {
    const decoded =
      tryDecodeDockerMultiplexedLogs(rawLogs) ?? rawLogs.toString("utf-8");
    return stripUnsafeControlChars(decoded);
  }
  if (typeof rawLogs === "string") {
    return stripUnsafeControlChars(rawLogs);
  }
  return "";
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type DeployChannel = "telegram" | "discord" | "whatsapp";
export const DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE =
  "DISCORD_MESSAGE_CONTENT_INTENT_DISABLED";
export const WHATSAPP_K8S_ONLY_ERROR_CODE = "WHATSAPP_K8S_ONLY";

export type OpenClawChannelStatus = {
  running: boolean;
  lastError: string | null;
  messageContentIntent: string | null;
};

export const buildOpenClawVolumePrepScript = () =>
  [
    "set -eu",
    `mkdir -p ${OPENCLAW_HOME_DIR}`,
    `if [ -f ${OPENCLAW_IMAGE_BUILD_DATE_FILE} ]; then`,
    `  cat ${OPENCLAW_IMAGE_BUILD_DATE_FILE} > ${OPENCLAW_LAST_IMAGE_UPDATE_FILE}`,
    `  echo ${OPENCLAW_VOLUME_PREPARED_MARKER}`,
    "else",
    `  echo ${OPENCLAW_VOLUME_MISSING_MARKER}`,
    `  echo "${OPENCLAW_IMAGE_BUILD_DATE_FILE} missing; skipping marker write" >&2`,
    "fi",
    `chown -R node:node ${OPENCLAW_HOME_DIR}`,
  ].join("\n");

export const parseOpenClawVolumePrepLogs = (
  logs: string
): "written" | "missing" | "unknown" => {
  if (logs.includes(OPENCLAW_VOLUME_PREPARED_MARKER)) {
    return "written";
  }
  if (logs.includes(OPENCLAW_VOLUME_MISSING_MARKER)) {
    return "missing";
  }
  return "unknown";
};

export const buildGatewayBootstrapConfigCommands = (
  gatewayMode: string = GATEWAY_MODE
) => [
  ["config", "set", "gateway.mode", gatewayMode],
  [
    "config",
    "set",
    "--strict-json",
    "gateway.controlUi.dangerouslyDisableDeviceAuth",
    "true",
  ],
  [
    "config",
    "set",
    "--strict-json",
    "gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback",
    "true",
  ],
];

const parseJsonObjectFromOutput = (output: string): any => {
  const trimmed = output.trim();
  if (!trimmed) {
    throw new Error("Empty JSON output");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const jsonStart = trimmed.indexOf("{");
    const jsonEnd = trimmed.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      throw new Error(`Invalid JSON output: ${trimmed.slice(0, 200)}`);
    }
    return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
  }
};

const parseModelKeysFromCatalog = (output: string): string[] => {
  const parsed = parseJsonObjectFromOutput(output);
  const models = parsed?.models;
  if (!Array.isArray(models)) {
    return [];
  }

  const keys = new Set<string>();
  for (const item of models) {
    if (typeof item?.key === "string" && item.key.trim()) {
      keys.add(item.key.trim());
    }
  }
  return Array.from(keys);
};

export const parseOpenClawChannelStatus = (
  output: string,
  channel: DeployChannel
): OpenClawChannelStatus => {
  const parsed = parseJsonObjectFromOutput(output);
  const snapshot = parsed?.[channel] || parsed?.channels?.[channel];
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error(`channels status JSON missing ${channel} channel`);
  }

  const lastErrorRaw = snapshot.lastError ?? snapshot.last_error ?? null;
  const messageContentIntentRaw =
    channel === "discord"
      ? parsed?.channelAccounts?.discord?.[0]?.application?.intents
          ?.messageContent ?? null
      : null;
  return {
    running: snapshot.running === true,
    lastError:
      lastErrorRaw === null || lastErrorRaw === undefined || lastErrorRaw === ""
        ? null
        : String(lastErrorRaw),
    messageContentIntent:
      messageContentIntentRaw === null ||
      messageContentIntentRaw === undefined ||
      messageContentIntentRaw === ""
        ? null
        : String(messageContentIntentRaw),
  };
};

const readChannelStatus = async (
  client: Docker,
  container: Docker.Container,
  channel: DeployChannel
): Promise<OpenClawChannelStatus> => {
  // The bundled image runs supervisord/gateway as root, and identity files can
  // therefore be root-owned. Query status as root to avoid EACCES on
  // /home/node/.openclaw/identity/device.json.
  const result = await execInContainer(client, container, {
    cmd: ["openclaw", "channels", "status", "--json"],
    user: "root",
    env: ["HOME=/home/node"],
    timeoutMs: OPENCLAW_CHANNEL_STATUS_TIMEOUT_MS,
  });

  return parseOpenClawChannelStatus(
    `${result.stdout}\n${result.stderr}`,
    channel
  );
};

const waitForOpenClawReady = async (
  client: Docker,
  container: Docker.Container,
  channel: DeployChannel,
  deploymentId?: string
) => {
  const log = deploymentId ? deployLogger(deploymentId) : dockerLogger;
  const deadline = Date.now() + READY_WAIT_MS;
  let readySince: number | null = null;
  let lastChannelStatus: OpenClawChannelStatus | null = null;

  log.info(
    { channel, readyWaitMs: READY_WAIT_MS },
    "Waiting for OpenClaw to become ready"
  );

  while (Date.now() < deadline) {
    const inspection = await container.inspect();
    if (!inspection.State?.Running) {
      const rawLogs = await container.logs({
        stdout: true,
        stderr: true,
        tail: 120,
      });
      const logs = decodeLogs(rawLogs).trim();
      const status = inspection.State?.Status || "unknown";
      const exitCode =
        inspection.State?.ExitCode !== undefined
          ? inspection.State.ExitCode
          : "unknown";

      throw new Error(
        `OpenClaw container exited while waiting for readiness (status=${status}, exit=${exitCode}). ${logs}`
      );
    }

    try {
      lastChannelStatus = await readChannelStatus(client, container, channel);
    } catch (error) {
      readySince = null;
      log.debug(
        {
          channel,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to read channels status (waiting)"
      );
      await sleep(2000);
      continue;
    }

    const recentLogsRaw = await container.logs({
      stdout: true,
      stderr: true,
      tail: 120,
    });
    const recentLogs = decodeLogs(recentLogsRaw);
    if (recentLogs.includes("Unknown model:")) {
      throw new Error(
        `OpenClaw reported unknown model during readiness check. Logs:\n${recentLogs.slice(-1200)}`
      );
    }

    log.debug(
      {
        channel,
        channelRunning: lastChannelStatus.running,
        channelLastError: lastChannelStatus.lastError,
        discordMessageContentIntent: lastChannelStatus.messageContentIntent,
      },
      "Checking readiness via channels status"
    );

    if (lastChannelStatus.lastError) {
      throw new Error(
        `${channel} channel reported error during readiness check: ${lastChannelStatus.lastError}`
      );
    }

    if (
      channel === "discord" &&
      lastChannelStatus.messageContentIntent?.toLowerCase() === "disabled"
    ) {
      throw new Error(
        `${DISCORD_MESSAGE_CONTENT_INTENT_DISABLED_ERROR_CODE}: Discord Message Content Intent is disabled. Enable it in Discord Developer Portal (Bot -> Privileged Gateway Intents) before deploying.`
      );
    }

    if (lastChannelStatus.running) {
      if (readySince === null) {
        readySince = Date.now();
      }
      if (Date.now() - readySince >= CHANNEL_READY_STABILITY_MS) {
        log.info({ channel }, "OpenClaw is ready: selected channel is running");
        return;
      }
    } else {
      readySince = null;
    }

    await sleep(2000);
  }

  const rawLogs = await container.logs({
    stdout: true,
    stderr: true,
    tail: 200,
  });
  const logs = decodeLogs(rawLogs).trim();
  const statusSummary = lastChannelStatus
    ? {
        running: lastChannelStatus.running,
        lastError: lastChannelStatus.lastError,
      }
    : null;
  log.error(
    { channel, channelStatus: statusSummary, logs: logs.slice(-1000) },
    "OpenClaw did not become ready within timeout"
  );
  throw new Error(
    `OpenClaw did not become ready within ${READY_WAIT_MS}ms. ` +
      `Last ${channel} status: ${JSON.stringify(statusSummary)}. Last logs:\n${logs}`
  );
};

const execInContainer = async (
  client: Docker,
  container: Docker.Container,
  input: { cmd: string[]; user?: string; env?: string[]; timeoutMs?: number }
) => {
  const exec = await container.exec({
    Cmd: input.cmd,
    AttachStdout: true,
    AttachStderr: true,
    User: input.user,
    Env: input.env,
  });

  const stream = await exec.start({ hijack: true, stdin: false });

  let stdout = "";
  let stderr = "";
  const stdoutStream = new Writable({
    write(chunk, _encoding, callback) {
      stdout += Buffer.from(chunk).toString("utf-8");
      callback();
    },
  });
  const stderrStream = new Writable({
    write(chunk, _encoding, callback) {
      stderr += Buffer.from(chunk).toString("utf-8");
      callback();
    },
  });
  // dockerode multiplexes stdout/stderr into a single stream
  client.modem.demuxStream(stream, stdoutStream, stderrStream);

  // Wait for command completion
  const startedAt = Date.now();
  const EXIT_CODE_GRACE_MS = 5_000;
  let exitCodeMissingSince: number | null = null;
  while (true) {
    const info = await exec.inspect();
    if (!info.Running) {
      // Some Docker engines transiently report ExitCode=null right after the exec stops.
      // Treat this as a short-lived race and re-check for a bit instead of failing deploys.
      if (info.ExitCode === null || info.ExitCode === undefined) {
        if (exitCodeMissingSince === null) {
          exitCodeMissingSince = Date.now();
        }
        if (Date.now() - exitCodeMissingSince < EXIT_CODE_GRACE_MS) {
          await sleep(250);
          continue;
        }
      }
      if (info.ExitCode !== 0) {
        const out = `${stdout}${stderr}`.trim();
        throw new Error(
          `Container exec failed (exit=${info.ExitCode}): ${input.cmd.join(" ")}${out ? `\n${out}` : ""}`
        );
      }
      return { stdout, stderr };
    }
    if (input.timeoutMs && Date.now() - startedAt > input.timeoutMs) {
      throw new Error(
        `Container exec timed out after ${input.timeoutMs}ms: ${input.cmd.join(" ")}`
      );
    }
    await sleep(250);
  }
};

const ensureVolumeExists = async (client: Docker, volumeName: string) => {
  try {
    await client.getVolume(volumeName).inspect();
  } catch (error: any) {
    const statusCode = error?.statusCode;
    const message = error instanceof Error ? error.message : String(error);
    if (statusCode === 404 || /no such volume/i.test(message)) {
      await client.createVolume({ Name: volumeName });
      return;
    }
    throw error;
  }
};

const prepareOpenClawDataVolume = async (
  client: Docker,
  imageName: string,
  volumeName: string,
  deploymentId?: string
) => {
  const log = deploymentId ? deployLogger(deploymentId) : dockerLogger;

  try {
    await ensureVolumeExists(client, volumeName);

    const initContainer = await client.createContainer({
      Image: imageName,
      Entrypoint: ["sh", "-lc"],
      Cmd: [buildOpenClawVolumePrepScript()],
      User: "0",
      HostConfig: {
        AutoRemove: false,
        Binds: [`${volumeName}:${OPENCLAW_HOME_DIR}:rw`],
      },
    });

    try {
      await initContainer.start();

      const waitResult = await Promise.race([
        initContainer.wait(),
        sleep(OPENCLAW_VOLUME_PREPARE_TIMEOUT_MS).then(() => {
          throw new Error(
            `Timed out after ${OPENCLAW_VOLUME_PREPARE_TIMEOUT_MS}ms while preparing volume`
          );
        }),
      ]);

      const rawLogs = await initContainer.logs({
        stdout: true,
        stderr: true,
        tail: 80,
      });
      const logs = decodeLogs(rawLogs).trim();
      const exitCode = (waitResult as { StatusCode?: number }).StatusCode ?? 0;

      if (exitCode !== 0) {
        throw new Error(
          `Volume prepare container exited with status ${exitCode}.${logs ? ` Logs:\n${logs}` : ""}`
        );
      }

      const prepResult = parseOpenClawVolumePrepLogs(logs);
      if (prepResult === "written") {
        log.info(
          { volume: volumeName },
          "Prepared OpenClaw data volume with current image build marker"
        );
        return;
      }

      if (prepResult === "missing") {
        log.warn(
          { volume: volumeName },
          "IMAGE_BUILD_DATE not found in image; continuing with default cold-start path"
        );
        return;
      }

      log.warn(
        { volume: volumeName, logs: logs.slice(-400) },
        "OpenClaw volume prepare step finished without a recognized marker"
      );
    } finally {
      await initContainer.remove({ force: true }).catch(() => {});
    }
  } catch (error) {
    log.warn(
      {
        volume: volumeName,
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to prewarm OpenClaw data volume; continuing with default cold-start path"
    );
  }
};

const composeRuntimeModelIdentityNote = (resolvedModel: string): string =>
  [
    "## Runtime model truth source",
    `The authoritative runtime model for this deployment is \`${resolvedModel}\`.`,
    'If asked "what model are you", answer with exactly this runtime model key.',
    "Do not claim Gemini 1.5 Pro unless the runtime model key is actually that model.",
  ].join("\n");

const injectRuntimeModelIdentityHint = async (
  client: Docker,
  container: Docker.Container,
  resolvedModel: string
) => {
  const note = composeRuntimeModelIdentityNote(resolvedModel);
  const noteBase64 = Buffer.from(note, "utf-8").toString("base64");
  const script = [
    `NOTE="$(printf '%s' ${JSON.stringify(noteBase64)} | base64 -d)"`,
    "for file in /home/node/.openclaw/workspace/AGENTS.md /home/node/.openclaw/workspace/BOOTSTRAP.md; do",
    '  [ -f "$file" ] || continue',
    '  if grep -q "## Runtime model truth source" "$file"; then',
    "    continue",
    "  fi",
    '  printf "\\n%s\\n" "$NOTE" >> "$file"',
    "done",
  ].join("\n");

  await execInContainer(client, container, {
    cmd: ["sh", "-lc", script],
    user: "node",
    env: ["HOME=/home/node"],
    timeoutMs: 10_000,
  });
};

type OpenClawModelsStatusOutput = {
  defaultModel?: string | null;
  resolvedDefault?: string | null;
  auth?: {
    missingProvidersInUse?: string[];
    providers?: Array<{
      provider?: string;
    }>;
  };
};

const parseOpenClawModelsStatus = (
  output: string
): OpenClawModelsStatusOutput => {
  const trimmed = output.trim();
  if (!trimmed) {
    throw new Error("OPENCLAW_MODELS_STATUS_EMPTY");
  }

  try {
    return JSON.parse(trimmed) as OpenClawModelsStatusOutput;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(`OPENCLAW_MODELS_STATUS_INVALID_JSON: ${trimmed}`);
    }
    return JSON.parse(trimmed.slice(start, end + 1)) as OpenClawModelsStatusOutput;
  }
};

const configureOpenClaw = async (
  client: Docker,
  container: Docker.Container,
  input: { channel: DeployChannel; model?: string; provider?: string; apiKey?: string }
): Promise<string | undefined> => {
  const configDir = "/home/node/.openclaw";
  const agentDir = `${configDir}/agents/main/agent`;

  const execOpenClaw = async (
    args: string[],
    opts: { timeoutMs?: number } = {}
  ) =>
    execInContainer(client, container, {
      cmd: ["openclaw", ...args],
      user: "node",
      env: ["HOME=/home/node"],
      timeoutMs: opts.timeoutMs,
    });

  const execOpenClawAsRoot = async (
    args: string[],
    opts: { timeoutMs?: number } = {}
  ) =>
    execInContainer(client, container, {
      cmd: ["openclaw", ...args],
      user: "root",
      env: ["HOME=/home/node"],
      timeoutMs: opts.timeoutMs,
    });

  // Ensure OpenClaw state exists. Some images create this on first boot.
  await execInContainer(client, container, {
    cmd: ["mkdir", "-p", agentDir],
    user: "node",
    env: ["HOME=/home/node"],
    timeoutMs: 10_000,
  });

  // We skip the image's onboard flow, so persist gateway bootstrap config here instead of
  // relying on /patch-config.js inside the image to backfill controlUi defaults.
  for (const command of buildGatewayBootstrapConfigCommands()) {
    await execOpenClaw(command, {
      timeoutMs: OPENCLAW_CLI_TIMEOUT_MS,
    });
  }
  for (const command of buildProviderBootstrapConfigCommands(
    input.provider || "openai"
  )) {
    await execOpenClaw(command, {
      timeoutMs: OPENCLAW_CLI_TIMEOUT_MS,
    });
  }

  if (input.channel === "telegram") {
    // MVP: Disable Telegram pairing requirement.
    // Important: dmPolicy=open requires allowFrom to include "*", and allowFrom must be
    // set first or validation will fail. `openclaw config set` will create openclaw.json
    // when missing (no onboarding required).
    await execOpenClaw(
      ["config", "set", "--json", "channels.telegram.allowFrom", `["*"]`],
      { timeoutMs: OPENCLAW_CLI_TIMEOUT_MS }
    );
    await execOpenClaw(["config", "set", "channels.telegram.dmPolicy", "open"], {
      timeoutMs: OPENCLAW_CLI_TIMEOUT_MS,
    });

    // If pairing was previously triggered, remove pending pairing requests so the bot
    // doesn't keep prompting users.
    await execInContainer(client, container, {
      cmd: ["rm", "-f", `${configDir}/credentials/telegram-pairing.json`],
      user: "node",
      env: ["HOME=/home/node"],
      timeoutMs: 10_000,
    });

    dockerLogger.info("Telegram DM policy configured: open (pairing disabled)");
  }

  if (input.channel === "discord") {
    // Discord deployments keep DMs open and now allow guild/channel replies by
    // default so new bots behave as users expect inside servers.
    await execOpenClaw(["config", "set", "channels.discord.enabled", "true"], {
      timeoutMs: OPENCLAW_CLI_TIMEOUT_MS,
    });
    await execOpenClaw(
      ["config", "set", "--json", "channels.discord.allowFrom", `["*"]`],
      { timeoutMs: OPENCLAW_CLI_TIMEOUT_MS }
    );
    await execOpenClaw(["config", "set", "channels.discord.dmPolicy", "open"], {
      timeoutMs: OPENCLAW_CLI_TIMEOUT_MS,
    });
    await execOpenClaw(
      ["config", "set", "channels.discord.groupPolicy", "open"],
      { timeoutMs: OPENCLAW_CLI_TIMEOUT_MS }
    );

    dockerLogger.info("Discord policy configured: DMs and guild replies enabled");
  }

  if (input.channel === "whatsapp") {
    await execOpenClaw(["config", "set", "channels.whatsapp.enabled", "true"], {
      timeoutMs: OPENCLAW_CLI_TIMEOUT_MS,
    });
    await execOpenClaw(
      ["config", "set", "--json", "channels.whatsapp.allowFrom", `["*"]`],
      { timeoutMs: OPENCLAW_CLI_TIMEOUT_MS }
    );
    await execOpenClaw(["config", "set", "channels.whatsapp.dmPolicy", "open"], {
      timeoutMs: OPENCLAW_CLI_TIMEOUT_MS,
    });
    await execOpenClaw(
      ["config", "set", "channels.whatsapp.groupPolicy", "disabled"],
      { timeoutMs: OPENCLAW_CLI_TIMEOUT_MS }
    );

    dockerLogger.info("WhatsApp policy configured: DM open, groups disabled");
  }

  // OpenRouter deployments rely on OPENROUTER_API_KEY plus the runtime model key written
  // below. We intentionally verify the stored model state after `models set` so Gemini
  // cannot silently drift to a direct-provider route at runtime.

  // To avoid Telegram plugin ID incompatibilities after in-container CLI updates,
  // auto-update is opt-in. Set OPENCLAW_AUTO_UPDATE_FOR_OPENROUTER=true to enable it.
  if (
    input.provider?.toLowerCase() === "openrouter" &&
    OPENCLAW_AUTO_UPDATE_FOR_OPENROUTER
  ) {
    try {
      dockerLogger.info("Updating OpenClaw (OpenRouter provider) ...");
      await execOpenClawAsRoot(["update", "--yes", "--no-restart"], {
        timeoutMs: OPENCLAW_UPDATE_TIMEOUT_MS,
      });
    } catch (error) {
      // Best-effort: if update fails, deployments using older model IDs may still work.
      // We avoid blocking deploys here; model selection will fail later if unsupported.
      dockerLogger.warn(
        { error: error instanceof Error ? error.message : error },
        "OpenClaw update failed (continuing without update)"
      );
    }
  }

  let runtimeModel = input.model;
  if (input.model) {
    if (canBypassRuntimeCatalogLookup(input.model)) {
      runtimeModel = input.model;
      dockerLogger.info(
        { model: runtimeModel },
        "Skipping runtime catalog lookup for prevalidated model"
      );
    } else {
      // Fail fast if the selected model is unknown to the runtime catalog.
      // This prevents deployments that look healthy but fail on first user message.
      const modelsCatalog = await execOpenClaw(["models", "list", "--all", "--json"], {
        timeoutMs: OPENCLAW_CLI_TIMEOUT_MS,
      });
      const catalogKeys = parseModelKeysFromCatalog(
        `${modelsCatalog.stdout}\n${modelsCatalog.stderr}`
      );
      runtimeModel =
        (catalogKeys.length > 0
          ? resolveModelFromRuntimeCatalog(input.model, catalogKeys)
          : input.model) ?? undefined;
    }

    if (!runtimeModel) {
      throw new Error(
        `MODEL_NOT_AVAILABLE: requested=${input.model}, strict=${isStrictModelFamilyModel(
          input.model
        ) ? "true" : "false"}`
      );
    }

    if (runtimeModel !== input.model) {
      dockerLogger.warn(
        { requestedModel: input.model, runtimeModel },
        "Model key normalized to match runtime catalog"
      );
    }

    // Configure the model. OpenClaw stores this under agents.defaults.model.primary.
    await execOpenClaw(["models", "set", runtimeModel], {
      timeoutMs: OPENCLAW_CLI_TIMEOUT_MS,
    });

    const modelsStatusCommand = await execOpenClaw(["models", "status", "--json"], {
      timeoutMs: OPENCLAW_CLI_TIMEOUT_MS,
    });
    const modelsStatus = parseOpenClawModelsStatus(
      `${modelsStatusCommand.stdout}\n${modelsStatusCommand.stderr}`
    );
    const configuredModel =
      modelsStatus.resolvedDefault?.trim() || modelsStatus.defaultModel?.trim();
    if (!configuredModel) {
      throw new Error(`OPENCLAW_MODEL_STATUS_MISSING_DEFAULT: requested=${runtimeModel}`);
    }
    if (configuredModel !== runtimeModel) {
      throw new Error(
        `OPENCLAW_MODEL_STATUS_MISMATCH: requested=${runtimeModel}, actual=${configuredModel}`
      );
    }
    const expectedAuthProvider = getModelAuthProviderId(runtimeModel);
    if (expectedAuthProvider) {
      const hasExpectedAuthProvider = (modelsStatus.auth?.providers || []).some(
        (providerStatus) => providerStatus.provider === expectedAuthProvider
      );
      if (!hasExpectedAuthProvider) {
        throw new Error(
          `OPENCLAW_AUTH_PROVIDER_MISSING: provider=${expectedAuthProvider}, model=${runtimeModel}`
        );
      }
      if (
        (modelsStatus.auth?.missingProvidersInUse || []).includes(
          expectedAuthProvider
        )
      ) {
        throw new Error(
          `OPENCLAW_AUTH_PROVIDER_UNUSABLE: provider=${expectedAuthProvider}, model=${runtimeModel}`
        );
      }
    }

    dockerLogger.info({ model: runtimeModel }, "Model configured");
  } else {
    dockerLogger.info("No explicit model configured, using OpenClaw default");
  }

  if (runtimeModel) {
    try {
      await injectRuntimeModelIdentityHint(client, container, runtimeModel);
      dockerLogger.info(
        { model: runtimeModel },
        "Runtime model identity hint injected into workspace"
      );
    } catch (error) {
      dockerLogger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        "Failed to inject runtime model identity hint"
      );
    }
  }

  // Restart gateway so config changes apply. The image runs the gateway under supervisord;
  // killing the process is enough (supervisord will bring it back).
  await execInContainer(client, container, {
    // Avoid matching/killing the pkill process itself by using the classic [o] trick.
    cmd: [
      "sh",
      "-lc",
      `pkill -f '[o]penclaw-gateway' || true; pkill -f 'openclaw [g]ateway' || true`,
    ],
    timeoutMs: 10_000,
  });
  return runtimeModel;
};

type CreateContainerInput = {
  channel: DeployChannel;
  channelToken: string;
  model?: string;
  deploymentId?: string;
  targetHost?: string | null;
  userId?: string;
  tier?: "starter" | "pro";
};

export type CreateContainerResult = {
  containerId: string;
  accountPoolId?: string;
  provider?: string;
  requestedModel?: string;
  resolvedModel?: string;
};

// Provider to OpenClaw provider mapping
const providerToOpenClawProvider: Record<string, string> = {
  "openai": "openai",
  "openrouter": "openrouter",
  "anthropic": "anthropic",
  "google": "google",
  "kie": "kie",
};

export const KIE_PROVIDER = "kie";
export const KIE_GPT_PROVIDER = "kie-gpt";
export const KIE_CODEX_PROVIDER = KIE_GPT_PROVIDER;
export const KIE_CLAUDE_PROVIDER = "kie-claude";
export const KIE_GEMINI_PROVIDER = "kie-gemini";
export const KIE_GPT_5_4_MODEL = `${KIE_GPT_PROVIDER}/gpt-5-4`;
export const KIE_CLAUDE_OPUS_4_6_MODEL = `${KIE_CLAUDE_PROVIDER}/claude-opus-4-6`;
export const KIE_GEMINI_3_1_PRO_MODEL = `${KIE_GEMINI_PROVIDER}/gemini-3.1-pro`;
const OPENROUTER_GPT_5_4_MODEL = "openrouter/openai/gpt-5.4";
const OPENROUTER_CLAUDE_OPUS_4_6_MODEL = "openrouter/anthropic/claude-opus-4";
export type OpenClawHomepageProviderMode = "mixed" | "openrouter";

/** In-process override for homepage routing; takes precedence over OPENCLAW_HOMEPAGE_PROVIDER_MODE. */
let homepageProviderModeOverride: OpenClawHomepageProviderMode | null = null;

export const setOpenClawHomepageProviderModeOverride = (
  mode: OpenClawHomepageProviderMode | null
): void => {
  homepageProviderModeOverride = mode;
};

export const getOpenClawHomepageProviderModeOverride =
  (): OpenClawHomepageProviderMode | null => homepageProviderModeOverride;

const KIE_CUSTOM_PROVIDERS = {
  [KIE_GEMINI_PROVIDER]: {
    api: "openai-completions",
    auth: "token",
    baseUrl: "https://api.kie.ai/gemini-3.1-pro/v1",
    apiKey: "${KIE_API_KEY}",
    models: [
      {
        id: "gemini-3.1-pro",
        name: "Gemini 3.1 Pro (Kie)",
      },
    ],
  },
  [KIE_CLAUDE_PROVIDER]: {
    api: "anthropic-messages",
    auth: "token",
    authHeader: true,
    baseUrl: "https://api.kie.ai/claude",
    apiKey: "${KIE_API_KEY}",
    headers: {
      "anthropic-version": "2023-06-01",
    },
    models: [
      {
        id: "claude-opus-4-6",
        name: "Claude Opus 4.6 (Kie)",
      },
    ],
  },
  [KIE_CODEX_PROVIDER]: {
    api: "openai-responses",
    auth: "token",
    baseUrl: "https://api.kie.ai/codex/v1",
    apiKey: "${KIE_API_KEY}",
    models: [
      {
        id: "gpt-5-4",
        name: "GPT-5.4 (Kie)",
      },
    ],
  },
} as const;

const OPENROUTER_GEMINI_3_PRO_MODEL =
  "openrouter/google/gemini-3.1-pro-preview";

/**
 * Controls how **homepage short model IDs** (gpt-5-4, claude-opus-4-6, gemini-3-pro, …) map
 * before account assignment. Does not change already-running OpenClaw deployments.
 *
 * - `openrouter` — map shorthands to OpenRouter model IDs.
 * - `mixed` / `kie` / unset — map shorthands to Kie custom providers (matches deploy scripts default `mixed`).
 *
 * Process memory override (see setOpenClawHomepageProviderModeOverride) wins over env until cleared.
 */
export const resolveOpenClawHomepageProviderMode = (
  rawMode: string | undefined = process.env.OPENCLAW_HOMEPAGE_PROVIDER_MODE
): OpenClawHomepageProviderMode => {
  if (homepageProviderModeOverride !== null) {
    return homepageProviderModeOverride;
  }

  const normalized = rawMode?.trim().toLowerCase();
  if (normalized === "openrouter") {
    return "openrouter";
  }

  // kie | mixed | empty | unknown → Kie-backed homepage aliases (deploy-backend-*.sh default mixed).
  return "mixed";
};

const HOMEPAGE_GPT_5_4_ALIASES = new Set(["gpt-5-4", "gpt-5.4"]);
const HOMEPAGE_CLAUDE_OPUS_4_6_ALIASES = new Set([
  "claude-opus-4-6",
  "claude-opus-4.6",
]);
const HOMEPAGE_GEMINI_3_PRO_ALIASES = new Set([
  "gemini-3-pro",
  "gemini-3-pro-preview",
  "gemini-3.1-pro-preview",
]);

const resolveHomepageModelAlias = (
  modelName: string
): string | undefined => {
  const normalizedModel = modelName.trim().toLowerCase();
  const providerMode = resolveOpenClawHomepageProviderMode();

  if (HOMEPAGE_GPT_5_4_ALIASES.has(normalizedModel)) {
    return providerMode === "openrouter"
      ? OPENROUTER_GPT_5_4_MODEL
      : KIE_GPT_5_4_MODEL;
  }

  if (HOMEPAGE_CLAUDE_OPUS_4_6_ALIASES.has(normalizedModel)) {
    return providerMode === "openrouter"
      ? OPENROUTER_CLAUDE_OPUS_4_6_MODEL
      : KIE_CLAUDE_OPUS_4_6_MODEL;
  }

  if (HOMEPAGE_GEMINI_3_PRO_ALIASES.has(normalizedModel)) {
    return providerMode === "openrouter"
      ? OPENROUTER_GEMINI_3_PRO_MODEL
      : KIE_GEMINI_3_1_PRO_MODEL;
  }

  return undefined;
};

// Model aliases for UI/backward compatibility.
const modelAliasMap: Record<string, string> = {
  "kie-gpt/gpt-5-4": KIE_GPT_5_4_MODEL,
  "kie-gpt/gpt-5.4": KIE_GPT_5_4_MODEL,
  "kie-codex/gpt-5-4": KIE_GPT_5_4_MODEL,
  "kie-codex/gpt-5.4": KIE_GPT_5_4_MODEL,
  "openai/gpt-5.4": OPENROUTER_GPT_5_4_MODEL,
  "openai/gpt-5-4": OPENROUTER_GPT_5_4_MODEL,
  "openrouter/openai/gpt-5-4": OPENROUTER_GPT_5_4_MODEL,
  "openrouter/openai/gpt-5.4": OPENROUTER_GPT_5_4_MODEL,
  "gpt-5-2": "openrouter/openai/gpt-5.2",
  "gpt-5.2": "openrouter/openai/gpt-5.2",
  "openai/gpt-5.2": "openrouter/openai/gpt-5.2",
  "openai/gpt-5-2": "openrouter/openai/gpt-5.2",
  "openrouter/openai/gpt-5-2": "openrouter/openai/gpt-5.2",
  // OpenAI
  "gpt-4o": "openai/gpt-4o",
  "gpt-4": "openai/gpt-4",
  // Anthropic (direct): OpenClaw model IDs use dash notation for 4.x (4-5, 4-6, ...).
  // Back-compat: accept dot notation in shorthand IDs.
  "claude-opus-4-5": "anthropic/claude-opus-4-5",
  "claude-sonnet-4-5": "anthropic/claude-sonnet-4-5",
  // Back-compat: accept dot notation for Anthropic 4.x direct IDs.
  "anthropic/claude-opus-4.6": "anthropic/claude-opus-4-6",
  "anthropic/claude-opus-4.5": "anthropic/claude-opus-4-5",
  "anthropic/claude-sonnet-4.5": "anthropic/claude-sonnet-4-5",
  "anthropic/claude-haiku-4.5": "anthropic/claude-haiku-4-5",
  "claude-3-opus": "anthropic/claude-3-opus-20240229",
  "claude-3-sonnet": "anthropic/claude-3-sonnet-20240229",
  "claude-3-haiku": "anthropic/claude-3-haiku-20240307",
  // Google (direct)
  "gemini-3-flash": "google/gemini-3-flash-preview",
  "google/gemini-3-pro": OPENROUTER_GEMINI_3_PRO_MODEL,
  "google/gemini-3-pro-preview": OPENROUTER_GEMINI_3_PRO_MODEL,
  "google/gemini-3.1-pro-preview": OPENROUTER_GEMINI_3_PRO_MODEL,
  "gemini-1.5-flash": "google/gemini-1.5-flash",
  "gemini-1.5-pro": "google/gemini-1.5-pro",
  // OpenRouter IDs
  "openrouter/gpt-4o": "openrouter/openai/gpt-4o",
  "openrouter/anthropic/claude-opus-4-6": "openrouter/anthropic/claude-opus-4",
  "openrouter/anthropic/claude-opus-4-5": "openrouter/anthropic/claude-opus-4-5",
  "openrouter/anthropic/claude-sonnet-4-5": "openrouter/anthropic/claude-sonnet-4-5",
  "openrouter/anthropic/claude-haiku-4-5": "openrouter/anthropic/claude-haiku-4-5",
  "openrouter/google/gemini-3-pro": OPENROUTER_GEMINI_3_PRO_MODEL,
  // Compat aliases (dot / preview) -> canonical IDs
  "openrouter/anthropic/claude-opus-4.6": "openrouter/anthropic/claude-opus-4",
  "openrouter/anthropic/claude-opus-4.5": "openrouter/anthropic/claude-opus-4-5",
  "openrouter/anthropic/claude-sonnet-4.5": "openrouter/anthropic/claude-sonnet-4-5",
  "openrouter/anthropic/claude-haiku-4.5": "openrouter/anthropic/claude-haiku-4-5",
  "openrouter/google/gemini-3-pro-preview": OPENROUTER_GEMINI_3_PRO_MODEL,
  "openrouter/google/gemini-3.1-pro-preview": OPENROUTER_GEMINI_3_PRO_MODEL,
};

const RUNTIME_CATALOG_BYPASS_MODELS = new Set([
  KIE_GPT_5_4_MODEL,
  KIE_CLAUDE_OPUS_4_6_MODEL,
  KIE_GEMINI_3_1_PRO_MODEL,
  "openrouter/openai/gpt-5.4",
  "openrouter/openai/gpt-5.2",
  "openrouter/anthropic/claude-opus-4",
  "openrouter/google/gemini-3.1-pro-preview",
]);

const modelKeyFingerprint = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9/]/g, "");

const resolveModelAlias = (modelName: string): string => {
  const homepageAlias = resolveHomepageModelAlias(modelName);
  if (homepageAlias) {
    return homepageAlias;
  }

  const normalizedModel = modelName.trim().toLowerCase();
  return modelAliasMap[normalizedModel] || modelName;
};

const isShortGpt54Alias = (modelName: string): boolean => {
  const normalized = modelName.trim().toLowerCase();
  return HOMEPAGE_GPT_5_4_ALIASES.has(normalized);
};

const canonicalizeModelName = (modelName: string): string => {
  let resolved = resolveModelAlias(modelName.trim());
  resolved = resolveModelAlias(resolved);
  return resolved;
};

const canonicalizeGemini3ProModel = (modelName: string): string | undefined => {
  if (!isGemini3ProFamilyModel(modelName)) {
    return undefined;
  }
  const canonicalModel = canonicalizeModelName(modelName);
  if (
    canonicalModel === OPENROUTER_GEMINI_3_PRO_MODEL ||
    canonicalModel === KIE_GEMINI_3_1_PRO_MODEL
  ) {
    return canonicalModel;
  }
  return undefined;
};

const isGemini3ProFamilyModel = (value: string): boolean =>
  /gemini-3(?:\.1)?-pro(?:-preview)?/.test(value.toLowerCase());

const isStrictModelFamilyModel = (value: string): boolean =>
  OPENCLAW_STRICT_MODEL_MATCH && isGemini3ProFamilyModel(value);

const filterStrictFamilyCandidates = (
  requestedModel: string,
  candidates: string[]
): string[] => {
  if (!isStrictModelFamilyModel(requestedModel)) {
    return candidates;
  }

  if (isGemini3ProFamilyModel(requestedModel)) {
    return candidates.filter(isGemini3ProFamilyModel);
  }

  return candidates;
};

export const resolveModelFromRuntimeCatalog = (
  requestedModel: string,
  catalogKeys: string[]
): string | null => {
  if (catalogKeys.includes(requestedModel)) {
    return requestedModel;
  }

  const requestedLower = requestedModel.toLowerCase();
  const requestedFingerprint = modelKeyFingerprint(requestedModel);
  const requestedParts = requestedLower.split("/");
  const requestedProvider = requestedParts[0];
  const requestedUpstreamProvider = requestedParts[1];
  const strictFamilyRequested = isStrictModelFamilyModel(requestedModel);

  const fingerprintMatches = (candidates: string[]): string[] =>
    candidates.filter(
      (candidate) => modelKeyFingerprint(candidate) === requestedFingerprint
    );

  if (requestedProvider === "openrouter") {
    const openrouterCandidates = catalogKeys.filter((candidate) => {
      const lower = candidate.toLowerCase();
      if (!lower.startsWith("openrouter/")) {
        return false;
      }
      if (!requestedUpstreamProvider) {
        return true;
      }
      return lower.startsWith(`openrouter/${requestedUpstreamProvider}/`);
    });
    const openrouterCandidatePool = strictFamilyRequested
      ? filterStrictFamilyCandidates(requestedModel, openrouterCandidates)
      : openrouterCandidates;

    if (strictFamilyRequested && openrouterCandidatePool.length === 0) {
      return null;
    }

    const openrouterFingerprintMatches = fingerprintMatches(openrouterCandidatePool);
    if (openrouterFingerprintMatches.length === 1) {
      return openrouterFingerprintMatches[0];
    }
    if (openrouterCandidatePool.length === 1) {
      return openrouterCandidatePool[0];
    }
    // Keep OpenRouter routing strict for OpenRouter requests.
    return null;
  }

  const providerCandidates = catalogKeys.filter((candidate) =>
    candidate.toLowerCase().startsWith(`${requestedProvider}/`)
  );
  const providerCandidatePool = strictFamilyRequested
    ? filterStrictFamilyCandidates(requestedModel, providerCandidates)
    : providerCandidates;

  if (strictFamilyRequested && providerCandidatePool.length === 0) {
    return null;
  }

  const providerFingerprintMatches = fingerprintMatches(providerCandidatePool);
  if (providerFingerprintMatches.length === 1) {
    return providerFingerprintMatches[0];
  }
  if (providerCandidatePool.length === 1) {
    return providerCandidatePool[0];
  }

  if (strictFamilyRequested) {
    return null;
  }

  const globalMatches = fingerprintMatches(catalogKeys);
  if (globalMatches.length === 1) {
    return globalMatches[0];
  }

  return null;
};

export const canBypassRuntimeCatalogLookup = (modelName: string): boolean =>
  RUNTIME_CATALOG_BYPASS_MODELS.has(modelName);

function normalizeOpenRouterAnthropicModel(modelName: string): string {
  return modelName
    .replace(
      "openrouter/anthropic/claude-opus-4.6",
      "openrouter/anthropic/claude-opus-4"
    )
    .replace(
      "openrouter/anthropic/claude-opus-4-6",
      "openrouter/anthropic/claude-opus-4"
    )
    .replace(
      "openrouter/anthropic/claude-opus-4.5",
      "openrouter/anthropic/claude-opus-4-5"
    )
    .replace(
      "openrouter/anthropic/claude-sonnet-4.5",
      "openrouter/anthropic/claude-sonnet-4-5"
    )
    .replace(
      "openrouter/anthropic/claude-haiku-4.5",
      "openrouter/anthropic/claude-haiku-4-5"
    );
}

function normalizeDirectAnthropicModel(modelName: string): string {
  return modelName
    .replace("anthropic/claude-opus-4.6", "anthropic/claude-opus-4-6")
    .replace("anthropic/claude-opus-4.5", "anthropic/claude-opus-4-5")
    .replace("anthropic/claude-sonnet-4.5", "anthropic/claude-sonnet-4-5")
    .replace("anthropic/claude-haiku-4.5", "anthropic/claude-haiku-4-5");
}

function convertModelForProvider(modelName: string, provider: string): string {
  const normalizedProvider = provider.toLowerCase();
  const canonicalGeminiModel = canonicalizeGemini3ProModel(modelName);
  if (canonicalGeminiModel && normalizedProvider !== KIE_PROVIDER) {
    return canonicalGeminiModel;
  }
  if (normalizedProvider === KIE_PROVIDER) {
    return modelName;
  }
  const parts = modelName.split("/");
  if (parts.length < 2) {
    return modelName;
  }

  if (normalizedProvider === "openrouter") {
    const [modelProvider, ...rest] = parts;
    if (modelProvider === "openrouter") {
      return normalizeOpenRouterAnthropicModel(modelName);
    }
    if (
      modelProvider === "openai" ||
      modelProvider === "anthropic" ||
      modelProvider === "google"
    ) {
      return normalizeOpenRouterAnthropicModel(
        `openrouter/${modelProvider}/${rest.join("/")}`
      );
    }
    return modelName;
  }

  if (parts[0] !== "openrouter") {
    return modelName;
  }

  const upstreamProvider = parts[1];
  const upstreamModel = parts.slice(2).join("/");
  if (!upstreamProvider || !upstreamModel || upstreamProvider !== normalizedProvider) {
    return modelName;
  }

  const directModel = `${upstreamProvider}/${upstreamModel}`;
  return normalizeDirectAnthropicModel(directModel);
}

const isKnownRuntimeProvider = (provider: string): boolean =>
  provider in providerToOpenClawProvider ||
  provider in KIE_CUSTOM_PROVIDERS;

const extractRuntimeProvider = (modelName: string): string | undefined => {
  const provider = modelName.split("/")[0]?.toLowerCase();
  return provider && isKnownRuntimeProvider(provider) ? provider : undefined;
};

export const getModelAuthProviderId = (
  modelName: string | undefined
): string | undefined => {
  if (!modelName?.trim()) {
    return undefined;
  }

  const runtimeProvider = extractRuntimeProvider(modelName.trim());
  if (!runtimeProvider) {
    return undefined;
  }

  if (runtimeProvider === "openrouter" || runtimeProvider.startsWith("kie-")) {
    return runtimeProvider;
  }

  return undefined;
};

export function resolveOpenClawModel(
  rawModel: string | undefined,
  provider: string
): string | undefined {
  if (!rawModel?.trim()) {
    return undefined;
  }

  if (provider.trim().toLowerCase() === KIE_PROVIDER && isShortGpt54Alias(rawModel)) {
    return KIE_GPT_5_4_MODEL;
  }

  let resolved = resolveModelAlias(rawModel);
  resolved = convertModelForProvider(resolved, provider);
  resolved = resolveModelAlias(resolved);
  assertModelNameValid(resolved);
  return resolved;
}

export function inferRequiredProvider(rawModel: string | undefined): string | undefined {
  if (!rawModel?.trim()) {
    return undefined;
  }

  let resolved = resolveModelAlias(rawModel);
  resolved = resolveModelAlias(resolved);
  assertModelNameValid(resolved);

  if (!resolved.includes("/")) {
    return undefined;
  }

  const provider = resolved.split("/")[0]?.toLowerCase();
  if (!provider) {
    return undefined;
  }
  if (provider.startsWith("kie-")) {
    return KIE_PROVIDER;
  }
  if (!providerToOpenClawProvider[provider]) {
    return undefined;
  }
  return provider;
}

const isNoAvailablePoolAccountError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message === "NO_AVAILABLE_PRO_ACCOUNT" ||
    error.message === "NO_AVAILABLE_STARTER_ACCOUNT" ||
    error.message.startsWith("NO_AVAILABLE_ACCOUNT_FOR_PROVIDER")
  );
};

export function assertModelProviderConsistency(
  modelName: string | undefined,
  provider: string
): void {
  if (!modelName) {
    return;
  }

  const normalizedModel = modelName.toLowerCase();
  const normalizedProvider = provider.toLowerCase();
  if (normalizedModel.startsWith("kie-") && normalizedProvider !== KIE_PROVIDER) {
    throw new Error(`MODEL_PROVIDER_MISMATCH: model=${modelName}, provider=${provider}`);
  }
  if (normalizedModel.startsWith("openrouter/") && normalizedProvider !== "openrouter") {
    throw new Error(`MODEL_PROVIDER_MISMATCH: model=${modelName}, provider=${provider}`);
  }
  if (
    canonicalizeGemini3ProModel(modelName) === OPENROUTER_GEMINI_3_PRO_MODEL &&
    normalizedProvider !== "openrouter"
  ) {
    throw new Error(`MODEL_PROVIDER_MISMATCH: model=${modelName}, provider=${provider}`);
  }
}

export function isChannelHealthy(status: OpenClawChannelStatus): boolean {
  return (
    status.running === true &&
    status.lastError === null &&
    status.messageContentIntent?.toLowerCase() !== "disabled"
  );
}

function assertModelNameValid(modelName: string): void {
  if (!modelName.trim()) {
    throw new Error("INVALID_MODEL_NAME");
  }
  if (/\s/.test(modelName)) {
    throw new Error(`INVALID_MODEL_NAME: ${modelName}`);
  }
  if (!modelName.includes("/")) {
    return;
  }

  const provider = modelName.split("/")[0]?.toLowerCase();
  if (!provider || !isKnownRuntimeProvider(provider)) {
    throw new Error(`INVALID_MODEL_NAME: ${modelName}`);
  }
}

export const buildProviderBootstrapConfigCommands = (
  provider: string
): string[][] => {
  const normalizedProvider = provider.trim().toLowerCase();
  if (normalizedProvider !== KIE_PROVIDER) {
    return [];
  }

  return [
    ["config", "set", "models.mode", "merge"],
    [
      "config",
      "set",
      "--strict-json",
      "models.providers",
      JSON.stringify(KIE_CUSTOM_PROVIDERS),
    ],
  ];
};

export const createOpenClawContainer = async ({
  channel,
  channelToken,
  model,
  deploymentId,
  targetHost,
  userId,
  tier,
}: CreateContainerInput): Promise<CreateContainerResult> => {
  const log = deploymentId ? deployLogger(deploymentId) : dockerLogger;
  const normalizedTier = tier === "pro" ? "pro" : "starter";
  const selectedModel = model?.trim();
  const envDefaultModel = process.env.OPENCLAW_MODEL?.trim();
  const requiredProvider = inferRequiredProvider(selectedModel || envDefaultModel);

  // Get account from pool for this deployment (API Key mode)
  let account: {
    id: string;
    apiKey: string;
    provider: string;
    model?: string;
    thingLevel?: string;
  } | undefined;

  if (userId) {
    let poolAccount: Awaited<ReturnType<typeof assignFreshAccount>>;
    try {
      poolAccount = await assignFreshAccount(
        userId,
        normalizedTier,
        requiredProvider
      );
    } catch (error) {
      if (requiredProvider && isNoAvailablePoolAccountError(error)) {
        const modelForError = selectedModel || envDefaultModel || "<unset>";
        throw new Error(
          `NO_AVAILABLE_ACCOUNT_FOR_PROVIDER: tier=${normalizedTier}, provider=${requiredProvider}, model=${modelForError}`
        );
      }
      throw error;
    }

    account = {
      id: poolAccount.id,
      apiKey: poolAccount.apiKey,
      provider: poolAccount.provider,
      model: poolAccount.model,
      thingLevel: poolAccount.thingLevel,
    };
    log.info(
      {
        accountId: poolAccount.accountId,
        tier: normalizedTier,
        requiredProvider: requiredProvider || "<none>",
      },
      "Assigned account from pool"
    );
  }

  if (!account?.apiKey) {
    throw new Error(`NO_AVAILABLE_ACCOUNT: tier=${normalizedTier}`);
  }

  // Determine provider from account first (API key is provider-scoped).
  let provider = account?.provider?.toLowerCase() || "openai";
  if (!providerToOpenClawProvider[provider]) {
    throw new Error(`INVALID_PROVIDER: ${provider}`);
  }
  if (requiredProvider && provider !== requiredProvider) {
    throw new Error(
      `ACCOUNT_PROVIDER_MISMATCH: required=${requiredProvider}, actual=${provider}, tier=${normalizedTier}`
    );
  }

  // Determine the model to use.
  // Priority: 1) homepage selected model, 2) account model, 3) env default.
  const accountModel = account?.model?.trim();
  const sourceModel = selectedModel || accountModel || envDefaultModel;
  const openclawModel = resolveOpenClawModel(sourceModel, provider);
  try {
    assertModelProviderConsistency(openclawModel, provider);
  } catch (error) {
    log.error(
      {
        provider,
        model: openclawModel || "<unset>",
        deploymentId: deploymentId || "<unknown>",
        userId: userId || "<unknown>",
      },
      "Model/provider consistency check failed"
    );
    throw error;
  }

  const modelSource = selectedModel
    ? "request"
    : accountModel
      ? "account"
      : envDefaultModel
        ? "env"
        : "unset";

  return withDockerRuntime(targetHost || null, async ({ client, targetHost: runtimeHost }) => {
    await ensureImage(client, IMAGE_NAME, deploymentId);

    log.info(
      {
        model: openclawModel || "<unset>",
        provider,
        requiredProvider: requiredProvider || "<none>",
        source: modelSource,
        targetHost: runtimeHost || "<local>",
      },
      "Creating OpenClaw container"
    );

    // Generate a gateway token for OpenClaw gateway authentication
    const gatewayToken = deploymentId || uuidv4();

    // Build environment variables
    const env: string[] = [
      // Gateway authentication token (required for gateway to start)
      `OPENCLAW_GATEWAY_TOKEN=${gatewayToken}`,
      // Gateway mode (local, remote, etc.)
      `OPENCLAW_GATEWAY_MODE=${GATEWAY_MODE}`,
      // Allow unconfigured gateway to start (fallback)
      "OPENCLAW_ALLOW_UNCONFIGURED=true",
      // Avoid expensive onboarding inside the container; we'll configure via CLI after boot.
      "OPENCLAW_SKIP_ONBOARD=true",
    ];
    if (channel === "telegram") {
      env.push(
        `TELEGRAM_BOT_TOKEN=${channelToken}`,
        `TELEGRAM_TOKEN=${channelToken}`
      );
    }
    if (channel === "discord") {
      env.push(`DISCORD_BOT_TOKEN=${channelToken}`);
    }
    if (openclawModel && provider !== "openrouter" && provider !== KIE_PROVIDER) {
      env.push(`OPENCLAW_MODEL=${openclawModel}`);
    }

    if (account?.apiKey) {
      const apiKeyEnvVar = getApiKeyEnvVar(provider);
      env.push(`${apiKeyEnvVar}=${account.apiKey}`);
    }

    const containerName = deploymentId ? `openclaw-${deploymentId}` : undefined;
    const dataVolumeName = deploymentId ? `openclaw-data-${deploymentId}` : null;
    const binds = dataVolumeName
      ? [`${dataVolumeName}:/home/node/.openclaw:rw`]
      : undefined;

    if (dataVolumeName) {
      await prepareOpenClawDataVolume(client, IMAGE_NAME, dataVolumeName, deploymentId);
    }

    const container = await client.createContainer({
      Image: IMAGE_NAME,
      name: containerName,
      Env: env,
      HostConfig: {
        NetworkMode: "bridge",
        RestartPolicy: { Name: "unless-stopped" },
        ...(binds ? { Binds: binds } : null),
      },
    });

    await container.start();
    await sleep(STABILITY_WAIT_MS);

    const inspection = await container.inspect();
    if (!inspection.State?.Running) {
      const rawLogs = await container.logs({
        stdout: true,
        stderr: true,
        tail: 80,
      });
      const logs = decodeLogs(rawLogs).trim();
      const status = inspection.State?.Status || "unknown";
      const exitCode =
        inspection.State?.ExitCode !== undefined
          ? inspection.State.ExitCode
          : "unknown";

      throw new Error(
        `OpenClaw container exited after start (status=${status}, exit=${exitCode}). ${logs}`
      );
    }

    if (dataVolumeName) {
      log.info({ volume: dataVolumeName }, "Ensuring OpenClaw data directory ownership");
      await execInContainer(client, container, {
        cmd: [
          "sh",
          "-lc",
          "mkdir -p /home/node/.openclaw && chown -R node:node /home/node/.openclaw",
        ],
        user: "0",
        timeoutMs: 120_000,
      });
    }

    log.info(
      { containerId: container.id, containerName, targetHost: runtimeHost || "<local>" },
      "Container started and healthy"
    );

    const configuredRuntimeModel = await configureOpenClaw(client, container, {
      channel,
      model: openclawModel,
      provider,
      apiKey: account.apiKey,
    });

    await waitForOpenClawReady(client, container, channel, deploymentId);

    log.info({ targetHost: runtimeHost || "<local>" }, "Container deployment completed successfully");
    return {
      containerId: container.id,
      accountPoolId: account.id,
      provider,
      requestedModel: selectedModel,
      resolvedModel: configuredRuntimeModel || openclawModel,
    };
  });
};

/**
 * Get the environment variable name for API key based on provider
 */
function getApiKeyEnvVar(provider: string): string {
  const mapping: Record<string, string> = {
    "openai": "OPENAI_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "google": "GOOGLE_API_KEY",
    "kie": "KIE_API_KEY",
  };
  return mapping[provider.toLowerCase()] || `${provider.toUpperCase()}_API_KEY`;
}
