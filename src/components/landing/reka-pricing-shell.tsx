"use client";

import { ReactNode } from "react";
import RekaLandingShell from "@/components/landing/reka-landing-shell";

export default function RekaPricingShell({ children }: { children: ReactNode }) {
  return (
    <RekaLandingShell activeSection="pricing">
      {children}
    </RekaLandingShell>
  );
}
