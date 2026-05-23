import { CurrentDashboardSessionStore } from "./session-store.js";
import { K8sDashboardRuntimeAdapter } from "./runtime.js";
const deploymentStores = new Map();
const getOrCreateStore = (deploymentId) => {
    let store = deploymentStores.get(deploymentId);
    if (!store) {
        store = new CurrentDashboardSessionStore({
            runtimeAdapter: new K8sDashboardRuntimeAdapter(),
        });
        deploymentStores.set(deploymentId, store);
    }
    return store;
};
export const getDeploymentOpenClawDashboardSnapshot = (deploymentId) => {
    return deploymentStores.get(deploymentId)?.getCurrentSnapshot() || null;
};
export const startOrReuseDeploymentOpenClawDashboard = async ({ deploymentId, target, }) => {
    return await getOrCreateStore(deploymentId).startOrReuse(target);
};
export const stopDeploymentOpenClawDashboard = async (deploymentId) => {
    const store = deploymentStores.get(deploymentId);
    if (!store) {
        return false;
    }
    const stopped = await store.stopCurrent();
    if (stopped) {
        deploymentStores.delete(deploymentId);
    }
    return stopped;
};
