"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useAppContext } from "@/contexts/app";

const LOGROCKET_APP_ID = "wtudta/gateszhang";

type LogRocketClient = typeof import("logrocket").default;

type LogRocketWindow = Window & {
  __logrocketInitialized?: boolean;
  __logrocketLastAction?: string;
};

let logrocketClient: LogRocketClient | null = null;
let initPromise: Promise<LogRocketClient | null> | null = null;

const getWindow = () =>
  typeof window === "undefined" ? null : (window as LogRocketWindow);

const initLogRocket = async () => {
  const w = getWindow();
  if (!w) return null;
  if (w.__logrocketInitialized && logrocketClient) {
    return logrocketClient;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const { default: LogRocket } = await import("logrocket");
    LogRocket.init(LOGROCKET_APP_ID);

    try {
      const { default: setupLogRocketReact } = await import("logrocket-react");
      setupLogRocketReact(LogRocket);
    } catch {
      // swallow plugin load errors
    }

    w.__logrocketInitialized = true;
    logrocketClient = LogRocket;
    return LogRocket;
  })().catch(() => {
    initPromise = null;
    return null;
  });

  return initPromise;
};

const setMetadata = (client: LogRocketClient | null, payload: Record<string, unknown>) => {
  if (!client || typeof (client as any).addMetadata !== "function") return;
  (client as any).addMetadata("app", payload);
};

const reportError = (client: LogRocketClient | null, error: Error, context: Record<string, unknown>) => {
  if (!client) return;
  if (typeof (client as any).captureException === "function") {
    (client as any).captureException(error);
    return;
  }
  if (typeof (client as any).log === "function") {
    (client as any).log("error", {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }
};

const getActionLabel = (event: Event) => {
  const target = event.target as HTMLElement | null;
  if (!target) return event.type;
  const tag = target.tagName ? target.tagName.toLowerCase() : "unknown";
  const dataAction =
    target.getAttribute("data-action") ||
    target.getAttribute("aria-label") ||
    target.id ||
    "";
  return dataAction ? `${event.type}:${tag}:${dataAction}` : `${event.type}:${tag}`;
};

if (typeof window !== "undefined") {
  initLogRocket();
}

export default function LogRocketAnalytics() {
  const { user } = useAppContext();
  const pathname = usePathname();
  const locale = useLocale();
  const lastActionRef = useRef<string | null>(null);

  useEffect(() => {
    initLogRocket().then((client) => {
      setMetadata(client, { pathname, locale });
    });
  }, [pathname, locale]);

  useEffect(() => {
    initLogRocket().then((client) => {
      if (!client) return;
      if (user?.uuid) {
        (client as any).identify?.(user.uuid, {
          email: user.email,
          name: user.nickname,
        });
      }
    });
  }, [user?.uuid, user?.email, user?.nickname]);

  useEffect(() => {
    const w = getWindow();
    if (!w) return;
    const handleClick = (event: Event) => {
      const label = getActionLabel(event);
      lastActionRef.current = label;
      w.__logrocketLastAction = label;
    };
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  useEffect(() => {
    const w = getWindow();
    if (!w) return;
    const handleError = (event: ErrorEvent) => {
      const error = event.error ?? new Error(event.message || "Unknown error");
      const lastAction = lastActionRef.current || w.__logrocketLastAction;
      initLogRocket().then((client) => {
        if (!client) return;
        setMetadata(client, {
          pathname,
          locale,
          lastAction,
        });
        reportError(client, error, { pathname, locale, lastAction });
      });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const error =
        reason instanceof Error
          ? reason
          : new Error(`Unhandled rejection: ${String(reason)}`);
      const lastAction = lastActionRef.current || w.__logrocketLastAction;
      initLogRocket().then((client) => {
        if (!client) return;
        setMetadata(client, {
          pathname,
          locale,
          lastAction,
        });
        reportError(client, error, { pathname, locale, lastAction });
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [pathname, locale]);

  return null;
}
