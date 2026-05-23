import {
  type CreateContainerResult,
  createOpenClawContainer,
  inspectOpenClawContainer,
  selectOpenClawTargetHost,
  startOpenClawPoolPrewarmLoop,
  type DeployChannel,
  type OpenClawContainerStatus,
  WHATSAPP_K8S_ONLY_ERROR_CODE,
} from "./docker.js";
import {
  createOpenClawK8sRuntime,
  inspectOpenClawK8sRuntime,
} from "./k8s.js";
import {
  getPersistedDeploymentRuntimeState,
  persistDeploymentRuntimeState,
  type DeploymentRuntimeStateRecord,
} from "./deployment-runtime-state-store.js";
import { resolvePersistedDeploymentTargetHost } from "./deployment-target-host-store.js";
import {
  resolveOpenClawK8sNamespace,
  resolveOpenClawRuntimeProvider,
  type OpenClawRuntimeProvider,
} from "./runtime-provider.js";
import { dockerLogger } from "../utils/logger.js";

export type OpenClawResolvedRuntimeState = DeploymentRuntimeStateRecord;

export type OpenClawResolvedRuntimeInspection = OpenClawContainerStatus & {
  provider: OpenClawRuntimeProvider;
  dockerTargetHost: string | null;
  k8sNamespace: string | null;
};

export const resolveDefaultOpenClawRuntimeState = async (): Promise<OpenClawResolvedRuntimeState> => {
  const provider = resolveOpenClawRuntimeProvider();
  if (provider === "docker") {
    return {
      provider,
      dockerTargetHost: await selectOpenClawTargetHost(),
      k8sNamespace: null,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    provider,
    dockerTargetHost: null,
    k8sNamespace: resolveOpenClawK8sNamespace(),
    updatedAt: new Date().toISOString(),
  };
};

export const prepareOpenClawRuntimeState = async (
  deploymentId: string
): Promise<OpenClawResolvedRuntimeState> => {
  const resolved = await resolveDefaultOpenClawRuntimeState();
  await persistDeploymentRuntimeState(deploymentId, resolved);
  return resolved;
};

export const resolveOpenClawRuntimeStateForDeployment = async (
  deploymentId: string,
  databaseTargetHost: unknown
): Promise<OpenClawResolvedRuntimeState> => {
  const persisted = await getPersistedDeploymentRuntimeState(deploymentId);
  if (persisted) {
    return persisted;
  }

  const dockerTargetHost = await resolvePersistedDeploymentTargetHost(
    deploymentId,
    databaseTargetHost
  );
  const dockerStatus = await inspectOpenClawContainer(deploymentId, dockerTargetHost);
  if (dockerStatus.exists) {
    const resolved: OpenClawResolvedRuntimeState = {
      provider: "docker",
      dockerTargetHost,
      k8sNamespace: null,
      updatedAt: new Date().toISOString(),
    };
    await persistDeploymentRuntimeState(deploymentId, resolved);
    return resolved;
  }

  const k8sNamespace = resolveOpenClawK8sNamespace();
  const k8sStatus = await inspectOpenClawK8sRuntime(deploymentId, k8sNamespace);
  if (k8sStatus.exists) {
    const resolved: OpenClawResolvedRuntimeState = {
      provider: "k8s",
      dockerTargetHost: null,
      k8sNamespace,
      updatedAt: new Date().toISOString(),
    };
    await persistDeploymentRuntimeState(deploymentId, resolved);
    return resolved;
  }

  return {
    provider: resolveOpenClawRuntimeProvider(),
    dockerTargetHost,
    k8sNamespace: k8sNamespace,
    updatedAt: new Date().toISOString(),
  };
};

export const inspectOpenClawRuntimeForDeployment = async (
  deploymentId: string,
  databaseTargetHost: unknown
): Promise<OpenClawResolvedRuntimeInspection> => {
  const runtime = await resolveOpenClawRuntimeStateForDeployment(
    deploymentId,
    databaseTargetHost
  );

  if (runtime.provider === "docker") {
    const status = await inspectOpenClawContainer(
      deploymentId,
      runtime.dockerTargetHost
    );
    return {
      ...status,
      provider: runtime.provider,
      dockerTargetHost: runtime.dockerTargetHost,
      k8sNamespace: null,
    };
  }

  const status = await inspectOpenClawK8sRuntime(
    deploymentId,
    runtime.k8sNamespace || resolveOpenClawK8sNamespace()
  );
  return {
    ...status,
    provider: runtime.provider,
    dockerTargetHost: null,
    k8sNamespace: runtime.k8sNamespace || resolveOpenClawK8sNamespace(),
  };
};

export const createOpenClawRuntimeForDeployment = async ({
  deploymentId,
  databaseTargetHost,
  channel,
  channelToken,
  model,
  userId,
  tier,
}: {
  deploymentId: string;
  databaseTargetHost: unknown;
  channel: DeployChannel;
  channelToken: string;
  model?: string;
  userId?: string;
  tier?: "starter" | "pro";
}): Promise<CreateContainerResult> => {
  const runtime = await resolveOpenClawRuntimeStateForDeployment(
    deploymentId,
    databaseTargetHost
  );

  if (runtime.provider === "docker") {
    if (channel === "whatsapp") {
      throw new Error(
        `${WHATSAPP_K8S_ONLY_ERROR_CODE}: WhatsApp deployments require the k8s runtime provider.`
      );
    }

    let targetHost = runtime.dockerTargetHost;
    if (!targetHost) {
      targetHost = await selectOpenClawTargetHost();
      await persistDeploymentRuntimeState(deploymentId, {
        provider: "docker",
        dockerTargetHost: targetHost,
      });
    }

    return createOpenClawContainer({
      channel,
      channelToken,
      model,
      deploymentId,
      targetHost,
      userId,
      tier,
    });
  }

  const namespace = runtime.k8sNamespace || resolveOpenClawK8sNamespace();
  await persistDeploymentRuntimeState(deploymentId, {
    provider: "k8s",
    k8sNamespace: namespace,
  });

  return createOpenClawK8sRuntime({
    channel,
    channelToken,
    model,
    deploymentId,
    namespace,
    userId,
    tier,
  });
};

export const startOpenClawRuntimeBackgroundTasks = (): void => {
  if (resolveOpenClawRuntimeProvider() === "docker") {
    startOpenClawPoolPrewarmLoop();
    return;
  }

  dockerLogger.info(
    { provider: resolveOpenClawRuntimeProvider() },
    "Skipping Docker image prewarm because the default runtime provider is not docker"
  );
};
