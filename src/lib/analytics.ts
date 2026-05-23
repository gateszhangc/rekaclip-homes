export type AnalyticsParams = Record<string, unknown>;

export function trackEvent(name: string, params: AnalyticsParams = {}) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  const gtag = (window as any).gtag;
  if (typeof gtag === "function") {
    gtag("event", name, params);
    return;
  }

  const dataLayer = (window as any).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push({ event: name, ...params });
  }
}
