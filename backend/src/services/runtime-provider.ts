export type OpenClawRuntimeProvider = "docker" | "k8s";

const DEFAULT_OPENCLAW_RUNTIME_PROVIDER: OpenClawRuntimeProvider = "k8s";
const DEFAULT_OPENCLAW_K8S_NAMESPACE = "easyclaw-openclaw";

export const resolveOpenClawRuntimeProvider = (): OpenClawRuntimeProvider => {
  const raw = process.env.OPENCLAW_RUNTIME_PROVIDER?.trim().toLowerCase();
  return raw === "docker" ? "docker" : DEFAULT_OPENCLAW_RUNTIME_PROVIDER;
};

export const resolveOpenClawK8sNamespace = (): string => {
  const raw = process.env.OPENCLAW_K8S_NAMESPACE?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_OPENCLAW_K8S_NAMESPACE;
};

