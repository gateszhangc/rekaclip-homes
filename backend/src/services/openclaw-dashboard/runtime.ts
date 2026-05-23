import net from "node:net";
import { Writable } from "node:stream";
import {
  Exec,
  KubeConfig,
  PortForward,
  type V1Status,
} from "@kubernetes/client-node";
import type { OpenClawK8sDashboardTarget } from "../k8s.js";
import { loadOpenClawKubeConfig } from "../k8s.js";
import type { DashboardLogLevel } from "./types.js";
import {
  parseDashboardUrlFromOutput,
  rewriteDashboardUrlPort,
} from "./url.js";
import type {
  DashboardRuntimeAdapter,
  DashboardRuntimeHandle,
} from "./session-store.js";

const DASHBOARD_URL_TIMEOUT_MS = 15_000;

const createKubeConfig = (): KubeConfig => {
  const kubeConfig = new KubeConfig();
  loadOpenClawKubeConfig(kubeConfig);
  return kubeConfig;
};

const getAvailablePort = async (): Promise<number> =>
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate a local port")));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(address.port);
      });
    });
  });

const firstInteger = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const match = value.match(/-?\d+/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[0], 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const extractExitCode = (status: V1Status): number | null => {
  const causes = status.details?.causes ?? [];

  for (const cause of causes) {
    const fromMessage = firstInteger(cause.message);
    if (fromMessage !== null) {
      return fromMessage;
    }
  }

  const fromStatusMessage = firstInteger(status.message);
  if (fromStatusMessage !== null) {
    return fromStatusMessage;
  }

  if (status.status === "Success") {
    return 0;
  }

  return null;
};

export class K8sDashboardRuntimeAdapter implements DashboardRuntimeAdapter {
  async launch(options: {
    onLog: (level: DashboardLogLevel, message: string) => void;
    onUnexpectedExit: (message: string) => void;
    target: OpenClawK8sDashboardTarget;
  }): Promise<DashboardRuntimeHandle> {
    const localPort = await getAvailablePort();
    options.onLog("info", `Allocated local port ${localPort}.`);

    const forwardServer = await this.startForwardServer(
      options.target,
      localPort,
      options
    );

    try {
      const podDashboardUrl = await this.readDashboardUrl(options.target);
      const dashboardUrl = rewriteDashboardUrlPort(podDashboardUrl, localPort);
      options.onLog("info", "Dashboard URL issued from OpenClaw.");

      return {
        localPort,
        dashboardUrl,
        target: options.target,
        stop: async () => {
          const stopServer = (
            forwardServer as net.Server & { __easyclawStop?: () => Promise<void> }
          ).__easyclawStop;
          if (stopServer) {
            await stopServer();
            return;
          }
          await closeServer(forwardServer);
        },
      };
    } catch (error) {
      await closeServer(forwardServer);
      throw error;
    }
  }

  private async startForwardServer(
    target: OpenClawK8sDashboardTarget,
    localPort: number,
    options: {
      onLog: (level: DashboardLogLevel, message: string) => void;
      onUnexpectedExit: (message: string) => void;
    }
  ): Promise<net.Server> {
    const kubeConfig = createKubeConfig();
    const portForward = new PortForward(kubeConfig);
    const sockets = new Set<net.Socket>();
    const server = net.createServer((socket) => {
      sockets.add(socket);
      socket.once("close", () => {
        sockets.delete(socket);
      });
      const errorStream = new Writable({
        write(chunk, _encoding, callback) {
          const text = Buffer.isBuffer(chunk)
            ? chunk.toString("utf8")
            : String(chunk);
          if (text.trim()) {
            options.onLog("error", text.trim());
          }
          callback();
        },
      });

      void portForward
        .portForward(
          target.namespace,
          target.pod,
          [target.gatewayPort],
          socket,
          errorStream,
          socket
        )
        .then((connection) => {
          const ws =
            typeof connection === "function" ? connection() : connection;

          const closeConnection = () => {
            try {
              ws?.close();
            } catch {
              // Ignore cleanup failures on disconnected sockets.
            }
          };

          socket.once("close", closeConnection);
          socket.once("error", closeConnection);
        })
        .catch((error) => {
          options.onLog(
            "error",
            error instanceof Error ? error.message : String(error)
          );
          socket.destroy(error instanceof Error ? error : undefined);
        });
    });

    server.once("error", (error) => {
      options.onUnexpectedExit(
        error instanceof Error
          ? `Dashboard forward server failed: ${error.message}`
          : "Dashboard forward server failed."
      );
    });
    let stopping = false;
    server.once("close", () => {
      if (!stopping) {
        options.onUnexpectedExit("Dashboard forward server stopped.");
      }
    });

    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
      server.listen(localPort, "127.0.0.1");
    });
    options.onLog("info", "Local dashboard forward server is listening.");

    (server as net.Server & { __easyclawStop?: () => Promise<void> }).__easyclawStop =
      async () => {
        stopping = true;
        for (const socket of sockets) {
          socket.destroy();
        }
        await closeServer(server);
      };

    return server;
  }

  private async readDashboardUrl(
    target: OpenClawK8sDashboardTarget
  ): Promise<string> {
    const exec = new Exec(createKubeConfig());
    const outputStream = new Writable({
      write: (chunk, _encoding, callback) => {
        const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
        output += text;

        const dashboardUrl = parseDashboardUrlFromOutput(output);
        if (dashboardUrl) {
          void settleResolve(dashboardUrl);
        }

        callback();
      },
    });

    let output = "";
    let connection: Awaited<ReturnType<Exec["exec"]>> | null = null;
    let settled = false;
    let exitStatus: V1Status | null = null;

    const cleanup = () => {
      clearTimeout(timeout);
    };

    const settleResolve = async (value: string) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      try {
        connection?.close();
      } catch {
        // Ignore close failures when the exec stream has already ended.
      }
      resolvePromise(value);
    };

    const settleReject = async (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      try {
        connection?.close();
      } catch {
        // Ignore close failures when the exec stream has already ended.
      }
      rejectPromise(error);
    };

    let resolvePromise!: (value: string) => void;
    let rejectPromise!: (error: Error) => void;

    const timeout = setTimeout(() => {
      void settleReject(
        new Error("Timed out waiting for the Dashboard URL from openclaw dashboard.")
      );
    }, DASHBOARD_URL_TIMEOUT_MS);
    timeout.unref();

    return await new Promise<string>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;

      void exec
        .exec(
          target.namespace,
          target.pod,
          target.container,
          ["sh", "-lc", "env HOME=/home/node openclaw dashboard --no-open"],
          outputStream,
          outputStream,
          null,
          true,
          (status) => {
            exitStatus = status;
          }
        )
        .then((wsConnection) => {
          connection = wsConnection;
          connection.on("close", () => {
            if (settled) {
              return;
            }

            const dashboardUrl = parseDashboardUrlFromOutput(output);
            if (dashboardUrl) {
              void settleResolve(dashboardUrl);
              return;
            }

            const exitCode = exitStatus ? extractExitCode(exitStatus) : null;
            void settleReject(
              new Error(
                `Failed to obtain the Dashboard URL from openclaw dashboard (exit=${exitCode ?? "unknown"}).`
              )
            );
          });
          connection.on("error", (error: unknown) => {
            void settleReject(
              error instanceof Error ? error : new Error(String(error))
            );
          });
        })
        .catch((error) => {
          void settleReject(
            error instanceof Error ? error : new Error(String(error))
          );
        });
    });
  }
}

const closeServer = async (server: net.Server): Promise<void> =>
  await new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
