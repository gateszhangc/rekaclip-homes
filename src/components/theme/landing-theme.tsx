"use client";

import { ReactNode, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { locales } from "@/i18n/locale";
import HeroBg from "@/components/blocks/hero/bg";

type LandingThemeProps = {
  children: ReactNode;
  className?: string;
  /**
   * Force applying the landing theme regardless of the current pathname.
   * Useful for route groups (e.g. admin) that should share the same theme.
   */
  force?: boolean;
};

const LANDING_SECTIONS = new Set([
  "posts",
  "pricing",
  "my-orders",
  "my-credits",
  "my-invites",
  "api-keys",
  "styles",
]);

const isLandingPath = (pathname: string | null) => {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/$/, "");
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return true;
  const firstSegment = segments[0];
  const hasLocalePrefix = locales.includes(firstSegment);
  if (segments.length === 1 && hasLocalePrefix) return true;
  const contentSegments = hasLocalePrefix ? segments.slice(1) : segments;
  if (contentSegments.length === 0) return true;
  if (LANDING_SECTIONS.has(contentSegments[0])) return true;
  return false;
};

const getLandingTheme = (_pathname: string | null) => "landing-shipany";

export default function LandingTheme({
  children,
  className,
  force = false,
}: LandingThemeProps) {
  const pathname = usePathname();
  const shouldApplyTheme = force || isLandingPath(pathname);
  const landingClassName = useMemo(
    () => cn(getLandingTheme(pathname), className),
    [pathname, className]
  );
  const landingWrapperClassName = useMemo(
    () => cn(landingClassName, "relative"),
    [landingClassName]
  );

  useEffect(() => {
    if (!shouldApplyTheme) return;
    const bodyClasses = landingClassName.split(" ").filter(Boolean);
    const body = document.body;
    body.classList.add(...bodyClasses);
    return () => {
      body.classList.remove(...bodyClasses);
    };
  }, [shouldApplyTheme, landingClassName]);

  const showHeroBg = landingClassName.includes("landing-raphael");

  return (
    <div
      className={shouldApplyTheme ? cn(landingWrapperClassName, "overflow-x-hidden") : ""}
    >
      {shouldApplyTheme && showHeroBg ? <HeroBg /> : null}
      {children}
    </div>
  );
}
