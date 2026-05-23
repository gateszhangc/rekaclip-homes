"use client";

import { ReactNode } from "react";
import RekaSidebar from "@/components/landing/reka-sidebar";

export default function RekaPricingShell({ children }: { children: ReactNode }) {
  return (
    <div className="landing-reka">
      <RekaSidebar activeSection="pricing" />
      <main className="reka-main">{children}</main>
    </div>
  );
}
