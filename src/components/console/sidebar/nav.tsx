"use client";

import Icon from "@/components/icon";
import { Link, useRouter } from "@/i18n/navigation";
import { NavItem } from "@/types/blocks/base";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ({
  className,
  items,
  ...props
}: {
  className?: string;
  items: NavItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!items?.length) return;
    if (typeof navigator === "undefined") return;

    const browserWindow = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (
          callback: IdleRequestCallback,
          options?: IdleRequestOptions
        ) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g") {
      return;
    }

    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

    const prefetchRoutes = () => {
      items.forEach((item) => {
        if (item.url) {
          router.prefetch(item.url as any);
        }
      });
    };

    if (typeof browserWindow.requestIdleCallback === "function") {
      idleId = browserWindow.requestIdleCallback(prefetchRoutes, {
        timeout: 2000,
      });
    } else {
      timeoutId = globalThis.setTimeout(prefetchRoutes, 1200);
    }

    return () => {
      if (idleId !== null && typeof browserWindow.cancelIdleCallback === "function") {
        browserWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) globalThis.clearTimeout(timeoutId);
    };
  }, [items, router]);

  return (
    <nav
      data-testid="console-sidebar"
      className={cn(
        "flex gap-2 rounded-[24px] border border-border/70 bg-card/80 p-2.5 shadow-[0_18px_40px_rgba(15,15,25,0.22)] backdrop-blur-xl lg:flex-col",
        className
      )}
      {...props}
    >
      {items.map((item, index) => (
        <Link
          key={index}
          href={item.url as any}
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all duration-200",
            item.is_active || pathname.includes(item.url as any)
              ? "border border-primary/25 bg-primary/10 text-primary shadow-[0_10px_24px_rgba(15,15,25,0.16)]"
              : "border border-transparent text-foreground/78 hover:border-border/60 hover:bg-background/50 hover:text-foreground"
          )}
        >
          {item.icon && <Icon name={item.icon} className="h-4 w-4" />}
          <span className="truncate font-medium">{item.title}</span>
        </Link>
      ))}
    </nav>
  );
}
