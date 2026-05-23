import { cn } from "@/lib/utils";

const providerTheme: Record<string, string> = {
  kie: "border-cyan-400/35 bg-cyan-500/10 text-cyan-300",
  openai: "border-emerald-400/35 bg-emerald-500/10 text-emerald-300",
  openrouter: "border-sky-400/35 bg-sky-500/10 text-sky-300",
  anthropic: "border-orange-400/35 bg-orange-500/10 text-orange-300",
  google: "border-rose-400/35 bg-rose-500/10 text-rose-300",
};

export function ProviderBadge({ provider }: { provider: string }) {
  const key = provider.toLowerCase();
  const theme =
    providerTheme[key] || "border-border/70 bg-card/70 text-foreground/85";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-[0.04em]",
        theme
      )}
    >
      {provider}
    </span>
  );
}
