import { Writable } from "node:stream";
import { Exec, KubeConfig } from "@kubernetes/client-node";
import { loadOpenClawKubeConfig } from "../../k8s.js";
const createKubeConfig = () => {
    const kubeConfig = new KubeConfig();
    loadOpenClawKubeConfig(kubeConfig);
    return kubeConfig;
};
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
export class KubernetesLoginExecAdapter {
    constructor(resolveTarget) {
        this.resolveTarget = resolveTarget;
    }
    async start(options) {
        const target = this.resolveTarget();
        const exec = new Exec(createKubeConfig());
        const outputStream = new Writable({
            write(chunk, _encoding, callback) {
                const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
                options.onData(text);
                callback();
            },
        });
        let closed = false;
        let exitReported = false;
        let connection = null;
        return new Promise((resolve, reject) => {
            const cleanup = () => {
                options.signal.removeEventListener("abort", handleAbort);
            };
            const resolveOnce = () => {
                if (closed) {
                    return;
                }
                closed = true;
                cleanup();
                resolve();
            };
            const rejectOnce = (error) => {
                if (closed) {
                    return;
                }
                closed = true;
                cleanup();
                reject(error);
            };
            const reportExit = (exitCode) => {
                if (exitReported) {
                    return;
                }
                exitReported = true;
                options.onExit(exitCode);
            };
            const handleAbort = () => {
                if (connection !== null) {
                    try {
                        connection.close();
                    }
                    catch {
                        resolveOnce();
                    }
                    return;
                }
                resolveOnce();
            };
            if (options.signal.aborted) {
                resolveOnce();
                return;
            }
            options.signal.addEventListener("abort", handleAbort, { once: true });
            void exec
                .exec(target.namespace, target.pod, target.container, target.command, outputStream, outputStream, null, true, (status) => {
                reportExit(extractExitCode(status));
                resolveOnce();
            })
                .then((wsConnection) => {
                connection = wsConnection;
                connection.on("close", () => {
                    if (!options.signal.aborted) {
                        reportExit(null);
                    }
                    resolveOnce();
                });
                connection.on("error", (error) => {
                    if (options.signal.aborted) {
                        resolveOnce();
                        return;
                    }
                    options.onError?.(error);
                    rejectOnce(error);
                });
                if (options.signal.aborted) {
                    handleAbort();
                }
            })
                .catch((error) => {
                if (options.signal.aborted) {
                    resolveOnce();
                    return;
                }
                options.onError?.(error);
                rejectOnce(error);
            });
        });
    }
}
