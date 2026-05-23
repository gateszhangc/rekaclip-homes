"use client";

import { cn } from "@/lib/utils";

type CreditIconProps = {
  className?: string;
  size?: "sm" | "md";
};

const creditIconBase =
  "inline-flex items-center justify-center rounded-full bg-amber-200/15 text-amber-100 ring-1 ring-amber-200/35 shadow-[0_0_14px_rgba(240,170,90,0.35)]";

export function CreditIcon({ className, size = "sm" }: CreditIconProps) {
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const iconSizeClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span className={cn(creditIconBase, sizeClass, className)} aria-hidden="true">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={iconSizeClass}
      >
        <circle cx="8" cy="8" r="6" />
        <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
        <path d="M7 6h1v4" />
        <path d="m16.71 13.88.7.71-2.82 2.82" />
      </svg>
    </span>
  );
}

type CreditBadgeProps = {
  value: number;
  className?: string;
};

export function CreditBadge({ value, className }: CreditBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-100 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur",
        className
      )}
    >
      <CreditIcon size="sm" />
      <span>{value}</span>
    </div>
  );
}
