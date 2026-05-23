"use client";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  isBound: boolean;
  isActive: boolean;
}

export function StatusBadge({ isBound, isActive }: StatusBadgeProps) {
  if (!isActive) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
          "bg-red-500/10 text-red-500 border border-red-500/20"
        )}
      >
        Inactive
      </span>
    );
  }

  if (isBound) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
          "bg-blue-500/10 text-blue-500 border border-blue-500/20"
        )}
      >
        Bound
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        "bg-green-500/10 text-green-500 border border-green-500/20"
      )}
    >
      Available
    </span>
  );
}
