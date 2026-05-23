"use client";

import { useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAppContext } from "@/contexts/app";
import { isAuthEnabled } from "@/lib/auth";
import type { User } from "@/types/user";

export type RekaActionSource = "clip_generate" | "clip_upload" | "boost_cta";

/** True only after a real purchase — not signup free credits (NewUserGet = 5). */
function hasPaidAccess(user: User | null | undefined): boolean {
  if (!user) return false;
  return Boolean(user.hasActiveSubscription || user.credits?.is_recharged);
}

export function useRekaClipGate() {
  const router = useRouter();
  const { user, setUser, setShowSignModal } = useAppContext();
  const authEnabled = isAuthEnabled();

  const refreshUser = useCallback(async (): Promise<User | null> => {
    if (!authEnabled) return null;

    try {
      const resp = await fetch("/api/get-user-info", { method: "POST" });
      const payload = await resp.json().catch(() => null);

      if (resp.ok && payload?.code === 0 && payload?.data) {
        setUser(payload.data);
        return payload.data as User;
      }

      if (payload?.code === -2) {
        return null;
      }
    } catch {
      // fall through
    }

    return user;
  }, [authEnabled, setUser, user]);

  const requireAuthAndPayment = useCallback(
    async (source: RekaActionSource): Promise<boolean> => {
      if (!authEnabled) {
        return true;
      }

      const latest = await refreshUser();

      if (!latest?.uuid) {
        setShowSignModal(true);
        return false;
      }

      if (!hasPaidAccess(latest)) {
        router.push(`/pricing?source=${source}`);
        return false;
      }

      return true;
    },
    [authEnabled, refreshUser, router, setShowSignModal]
  );

  return { requireAuthAndPayment };
}
