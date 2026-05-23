"use client";

import { ReactNode } from "react";
import RekaSidebar from "@/components/landing/reka-sidebar";

export default function RekaBoostShell({ children }: { children: ReactNode }) {
  return (
    <div className="landing-reka">
      <RekaSidebar activeSection="boost" />
      <main className="reka-main">{children}</main>
    </div>
  );
}
