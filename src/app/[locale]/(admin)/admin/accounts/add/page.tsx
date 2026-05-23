"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import Header from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const providers = [
  { value: "kie", label: "Kie" },
  { value: "openai", label: "OpenAI" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
] as const;

const modelPresets: Record<string, string[]> = {
  kie: [
    "kie-gpt/gpt-5-4",
    "kie-claude/claude-opus-4-6",
    "kie-gemini/gemini-3.1-pro",
  ],
  openai: ["gpt-5-4", "gpt-4o", "openai/gpt-5.4", "openai/gpt-4o"],
  openrouter: [
    "openrouter/openai/gpt-5.4",
    "openrouter/openai/gpt-4o",
    "openrouter/anthropic/claude-opus-4.6",
    "openrouter/anthropic/claude-sonnet-4.5",
    "openrouter/google/gemini-3.1-pro-preview",
    "openrouter/google/gemini-3-flash-preview",
  ],
  anthropic: [
    "claude-opus-4-6",
    "claude-opus-4-5",
    "anthropic/claude-opus-4-6",
    "anthropic/claude-opus-4-5",
  ],
  google: [
    "gemini-3-flash",
    "google/gemini-3-flash-preview",
  ],
};

type Provider = (typeof providers)[number]["value"];
type Tier = "starter" | "pro";

const tiers = [
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
] as const;

type AccountImportInput = {
  accountId: string;
  email?: string;
  apiKey: string;
  provider: Provider;
  model?: string;
  thingLevel?: string;
  tier: Tier;
};

const normalizeTier = (value: unknown): Tier =>
  typeof value === "string" && value.toLowerCase() === "pro" ? "pro" : "starter";

const primaryButtonClassName =
  "h-10 rounded-xl border border-border/70 bg-gradient-to-r from-muted via-muted/90 to-muted px-5 text-foreground shadow-[0_12px_26px_-18px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:border-primary/40 hover:from-muted/85 hover:to-muted/75";

const secondaryButtonClassName =
  "h-10 rounded-xl border border-border/70 bg-card/70 px-5 text-foreground transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card";

export default function AddAccountPage() {
  const router = useRouter();
  const [form, setForm] = useState<AccountImportInput>({
    accountId: "",
    email: "",
    apiKey: "",
    provider: "openai",
    model: "",
    thingLevel: "",
    tier: "starter",
  });
  const [batchJson, setBatchJson] = useState("");
  const [isSingleSubmitting, setIsSingleSubmitting] = useState(false);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const modelSuggestions = useMemo(() => {
    return modelPresets[form.provider] || [];
  }, [form.provider]);
  const providerHint =
    form.provider === "kie"
      ? "Kie presets are only for explicit Kie routing. Homepage deploys default to OpenRouter."
      : form.provider === "google"
        ? "Google presets here are for Gemini Flash. Gemini 3.1 Pro defaults to OpenRouter on the homepage."
        : form.provider === "openrouter"
          ? "Homepage defaults to OpenRouter for GPT-5.4, Claude Opus 4.6, and Gemini 3.1 Pro."
          : form.provider === "anthropic"
            ? "Use explicit Anthropic model IDs if you want to keep direct Anthropic routing."
            : null;

  const fetchWithTimeout = async (
    input: RequestInfo | URL,
    init?: RequestInit,
    timeoutMs = 12000
  ) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  const handleSingleImport = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.accountId.trim() || !form.apiKey.trim()) {
      setError("Account ID and API Key are required.");
      return;
    }

    setIsSingleSubmitting(true);
    try {
      const payload = {
        accountId: form.accountId.trim(),
        email: form.email?.trim() || undefined,
        apiKey: form.apiKey.trim(),
        provider: form.provider,
        model: form.model?.trim() || undefined,
        thingLevel: form.thingLevel?.trim() || undefined,
        tier: form.tier,
      };

      const res = await fetchWithTimeout("/api/admin/accounts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Import failed");
      }

      setSuccess(`Account ${payload.accountId} imported successfully.`);
      setTimeout(() => router.push("/admin/accounts"), 900);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Import timeout: backend did not respond in time. Please check backend service (port 5000).");
      } else {
        setError(err instanceof Error ? err.message : "Import failed");
      }
    } finally {
      setIsSingleSubmitting(false);
    }
  };

  const handleBatchImport = async () => {
    setError("");
    setSuccess("");

    if (!batchJson.trim()) {
      setError("Please paste batch JSON first.");
      return;
    }

    let accounts: AccountImportInput[] = [];
    try {
      const parsed = JSON.parse(batchJson);
      if (Array.isArray(parsed)) {
        accounts = parsed.map((account: Partial<AccountImportInput>) => ({
          ...account,
          tier: normalizeTier(account.tier),
        })) as AccountImportInput[];
      } else if (parsed && Array.isArray(parsed.accounts)) {
        accounts = parsed.accounts.map((account: Partial<AccountImportInput>) => ({
          ...account,
          tier: normalizeTier(account.tier),
        })) as AccountImportInput[];
      } else {
        throw new Error("Batch JSON must be an array or { \"accounts\": [...] }.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid batch JSON");
      return;
    }

    setIsBatchSubmitting(true);
    try {
      const res = await fetchWithTimeout("/api/admin/accounts/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Batch import failed");
      }

      const successCount = data?.results?.success?.length ?? 0;
      const failedCount = data?.results?.failed?.length ?? 0;
      setSuccess(`Batch import completed: ${successCount} success, ${failedCount} failed.`);
      if (successCount > 0) {
        setTimeout(() => router.push("/admin/accounts"), 1200);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Batch import timeout: backend did not respond in time. Please check backend service (port 5000).");
      } else {
        setError(err instanceof Error ? err.message : "Batch import failed");
      }
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Header />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="relative isolate px-4 py-4 md:px-6 md:py-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(820px_280px_at_0%_0%,hsl(205_60%_52%_/_0.16),transparent_65%),radial-gradient(760px_280px_at_100%_0%,hsl(155_52%_45%_/_0.14),transparent_68%)]" />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
              <Link
                href="/admin/accounts"
                className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-card/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Account Pool
              </Link>

              <div className="rounded-3xl border border-border/70 bg-card/85 p-6 shadow-[0_28px_80px_-58px_rgba(0,0,0,1)] backdrop-blur-sm md:p-7">
                <p className="inline-flex w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-primary">
                  API Key Mode
                </p>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Add Account</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                  Import one account or batch import multiple API Key accounts.
                </p>
              </div>

              <form
                onSubmit={handleSingleImport}
                className="rounded-3xl border border-border/70 bg-card/90 p-6 shadow-[0_24px_70px_-55px_rgba(0,0,0,1)] backdrop-blur-sm md:p-8"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Account ID" required>
                    <Input
                      required
                      value={form.accountId}
                      onChange={(e) => setForm((prev) => ({ ...prev, accountId: e.target.value }))}
                      placeholder="user-001"
                      className="h-11 rounded-2xl border-border/70 bg-background/45"
                    />
                  </Field>

                  <Field label="Email (optional)">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="user@example.com"
                      className="h-11 rounded-2xl border-border/70 bg-background/45"
                    />
                  </Field>

                  <Field label="API Key" required>
                    <Input
                      required
                      type="password"
                      value={form.apiKey}
                      onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="h-11 rounded-2xl border-border/70 bg-background/45"
                    />
                  </Field>

                  <Field label="Provider" required>
                    <Select
                      value={form.provider}
                      onValueChange={(value: Provider) =>
                        setForm((prev) => ({ ...prev, provider: value }))
                      }
                    >
                      <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background/45">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.value} value={provider.value}>
                            {provider.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Model (optional)">
                    <Input
                      list="model-presets"
                      value={form.model}
                      onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                      placeholder="kie-gpt/gpt-5-4"
                      className="h-11 rounded-2xl border-border/70 bg-background/45"
                    />
                    <datalist id="model-presets">
                      {modelSuggestions.map((model) => (
                        <option key={model} value={model} />
                      ))}
                    </datalist>
                    {providerHint ? (
                      <p className="text-xs text-muted-foreground">{providerHint}</p>
                    ) : null}
                  </Field>

                  <Field label="Thing Level (optional)">
                    <Input
                      value={form.thingLevel}
                      onChange={(e) => setForm((prev) => ({ ...prev, thingLevel: e.target.value }))}
                      placeholder="premium"
                      className="h-11 rounded-2xl border-border/70 bg-background/45"
                    />
                  </Field>

                  <Field label="Tier" required>
                    <Select
                      value={form.tier}
                      onValueChange={(value: Tier) => setForm((prev) => ({ ...prev, tier: value }))}
                    >
                      <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background/45">
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiers.map((tier) => (
                          <SelectItem key={tier.value} value={tier.value}>
                            {tier.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                  <Link href="/admin/accounts">
                    <Button type="button" variant="outline" className={secondaryButtonClassName}>
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isSingleSubmitting} className={primaryButtonClassName}>
                    {isSingleSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      "Import Account"
                    )}
                  </Button>
                </div>
              </form>

              <div className="rounded-3xl border border-border/70 bg-card/90 p-6 shadow-[0_24px_70px_-55px_rgba(0,0,0,1)] backdrop-blur-sm md:p-8">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold">Batch Import (JSON)</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Paste an array or an object with an <code>accounts</code> array.
                  </p>
                </div>

                <Textarea
                  value={batchJson}
                  onChange={(e) => setBatchJson(e.target.value)}
                  placeholder={`[
  {
    "accountId": "test-kie-001",
    "email": "test@example.com",
    "apiKey": "kie-api-key",
    "provider": "kie",
    "model": "kie-gpt/gpt-5-4",
    "thingLevel": "premium",
    "tier": "starter"
  }
]`}
                  className="min-h-[220px] rounded-2xl border-border/70 bg-background/45 font-mono text-sm"
                />

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    disabled={isBatchSubmitting}
                    onClick={handleBatchImport}
                    className={primaryButtonClassName}
                  >
                    {isBatchSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      "Run Batch Import"
                    )}
                  </Button>
                </div>
              </div>

              {(error || success) && (
                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    error
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-green-400/25 bg-green-500/10 text-green-300"
                  }`}
                >
                  <p className="flex items-center gap-2 font-medium">
                    {!error && <CheckCircle2 className="h-4 w-4" />}
                    {error || success}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground/90">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
