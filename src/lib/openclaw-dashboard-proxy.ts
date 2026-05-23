export type OpenClawDashboardSnapshot = {
  sessionId: string;
  status: "starting" | "ready" | "failed";
  localPort: number | null;
  dashboardUrl: string | null;
  maskedDashboardUrl: string | null;
  startedAt: string;
  updatedAt: string;
  lastError: string | null;
  logs: Array<{
    id: string;
    level: "info" | "error";
    message: string;
    at: string;
  }>;
  target: {
    namespace: string;
    deployment: string;
    pod: string;
    container: string;
    gatewayPort: number;
  };
};

const PUBLIC_DASHBOARD_PREFIX = "/_openclaw-dashboard";

const normalizeProxyPath = (pathname: string): string => {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return normalized === "/" ? "/control-ui" : normalized;
};

export const rewriteOpenClawDashboardUrlForRequest = ({
  dashboardUrl,
  requestUrl,
  deploymentId,
}: {
  dashboardUrl: string;
  requestUrl: string;
  deploymentId: string;
}): string => {
  const source = new URL(dashboardUrl);
  const target = new URL(requestUrl);
  target.pathname = `${PUBLIC_DASHBOARD_PREFIX}/${deploymentId}${normalizeProxyPath(
    source.pathname
  )}`.replace(/\/{2,}/g, "/");
  target.search = source.search;
  target.hash = source.hash;
  return target.toString();
};

export const rewriteOpenClawDashboardSnapshotForRequest = ({
  snapshot,
  requestUrl,
  deploymentId,
}: {
  snapshot: OpenClawDashboardSnapshot;
  requestUrl: string;
  deploymentId: string;
}): OpenClawDashboardSnapshot => ({
  ...snapshot,
  dashboardUrl: snapshot.dashboardUrl
    ? rewriteOpenClawDashboardUrlForRequest({
        dashboardUrl: snapshot.dashboardUrl,
        requestUrl,
        deploymentId,
      })
    : null,
  maskedDashboardUrl: snapshot.maskedDashboardUrl
    ? rewriteOpenClawDashboardUrlForRequest({
        dashboardUrl: snapshot.maskedDashboardUrl,
        requestUrl,
        deploymentId,
      })
    : null,
});

export const rewriteOpenClawDashboardLocationForRequest = ({
  location,
  requestUrl,
  deploymentId,
}: {
  location: string;
  requestUrl: string;
  deploymentId: string;
}): string => {
  const base = new URL(requestUrl);
  const resolved = new URL(location, base);
  return rewriteOpenClawDashboardUrlForRequest({
    dashboardUrl: resolved.toString(),
    requestUrl,
    deploymentId,
  });
};

