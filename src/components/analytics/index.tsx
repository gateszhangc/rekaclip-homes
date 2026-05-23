"use client";

import { useEffect, useState } from "react";
import GoogleAnalytics from "./google-analytics";
import OpenPanelAnalytics from "./open-panel";
import Plausible from "./plausible";
import ClarityAnalytics from "./clarity";
import LogRocketAnalytics from "./logrocket";

const getAnalyticsDelay = () => {
  if (typeof navigator === "undefined") {
    return 10000;
  }

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!connection) {
    return 10000;
  }

  if (connection.saveData) {
    return 20000;
  }

  const effectiveType = connection.effectiveType || "";
  if (effectiveType === "slow-2g" || effectiveType === "2g") {
    return 20000;
  }

  if (effectiveType === "3g") {
    return 15000;
  }

  return 10000;
};

export default function Analytics() {
  const [ready, setReady] = useState(false);
  const isProduction = process.env.NODE_ENV === "production";

  useEffect(() => {
    if (!isProduction) return;

    const delay = getAnalyticsDelay();
    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const setReadyOnce = () => {
      setReady(true);
    };

    const schedule = () => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(setReadyOnce, { timeout: delay });
      } else {
        timeoutId = window.setTimeout(setReadyOnce, delay);
      }
    };

    const handleInteraction = () => setReadyOnce();

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }

    // Interactions should also only trigger if we are scheduling
    window.addEventListener("pointerdown", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });

    return () => {
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener("load", schedule);
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  return (
    <>
      {isProduction && ready && (
        <>
          <OpenPanelAnalytics />
          <GoogleAnalytics />
          <Plausible />
          <ClarityAnalytics />
        </>
      )}
      <LogRocketAnalytics />
    </>
  );
}
