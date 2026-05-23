export type DashboardLogLevel = "info" | "error";

export type DashboardSessionStatus = "starting" | "ready" | "failed";

export type DashboardTarget = {
  namespace: string;
  deployment: string;
  pod: string;
  container: string;
  gatewayPort: number;
};

export type DashboardLogEntry = {
  id: string;
  level: DashboardLogLevel;
  message: string;
  at: string;
};

export type DashboardSessionSnapshot = {
  sessionId: string;
  status: DashboardSessionStatus;
  localPort: number | null;
  dashboardUrl: string | null;
  maskedDashboardUrl: string | null;
  startedAt: string;
  updatedAt: string;
  lastError: string | null;
  logs: DashboardLogEntry[];
  target: DashboardTarget;
};

