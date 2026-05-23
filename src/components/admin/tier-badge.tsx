"use client";

import { Circle, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Tier = "starter" | "pro";

interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  const isPro = tier === "pro";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        isPro
          ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-300"
          : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-400/35 dark:bg-slate-500/10 dark:text-slate-300",
        className
      )}
    >
      {isPro ? <Star className="h-3 w-3 fill-current" /> : <Circle className="h-3 w-3 fill-current" />}
      {isPro ? "Pro" : "Starter"}
    </span>
  );
}
