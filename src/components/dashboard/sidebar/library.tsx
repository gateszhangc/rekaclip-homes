"use client";

import {
  IconDots,
  IconFolder,
  IconShare3,
  IconTrash,
} from "@tabler/icons-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Library as LibraryType } from "@/types/blocks/base";
import Icon from "@/components/icon";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Library({ library }: { library: LibraryType }) {
  const { isMobile } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const items = library?.items ?? [];

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
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{library.title}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item, index) => {
          const isActive =
            item.is_active || pathname.endsWith(item.url as string);

          return (
            <SidebarMenuItem key={index}>
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
                  href={(item.url || "") as any}
                  target={item.target}
                  className="flex w-full items-center gap-2"
                >
                  {item.icon && <Icon name={item.icon} />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
              <DropdownMenu>
              {/* <DropdownMenuTrigger asChild>
                <SidebarMenuAction
                  showOnHover
                  className="data-[state=open]:bg-accent rounded-sm"
                >
                  <IconDots />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger> */}
              {/* <DropdownMenuContent
                className="w-24 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem>
                  <IconFolder />
                  <span>Open</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <IconShare3 />
                  <span>Share</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <IconTrash />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent> */}
              </DropdownMenu>
            </SidebarMenuItem>
          );
        })}

        {library.more && (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70">
              <IconDots className="text-sidebar-foreground/70" />
              <span>{library.more.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
