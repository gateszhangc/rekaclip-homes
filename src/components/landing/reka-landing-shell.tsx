"use client";

import { ReactNode } from "react";
import RekaTopNav from "@/components/landing/reka-top-nav";

export default function RekaLandingShell({
  children,
  activeSection,
  onNavigate,
}: {
  children: ReactNode;
  activeSection: string;
  onNavigate?: (id: string) => void;
}) {
  return (
    <div className="landing-reka">
      <RekaTopNav activeSection={activeSection} onNavigate={onNavigate} />
      <main className="reka-main">{children}</main>
    </div>
  );
}
