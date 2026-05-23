import { deployLogger } from "../../utils/logger.js";
import { WHATSAPP_LOGIN_COMMAND } from "./config.js";
import { KubernetesLoginExecAdapter } from "./exec/kubernetes.js";
import { CurrentLoginSessionStore } from "./session-store.js";
import { toPublicWhatsAppLoginSnapshot, } from "./types.js";
const deploymentStores = new Map();
const getOrCreateEntry = (deploymentId, target) => {
    let entry = deploymentStores.get(deploymentId);
    if (!entry) {
        const targetRef = {
            current: target
                ? {
                    ...target,
                    command: [...WHATSAPP_LOGIN_COMMAND],
                }
                : null,
        };
        entry = {
            targetRef,
            store: new CurrentLoginSessionStore({
                deploymentId,
                execAdapter: new KubernetesLoginExecAdapter(() => {
                    const currentTarget = targetRef.current;
                    if (!currentTarget) {
                        throw new Error(`WhatsApp login target is not available for deployment ${deploymentId}`);
                    }
                    return currentTarget;
                }),
                onTerminal: async (snapshot) => {
                    const log = deployLogger(deploymentId);
                    log.info({
                        sessionId: snapshot.sessionId,
                        status: snapshot.status,
                        exitCode: snapshot.exitCode,
                        message: snapshot.message,
                        plainOutputTail: snapshot.plainOutput.slice(-2000),
                    }, "WhatsApp login session reached a terminal state");
                },
            }),
        };
        deploymentStores.set(deploymentId, entry);
    }
    if (target) {
        entry.targetRef.current = {
            ...target,
            command: [...WHATSAPP_LOGIN_COMMAND],
        };
    }
    return entry;
};
const pruneEntryIfExpired = (deploymentId) => {
    const entry = deploymentStores.get(deploymentId);
    if (!entry) {
        return;
    }
    if (entry.store.getCurrentSnapshot() === null) {
        deploymentStores.delete(deploymentId);
    }
};
export const getDeploymentWhatsAppLoginSnapshot = (deploymentId) => {
    const entry = deploymentStores.get(deploymentId);
    if (!entry) {
        return null;
    }
    const snapshot = entry.store.getCurrentSnapshot();
    if (!snapshot) {
        deploymentStores.delete(deploymentId);
        return null;
    }
    return toPublicWhatsAppLoginSnapshot(snapshot);
};
export const startOrReuseDeploymentWhatsAppLogin = async ({ deploymentId, target, }) => {
    const entry = getOrCreateEntry(deploymentId, target);
    const snapshot = await entry.store.startOrReuse();
    return toPublicWhatsAppLoginSnapshot(snapshot);
};
export const restartDeploymentWhatsAppLogin = async ({ deploymentId, target, }) => {
    const entry = getOrCreateEntry(deploymentId, target);
    const snapshot = await entry.store.restart();
    return toPublicWhatsAppLoginSnapshot(snapshot);
};
export const cancelCurrentDeploymentWhatsAppLogin = (deploymentId) => {
    const entry = deploymentStores.get(deploymentId);
    if (!entry) {
        return null;
    }
    const snapshot = entry.store.cancelCurrent();
    if (!snapshot) {
        pruneEntryIfExpired(deploymentId);
        return null;
    }
    return toPublicWhatsAppLoginSnapshot(snapshot);
};
export const clearDeploymentWhatsAppLoginSession = (deploymentId) => {
    deploymentStores.delete(deploymentId);
};
export const pruneExpiredWhatsAppLoginSession = (deploymentId) => {
    pruneEntryIfExpired(deploymentId);
};
