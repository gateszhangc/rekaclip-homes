import Link from "next/link";
import moment from "moment";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ExternalLink, ReceiptText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getManualPaymentRequestsByUserUuid } from "@/models/manual-payment";
import { getOrdersByPaidEmail, getOrdersByUserUuid } from "@/models/order";
import { isAuthEnabled } from "@/lib/auth";
import { getStripeBilling } from "@/services/order";
import { getUserEmail, getUserUuid } from "@/services/auth_user";

type CombinedOrder = {
  amount: number;
  billingUrl: string | null;
  currency: string;
  interval: string | null;
  order_no: string;
  paid_at: string | Date | null;
  paid_detail?: string | null;
  paid_email: string;
  product_name: string;
  stripe_session_id?: string | null;
  sub_id?: string | null;
  _status: string;
  _type: "manual" | "order";
};

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

const formatAmount = (amount: number, currency: string, locale: string) => {
  const normalizedCurrency = (currency || "USD").toUpperCase();
  const divisor = ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency.toLowerCase())
    ? 1
    : 100;
  const value = amount / divisor;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: divisor === 1 ? 0 : 2,
    }).format(value);
  } catch {
    const symbol = normalizedCurrency === "CNY" ? "¥" : "$";
    return `${symbol}${value}`;
  }
};

const formatPaidAt = (value: CombinedOrder["paid_at"]) => {
  if (!value) {
    return "—";
  }

  const date = moment(value);
  if (!date.isValid()) {
    return "—";
  }

  return date.format("YYYY-MM-DD HH:mm:ss");
};

const getStatusMeta = (item: CombinedOrder, isChinese: boolean) => {
  if (item._type !== "manual") {
    return {
      label: isChinese ? "已完成" : "Completed",
      className:
        "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    };
  }

  switch (item._status) {
    case "approved":
      return {
        label: isChinese ? "已完成" : "Completed",
        className:
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
      };
    case "rejected":
      return {
        label: isChinese ? "已拒绝" : "Rejected",
        className: "border-red-500/25 bg-red-500/10 text-red-300",
      };
    case "pending":
    default:
      return {
        label: isChinese ? "待付款确认" : "Awaiting confirmation",
        className:
          "border-amber-500/25 bg-amber-500/10 text-amber-200",
      };
  }
};

const getIntervalLabel = (
  interval: string | null | undefined,
  t: Awaited<ReturnType<typeof getTranslations>>
) => {
  if (interval === "month") {
    return t("my_orders.table.interval_month");
  }

  if (interval === "year") {
    return t("my_orders.table.interval_year");
  }

  return t("my_orders.table.interval_one_time");
};

const getSubscriptionId = (item: Pick<CombinedOrder, "sub_id" | "paid_detail">) => {
  if (item.sub_id) {
    return item.sub_id;
  }

  if (!item.paid_detail) {
    return "";
  }

  try {
    const paidDetail = JSON.parse(item.paid_detail);
    return paidDetail.subscription || "";
  } catch {
    return "";
  }
};

export default async function MyOrdersPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const isChinese = locale.toLowerCase().startsWith("zh");

  const userUuid = await getUserUuid();
  const userEmail = await getUserEmail();
  const authEnabled = isAuthEnabled();

  const callbackUrl = process.env.NEXT_PUBLIC_WEB_URL
    ? `${process.env.NEXT_PUBLIC_WEB_URL}/my-orders`
    : "/my-orders";

  if (!userUuid && authEnabled) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  let orders: any[] = [];
  let manualRequests: any[] = [];

  if (userUuid) {
    const userOrders = await getOrdersByUserUuid(userUuid);
    orders = userOrders || [];

    if (orders.length === 0) {
      const paidOrders = await getOrdersByPaidEmail(userEmail);
      orders = paidOrders || [];
    }

    const requests = await getManualPaymentRequestsByUserUuid(userUuid);
    manualRequests = requests || [];
  }

  const combinedOrders = await Promise.all(
    [
      ...orders.map(
        (order): Omit<CombinedOrder, "billingUrl"> => ({
          ...order,
          paid_email: order.paid_email || userEmail || "",
          _type: "order",
          _status: order.status || "approved",
        })
      ),
      ...manualRequests.map(
        (request): Omit<CombinedOrder, "billingUrl"> => ({
          amount: request.amount,
          currency: "CNY",
          interval: request.interval || "one-time",
          order_no: request.order_no,
          paid_at: request.paid_at || request.created_at,
          paid_detail: null,
          paid_email: request.user_email || userEmail || "",
          product_name: request.product_name,
          stripe_session_id: null,
          sub_id: null,
          _status: request.status || "pending",
          _type: "manual",
        })
      ),
    ].map(async (item) => {
      if (item._type === "manual") {
        return { ...item, billingUrl: null };
      }

      if (
        !item.stripe_session_id ||
        !item.stripe_session_id.startsWith("cs_")
      ) {
        return { ...item, billingUrl: null };
      }

      const subscriptionId = getSubscriptionId(item);
      if (!subscriptionId) {
        return { ...item, billingUrl: null };
      }

      try {
        const billing = await getStripeBilling(subscriptionId);
        return { ...item, billingUrl: billing.url || null };
      } catch {
        return { ...item, billingUrl: null };
      }
    })
  );

  combinedOrders.sort((left, right) => {
    const leftTime = left.paid_at ? new Date(left.paid_at).getTime() : 0;
    const rightTime = right.paid_at ? new Date(right.paid_at).getTime() : 0;
    return rightTime - leftTime;
  });

  return (
    <section className="space-y-6" data-testid="my-orders-page">
      <div className="space-y-2">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          {t("my_orders.title")}
        </h1>
      </div>

      <div
        className="rounded-[24px] border border-border/70 bg-card/80 p-3 shadow-[0_18px_50px_rgba(15,15,25,0.24)] backdrop-blur-xl sm:p-4"
        data-testid="orders-panel"
      >
        <div
          className="rounded-[16px] border border-border/70 bg-background/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
          data-testid="orders-table-shell"
        >
          {combinedOrders.length > 0 ? (
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("my_orders.table.order_no")}
                  </TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("my_orders.table.email")}
                  </TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("my_orders.table.product_name")}
                  </TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("my_orders.table.amount")}
                  </TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("my_orders.table.interval")}
                  </TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("my_orders.table.status")}
                  </TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("my_orders.table.paid_at")}
                  </TableHead>
                  <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("my_orders.table.manage_billing")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedOrders.map((item) => {
                  const status = getStatusMeta(item, isChinese);

                  return (
                    <TableRow
                      key={`${item._type}-${item.order_no}`}
                      className="border-border/50 hover:bg-background/35"
                    >
                      <TableCell className="px-4 py-4 align-top">
                        <span className="font-mono text-sm text-foreground">
                          {item.order_no}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-4 align-top text-sm text-foreground/86">
                        {item.paid_email || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-top">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {item.product_name}
                          </p>
                          {item._type === "manual" ? (
                            <p className="text-xs text-muted-foreground">
                              {isChinese
                                ? "手动支付订单"
                                : "Manual payment order"}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4 align-top text-sm font-medium text-foreground">
                        {formatAmount(item.amount, item.currency, locale)}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-top">
                        <Badge
                          variant="outline"
                          className="rounded-full border-border/70 bg-background/55 px-3 py-1 text-xs text-foreground/86"
                        >
                          {getIntervalLabel(item.interval, t)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-4 align-top">
                        <Badge
                          variant="outline"
                          className={`rounded-full px-3 py-1 text-xs ${status.className}`}
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-4 align-top text-sm text-foreground/86">
                        {formatPaidAt(item.paid_at)}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-top">
                        {item.billingUrl ? (
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-9 rounded-xl border border-border/60 bg-background/30 px-3 text-foreground/86 hover:bg-accent/60 hover:text-foreground"
                          >
                            <Link href={item.billingUrl} target="_blank">
                              {t("my_orders.table.manage_billing")}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div
              className="flex min-h-64 flex-col items-center justify-center gap-4 px-6 py-16 text-center"
              data-testid="orders-empty-state"
            >
              <div className="grid h-14 w-14 place-items-center rounded-full border border-border/70 bg-background/55 text-foreground/80">
                <ReceiptText className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="font-serif text-2xl font-semibold tracking-tight text-foreground">
                  {t("my_orders.no_orders")}
                </p>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  {isChinese
                    ? "购买后，订单记录会显示在这里。"
                    : "Your paid orders and billing history will appear here."}
                </p>
              </div>
              <Button
                asChild
                className="landing-hero-button h-10 rounded-xl px-5"
              >
                <Link href="/pricing">{t("user.pricing")}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
