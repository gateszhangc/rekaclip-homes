"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Nav as NavType } from "@/types/blocks/base";
import { Link, useRouter } from "@/i18n/navigation";
import Icon from "@/components/icon";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export default function Nav({ nav }: { nav: NavType }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = nav?.items ?? [];

  useEffect(() => {
    if (!items.length) return;
    if (typeof navigator === "undefined") return;

    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g") {
      return;
    }

    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const prefetchRoutes = () => {
      items.forEach((item) => {
        if (item.url) {
          router.prefetch(item.url as any);
        }
      });
    };

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(prefetchRoutes, { timeout: 2000 });
    } else {
      timeoutId = window.setTimeout(prefetchRoutes, 1200);
    }

    return () => {
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [items, router]);

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2 mt-4">
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.is_active || pathname.endsWith(item.url as string);

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  asChild
                  className={cn(
                    "transition-colors duration-150",
                    isActive
                      ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_0_1px_hsl(38_62%_56%_/_0.18)]"
                      : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-primary/10"
                  )}
                >
                  <Link
                    href={item.url as any}
                    target={item.target}
                    className="flex w-full items-center gap-2"
                  >
                    {item.icon && <Icon name={item.icon} />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
