"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const getIdleDelay = () => {
  if (typeof navigator === "undefined") {
    return 5000;
  }

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!connection) {
    return 5000;
  }

  if (connection.saveData) {
    return 12000;
  }

  const effectiveType = connection.effectiveType || "";
  if (effectiveType === "slow-2g" || effectiveType === "2g") {
    return 12000;
  }

  if (effectiveType === "3g") {
    return 8000;
  }

  return 5000;
};

const QwenImageLayeredSkeleton = () => (
  <div className="relative mx-auto w-full max-w-6xl animate-pulse">
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)]">
        <div className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-card/70 p-5">
          <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
            <div className="mb-3 h-6 w-32 rounded bg-muted/50" />
            <div className="h-28 rounded-xl border-2 border-dashed border-border bg-muted/30" />
          </div>
          <div className="h-12 rounded-xl bg-primary/30" />
        </div>
        <div className="flex flex-col rounded-2xl border border-border/70 bg-card/60 p-5">
          <div className="flex items-center gap-2 border-b border-border/60 pb-4">
            <div className="size-9 rounded-full bg-muted/50" />
            <div className="h-5 w-32 rounded bg-muted/50" />
          </div>
          <div className="mt-4 flex-1">
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/30 p-10">
              <div className="mb-2 h-4 w-40 rounded bg-muted/50" />
              <div className="h-3 w-56 rounded bg-muted/30" />
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card/60 p-5">
        <div className="mb-4 h-6 w-24 rounded bg-muted/50" />
        <div className="flex gap-3 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 min-w-[120px] rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const QwenImageLayered = dynamic(() => import("./index"), {
  ssr: false,
  loading: () => <QwenImageLayeredSkeleton />,
});

export default function QwenImageLayeredLazy() {
  const [isVisible, setIsVisible] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const delay = getIdleDelay();
    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const markIdle = () => setIsIdle(true);

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(markIdle, { timeout: delay });
    } else {
      timeoutId = window.setTimeout(markIdle, delay);
    }

    return () => {
      if (idleId !== null) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      return;
    }

    const target = containerRef.current;
    if (!target) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [isVisible]);

  return (
    <div ref={containerRef}>
      {isVisible && isIdle ? <QwenImageLayered /> : <QwenImageLayeredSkeleton />}
    </div>
  );
}
