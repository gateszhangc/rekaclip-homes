"use client";

import { ReactNode } from "react";
import RekaLandingShell from "@/components/landing/reka-landing-shell";

export default function RekaBlogShell({ children }: { children: ReactNode }) {
  return <RekaLandingShell activeSection="blog">{children}</RekaLandingShell>;
}
