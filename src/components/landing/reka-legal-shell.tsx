"use client";

import { ReactNode } from "react";
import LandingTheme from "@/components/theme/landing-theme";
import RekaLandingShell from "@/components/landing/reka-landing-shell";

export default function RekaLegalShell({ children }: { children: ReactNode }) {
  return (
    <LandingTheme force>
      <RekaLandingShell activeSection="">{children}</RekaLandingShell>
    </LandingTheme>
  );
}
