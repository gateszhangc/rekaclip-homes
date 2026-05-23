import type { OpenClawK8sDashboardTarget } from "../k8s.js";
import { CurrentDashboardSessionStore } from "./session-store.js";
import { K8sDashboardRuntimeAdapter } from "./runtime.js";
import type { DashboardSessionSnapshot } from "./types.js";

const deploymentStores = new Map<string, CurrentDashboardSessionStore>();

const getOrCreateStore = (deploymentId: string): CurrentDashboardSessionStore => {
  let store = deploymentStores.get(deploymentId);

  if (!store) {
    store = new CurrentDashboardSessionStore({
      runtimeAdapter: new K8sDashboardRuntimeAdapter(),
    });
    deploymentStores.set(deploymentId, store);
  }

  return store;
};

export const getDeploymentOpenClawDashboardSnapshot = (
  deploymentId: string
): DashboardSessionSnapshot | null => {
  return deploymentStores.get(deploymentId)?.getCurrentSnapshot() || null;
};

export const startOrReuseDeploymentOpenClawDashboard = async ({
  deploymentId,
  target,
}: {
  deploymentId: string;
  target: OpenClawK8sDashboardTarget;
}): Promise<DashboardSessionSnapshot> => {
  return await getOrCreateStore(deploymentId).startOrReuse(target);
};

export const stopDeploymentOpenClawDashboard = async (
  deploymentId: string
): Promise<boolean> => {
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
