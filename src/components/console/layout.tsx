import { ReactNode } from "react";
import { Sidebar } from "@/types/blocks/sidebar";
import SidebarNav from "@/components/console/sidebar/nav";

export default async function ConsoleLayout({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar?: Sidebar;
}) {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-8 md:py-12">
        <div className="w-full space-y-6 pb-16">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
            {sidebar?.nav?.items && (
              <aside className="w-full flex-shrink-0 lg:sticky lg:top-24 lg:w-60">
                <SidebarNav items={sidebar.nav?.items} />
              </aside>
            )}
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
