"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Loader2 } from "lucide-react";
import Header from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UnbindButton } from "@/components/admin/unbind-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { ProviderBadge } from "@/components/admin/provider-badge";
import { TierBadge } from "@/components/admin/tier-badge";
import { cn } from "@/lib/utils";

type Tier = "starter" | "pro";

interface Account {
  id: string;
  accountId: string;
  email?: string;
  provider: string;
  model?: string;
  thingLevel?: string;
  tier?: Tier;
  isBound: boolean;
  boundUserId?: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

interface TierStats {
  total: number;
  bound: number;
  available: number;
}

const normalizeTier = (value?: string): Tier => (value?.toLowerCase() === "pro" ? "pro" : "starter");

export default function AccountPoolPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/accounts");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch account pool");
      }
      const nextAccounts: Account[] = (data.accounts || []).map((account: Account) => ({
        ...account,
        tier: normalizeTier(account.tier),
      }));
      setAccounts(nextAccounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch account pool");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/accounts/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAccounts(accounts.filter((a) => a.id !== id));
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Delete failed");
      }
    } catch {
      alert("Delete failed");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const tierStats = useMemo(() => {
    const base: Record<Tier, TierStats> = {
      starter: { total: 0, bound: 0, available: 0 },
      pro: { total: 0, bound: 0, available: 0 },
    };

    for (const account of accounts) {
      const tier = normalizeTier(account.tier);
      base[tier].total += 1;
      if (account.isBound) {
        base[tier].bound += 1;
      } else if (account.isActive) {
        base[tier].available += 1;
      }
    }

    return base;
  }, [accounts]);

  return (
    <div className="flex flex-col gap-4">
      <Header />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="relative isolate px-4 py-4 md:px-6 md:py-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(760px_260px_at_0%_0%,hsl(160_55%_45%_/_0.16),transparent_65%),radial-gradient(680px_240px_at_100%_0%,hsl(210_60%_50%_/_0.14),transparent_67%)]" />

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
              <div className="rounded-3xl border border-border/70 bg-card/85 p-6 shadow-[0_28px_80px_-58px_rgba(0,0,0,1)] backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Account Pool</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Manage API Key accounts for deployment.
                    </p>
                  </div>
                  <Link href="/admin/accounts/add">
                    <Button className="rounded-xl border border-border/70 bg-gradient-to-r from-muted via-muted/90 to-muted text-foreground shadow-[0_12px_26px_-18px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:border-primary/40 hover:from-muted/85 hover:to-muted/75">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Account
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <StatCard title="Starter Total" value={tierStats.starter.total} tone="starterTotal" />
                <StatCard title="Starter Bound" value={tierStats.starter.bound} tone="bound" />
                <StatCard title="Starter Available" value={tierStats.starter.available} tone="available" />
                <StatCard title="Pro Total" value={tierStats.pro.total} tone="proTotal" />
                <StatCard title="Pro Bound" value={tierStats.pro.bound} tone="bound" />
                <StatCard title="Pro Available" value={tierStats.pro.available} tone="available" />
              </div>

              <div className="rounded-3xl border border-border/70 bg-card/90 shadow-[0_28px_80px_-58px_rgba(0,0,0,1)] backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
                  <h2 className="font-semibold">Accounts</h2>
                  <span className="text-sm text-muted-foreground">{accounts.length} total</span>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : error ? (
                  <div className="px-6 py-12 text-center text-sm text-destructive">{error}</div>
                ) : accounts.length === 0 ? (
                  <div className="px-6 py-12 text-center text-muted-foreground">
                    <p>No accounts yet</p>
                    <p className="mt-1 text-sm">Click "Add Account" to import your first API Key account.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {accounts.map((account) => {
                      const tier = normalizeTier(account.tier);
                      return (
                        <div
                          key={account.id}
                          className="flex items-start justify-between gap-3 px-6 py-4 transition hover:bg-muted/30"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate font-medium">{account.accountId}</h3>
                              <TierBadge tier={tier} />
                              {account.email && (
                                <span className="hidden text-sm text-muted-foreground sm:inline">
                                  ({account.email})
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <ProviderBadge provider={account.provider} />
                              {account.model && <InlineTag>{account.model}</InlineTag>}
                              {account.thingLevel && <InlineTag>thing: {account.thingLevel}</InlineTag>}
                              <StatusBadge isBound={account.isBound} isActive={account.isActive} />
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {account.isBound && account.boundUserId && (
                                <span>User: {account.boundUserId.slice(0, 8)}...</span>
                              )}
                              <span>Imported: {formatDate(account.createdAt)}</span>
                              {account.lastUsedAt && (
                                <span>Last used: {formatDate(account.lastUsedAt)}</span>
                              )}
                            </div>
                          </div>

                          <div className="ml-2 flex shrink-0 items-center gap-2">
                            {account.isBound && (
                              <UnbindButton
                                accountId={account.id}
                                accountName={account.accountId}
                                boundUserId={account.boundUserId}
                                onSuccess={fetchData}
                              />
                            )}
                            {!account.isBound && (
                              <DeleteConfirmButton onDelete={() => handleDelete(account.id)} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "starterTotal" | "proTotal" | "bound" | "available";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card/85 p-5 shadow-[0_22px_60px_-54px_rgba(0,0,0,1)] backdrop-blur-sm",
        tone === "starterTotal" && "border-slate-500/30 bg-slate-500/8",
        tone === "proTotal" && "border-amber-500/30 bg-amber-500/8",
        tone === "bound" && "border-blue-500/30 bg-blue-500/8",
        tone === "available" && "border-green-500/30 bg-green-500/8"
      )}
    >
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{title}</div>
    </div>
  );
}

function InlineTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/70 bg-card/70 px-2.5 py-0.5 text-xs text-foreground/80">
      {children}
    </span>
  );
}

function DeleteConfirmButton({ onDelete }: { onDelete: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this account? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
