const DASHBOARD_URL_PATTERN = /Dashboard URL:\s*(https?:\/\/\S+)/i;

export function parseDashboardUrlFromOutput(output: string): string | null {
  const match = output.match(DASHBOARD_URL_PATTERN);
  return match?.[1] ?? null;
}

export function rewriteDashboardUrlPort(
  dashboardUrl: string,
  localPort: number
): string {
  const parsed = new URL(dashboardUrl);
  parsed.hostname = "127.0.0.1";
  parsed.port = String(localPort);
  return parsed.toString();
}

export function maskDashboardUrl(dashboardUrl: string): string {
  const parsed = new URL(dashboardUrl);
  const token = parsed.hash.match(/token=([^&]+)/)?.[1];

  if (!token) {
    return parsed.toString();
  }

  const maskedToken =
    token.length <= 8
      ? `${token.slice(0, 2)}...`
      : `${token.slice(0, 4)}...${token.slice(-4)}`;

  parsed.hash = parsed.hash.replace(token, maskedToken);
  return parsed.toString();
}

