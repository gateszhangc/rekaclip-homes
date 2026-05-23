"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

export default function GaRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPagePathRef = useRef<string | null>(null);

  useEffect(() => {
    const search = searchParams?.toString();
    const pagePath = `${pathname || ""}${search ? `?${search}` : ""}`;

    if (!pagePath) {
      return;
    }

    if (lastPagePathRef.current === pagePath) {
      return;
    }

    lastPagePathRef.current = pagePath;

    trackEvent("page_view", {
      page_location: window.location.href,
      page_path: pagePath,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

