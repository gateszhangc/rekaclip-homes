import React from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type InlineNoticeVariant = "success" | "error" | "warning" | "info";

interface InlineNoticeProps {
  title: string;
  description?: string;
  variant?: InlineNoticeVariant;
  requestId?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<
  InlineNoticeVariant,
  { icon: React.ElementType; accent: string; ring: string; glow: string }
> = {
  success: {
    icon: CheckCircle2,
    accent: "text-emerald-500",
    ring: "border-emerald-500/25",
    glow: "from-emerald-400/20",
  },
  error: {
    icon: ShieldAlert,
    accent: "text-rose-500",
    ring: "border-rose-500/25",
    glow: "from-rose-400/20",
  },
  warning: {
    icon: AlertTriangle,
    accent: "text-amber-500",
    ring: "border-amber-500/25",
    glow: "from-amber-400/20",
  },
  info: {
    icon: Info,
    accent: "text-sky-500",
    ring: "border-sky-500/25",
    glow: "from-sky-400/20",
  },
};

const InlineNotice: React.FC<InlineNoticeProps> = ({
  title,
  description,
  variant = "info",
  requestId,
  actionLabel,
  onAction,
  onDismiss,
  className,
}) => {
  const { icon: Icon, accent, ring, glow } = variantStyles[variant];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card/95 text-foreground shadow-lg shadow-black/5",
        ring,
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 opacity-70",
          "bg-gradient-to-br",
          glow,
          "via-transparent to-transparent"
        )}
      />
      <div className="relative flex flex-col gap-3 px-4 py-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border bg-background/80 shadow-sm",
              ring,
              accent
            )}
          >
            <Icon size={18} />
          </span>
          <div className="flex-1 space-y-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Status
            </p>
            <h4 className="text-sm font-serif font-semibold text-foreground">
              {title}
            </h4>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground transition hover:text-foreground"
              aria-label="Dismiss"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {(requestId || actionLabel) && (
          <div className="flex flex-wrap items-center gap-3">
            {requestId && (
              <div className="rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] text-muted-foreground">
                <span className="uppercase tracking-[0.18em]">Request ID</span>
                <span className="ml-2 font-mono text-foreground">{requestId}</span>
              </div>
            )}
            {actionLabel && onAction && (
              <button
                type="button"
                onClick={onAction}
                className="ml-auto rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary/60 hover:bg-primary/15"
              >
                {actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InlineNotice;
