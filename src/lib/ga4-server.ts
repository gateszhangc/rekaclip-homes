import { createLogger } from "@/lib/logger";

const log = createLogger("ga4");

type Ga4Item = {
  item_id: string;
  item_name?: string;
  item_category?: string;
  quantity?: number;
  price?: number;
};

export type Ga4PurchaseEvent = {
  clientId: string;
  sessionId?: number;
  sessionNumber?: number;
  transactionId: string;
  value: number;
  currency: string;
  items: Ga4Item[];
  purchaseType?: "one_time" | "subscription_initial" | "subscription_renewal";
  subTimes?: number;
};

export type Ga4RefundEvent = {
  clientId: string;
  sessionId?: number;
  sessionNumber?: number;
  transactionId: string;
  value: number;
  currency: string;
  items?: Ga4Item[];
};

export type Ga4ChargebackEvent = {
  clientId: string;
  sessionId?: number;
  sessionNumber?: number;
  transactionId?: string;
  value: number;
  currency: string;
  reason?: string;
};

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

export function minorToMajorCurrencyUnits(amountMinor: number, currency: string): number {
  if (!Number.isFinite(amountMinor)) {
    return 0;
  }

  const normalizedCurrency = (currency || "").toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)) {
    return Math.round(amountMinor);
  }

  return Math.round(amountMinor) / 100;
}

function roundValueForCurrency(value: number, currency: string): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const normalizedCurrency = (currency || "").toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)) {
    return Math.round(value);
  }

  return Math.round(value * 100) / 100;
}

function getMeasurementId(): string | null {
  const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim();
  if (!measurementId) {
    return null;
  }

  return measurementId;
}

function getApiSecret(): string | null {
  const apiSecret = process.env.GA4_API_SECRET?.trim();
  if (!apiSecret) {
    return null;
  }

  return apiSecret;
}

async function sendGa4Event(payload: { client_id: string; events: Array<{ name: string; params?: any }> }) {
  const measurementId = getMeasurementId();
  const apiSecret = getApiSecret();

  if (!measurementId || !apiSecret) {
    return;
  }

  const url = new URL("https://www.google-analytics.com/mp/collect");
  url.searchParams.set("measurement_id", measurementId);
  url.searchParams.set("api_secret", apiSecret);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      log.warn({ status: res.status, body: text.slice(0, 200) }, "ga4 mp request failed");
    }
  } catch (err) {
    log.warn({ err }, "ga4 mp request error");
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function trackPurchase(event: Ga4PurchaseEvent) {
  if (!event.clientId) {
    return;
  }

  const currency = (event.currency || "").toUpperCase();
  const params: Record<string, any> = {
    transaction_id: event.transactionId,
    value: roundValueForCurrency(event.value, currency),
    currency,
    items: event.items,
    engagement_time_msec: 1,
  };

  if (typeof event.sessionId === "number") {
    params.ga_session_id = event.sessionId;
  }
  if (typeof event.sessionNumber === "number") {
    params.ga_session_number = event.sessionNumber;
  }
  if (event.purchaseType) {
    params.purchase_type = event.purchaseType;
  }
  if (typeof event.subTimes === "number") {
    params.sub_times = event.subTimes;
  }

  await sendGa4Event({
    client_id: event.clientId,
    events: [
      {
        name: "purchase",
        params,
      },
    ],
  });
}

export async function trackRefund(event: Ga4RefundEvent) {
  if (!event.clientId) {
    return;
  }

  const currency = (event.currency || "").toUpperCase();
  const params: Record<string, any> = {
    transaction_id: event.transactionId,
    value: roundValueForCurrency(event.value, currency),
    currency,
    engagement_time_msec: 1,
  };

  if (Array.isArray(event.items) && event.items.length > 0) {
    params.items = event.items;
  }

  if (typeof event.sessionId === "number") {
    params.ga_session_id = event.sessionId;
  }
  if (typeof event.sessionNumber === "number") {
    params.ga_session_number = event.sessionNumber;
  }

  await sendGa4Event({
    client_id: event.clientId,
    events: [
      {
        name: "refund",
        params,
      },
    ],
  });
}

export async function trackChargeback(event: Ga4ChargebackEvent) {
  if (!event.clientId) {
    return;
  }

  const currency = (event.currency || "").toUpperCase();
  const params: Record<string, any> = {
    value: roundValueForCurrency(event.value, currency),
    currency,
    engagement_time_msec: 1,
  };

  if (event.transactionId) {
    params.transaction_id = event.transactionId;
  }
  if (event.reason) {
    params.reason = event.reason;
  }
  if (typeof event.sessionId === "number") {
    params.ga_session_id = event.sessionId;
  }
  if (typeof event.sessionNumber === "number") {
    params.ga_session_number = event.sessionNumber;
  }

  await sendGa4Event({
    client_id: event.clientId,
    events: [
      {
        name: "chargeback",
        params,
      },
    ],
  });
}
