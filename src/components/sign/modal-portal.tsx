"use client";

import dynamic from "next/dynamic";
import { useAppContext } from "@/contexts/app";
import { isAuthEnabled } from "@/lib/auth";

const SignModal = dynamic(() => import("./modal"), { ssr: false });

export default function SignModalPortal() {
  const { showSignModal } = useAppContext();

  if (!isAuthEnabled() || !showSignModal) {
    return null;
  }

  return <SignModal />;
}
