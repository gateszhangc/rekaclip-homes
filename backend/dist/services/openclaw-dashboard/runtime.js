import net from "node:net";
import { Writable } from "node:stream";
import { Exec, KubeConfig, PortForward, } from "@kubernetes/client-node";
import { loadOpenClawKubeConfig } from "../k8s.js";
import { parseDashboardUrlFromOutput, rewriteDashboardUrlPort, } from "./url.js";
const DASHBOARD_URL_TIMEOUT_MS = 15000;
const createKubeConfig = () => {
    const kubeConfig = new KubeConfig();
    loadOpenClawKubeConfig(kubeConfig);
    return kubeConfig;
};
const getAvailablePort = async () => await new Promise((resolve, reject) => {
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
const firstInteger = (value) => {
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
const extractExitCode = (status) => {
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
export class K8sDashboardRuntimeAdapter {
    async launch(options) {
        const localPort = await getAvailablePort();
        options.onLog("info", `Allocated local port ${localPort}.`);
        const forwardServer = await this.startForwardServer(options.target, localPort, options);
        try {
            const podDashboardUrl = await this.readDashboardUrl(options.target);
            const dashboardUrl = rewriteDashboardUrlPort(podDashboardUrl, localPort);
            options.onLog("info", "Dashboard URL issued from OpenClaw.");
            return {
                localPort,
                dashboardUrl,
                target: options.target,
                stop: async () => {
                    const stopServer = forwardServer.__easyclawStop;
                    if (stopServer) {
                        await stopServer();
                        return;
                    }
                    await closeServer(forwardServer);
                },
            };
        }
        catch (error) {
            await closeServer(forwardServer);
            throw error;
        }
    }
    async startForwardServer(target, localPort, options) {
        const kubeConfig = createKubeConfig();
        const portForward = new PortForward(kubeConfig);
        const sockets = new Set();
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
                .portForward(target.namespace, target.pod, [target.gatewayPort], socket, errorStream, socket)
                .then((connection) => {
                const ws = typeof connection === "function" ? connection() : connection;
                const closeConnection = () => {
                    try {
                        ws?.close();
                    }
                    catch {
                        // Ignore cleanup failures on disconnected sockets.
                    }
                };
                socket.once("close", closeConnection);
                socket.once("error", closeConnection);
            })
                .catch((error) => {
                options.onLog("error", error instanceof Error ? error.message : String(error));
                socket.destroy(error instanceof Error ? error : undefined);
            });
        });
        server.once("error", (error) => {
            options.onUnexpectedExit(error instanceof Error
                ? `Dashboard forward server failed: ${error.message}`
                : "Dashboard forward server failed.");
        });
        let stopping = false;
        server.once("close", () => {
            if (!stopping) {
                options.onUnexpectedExit("Dashboard forward server stopped.");
            }
        });
        await new Promise((resolve, reject) => {
            server.once("listening", resolve);
            server.once("error", reject);
            server.listen(localPort, "127.0.0.1");
        });
        options.onLog("info", "Local dashboard forward server is listening.");
        server.__easyclawStop =
            async () => {
                stopping = true;
                for (const socket of sockets) {
                    socket.destroy();
                }
                await closeServer(server);
            };
        return server;
    }
    async readDashboardUrl(target) {
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
        let connection = null;
        let settled = false;
        let exitStatus = null;
        const cleanup = () => {
            clearTimeout(timeout);
        };
        const settleResolve = async (value) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            try {
                connection?.close();
            }
            catch {
                // Ignore close failures when the exec stream has already ended.
            }
            resolvePromise(value);
        };
        const settleReject = async (error) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            try {
                connection?.close();
            }
            catch {
                // Ignore close failures when the exec stream has already ended.
            }
            rejectPromise(error);
        };
        let resolvePromise;
        let rejectPromise;
        const timeout = setTimeout(() => {
            void settleReject(new Error("Timed out waiting for the Dashboard URL from openclaw dashboard."));
        }, DASHBOARD_URL_TIMEOUT_MS);
        timeout.unref();
        return await new Promise((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
            void exec
                .exec(target.namespace, target.pod, target.container, ["sh", "-lc", "env HOME=/home/node openclaw dashboard --no-open"], outputStream, outputStream, null, true, (status) => {
                exitStatus = status;
            })
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
                    void settleReject(new Error(`Failed to obtain the Dashboard URL from openclaw dashboard (exit=${exitCode ?? "unknown"}).`));
                });
                connection.on("error", (error) => {
                    void settleReject(error instanceof Error ? error : new Error(String(error)));
                });
            })
                .catch((error) => {
                void settleReject(error instanceof Error ? error : new Error(String(error)));
            });
        });
    }
}
const closeServer = async (server) => await new Promise((resolve) => {
    if (!server.listening) {
        resolve();
        return;
    }
    server.close(() => resolve());
});
