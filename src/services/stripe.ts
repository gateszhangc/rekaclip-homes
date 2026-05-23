import Stripe from "stripe";
import { updateOrder, updateSubOrder } from "./order";
import {
  minorToMajorCurrencyUnits,
  trackChargeback,
  trackPurchase,
  trackRefund,
} from "@/lib/ga4-server";
import { createLogger } from "@/lib/logger";

const log = createLogger("services/stripe");

const asNonEmptyString = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const computeSubTimesFromInvoice = ({
  invoice,
  subscription,
}: {
  invoice: Stripe.Invoice;
  subscription: Stripe.Subscription;
}): number | null => {
  const anchor = subscription.billing_cycle_anchor;
  if (!anchor || !invoice.lines?.data?.length) {
    return null;
  }

  const lineWithPeriod = invoice.lines.data.find(
    (line) => typeof line.period?.start === "number" && typeof line.period?.end === "number"
  );
  const line = lineWithPeriod || invoice.lines.data[0];
  const start = line.period?.start;
  const end = line.period?.end;
  if (typeof start !== "number" || typeof end !== "number" || end <= start) {
    return null;
  }

  const duration = end - start;
  const times = Math.round((start - anchor) / duration) + 1;
  return Number.isFinite(times) && times >= 1 ? times : null;
};

const resolveStripeMetadataForCharge = async (
  stripe: Stripe,
  charge: Stripe.Charge
): Promise<Stripe.Metadata | null> => {
  if (charge.metadata && Object.keys(charge.metadata).length > 0) {
    return charge.metadata;
  }

  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : null;
  if (paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent?.metadata && Object.keys(paymentIntent.metadata).length > 0) {
        return paymentIntent.metadata;
      }
    } catch (err) {
      log.debug({ err, paymentIntentId }, "stripe refund lookup: payment_intent retrieve failed");
    }

    try {
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: paymentIntentId,
        limit: 1,
      });
      const session = sessions.data[0];
      if (session?.metadata && Object.keys(session.metadata).length > 0) {
        return session.metadata;
      }
    } catch (err) {
      log.debug({ err, paymentIntentId }, "stripe refund lookup: checkout session list failed");
    }
  }

  const invoiceId = typeof charge.invoice === "string" ? charge.invoice : null;
  if (invoiceId) {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      const subscriptionId =
        typeof invoice.subscription === "string" ? invoice.subscription : null;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription?.metadata && Object.keys(subscription.metadata).length > 0) {
          return subscription.metadata;
        }

        const sessions = await stripe.checkout.sessions.list({
          subscription: subscriptionId,
          limit: 1,
        });
        const session = sessions.data[0];
        if (session?.metadata && Object.keys(session.metadata).length > 0) {
          return session.metadata;
        }
      }
    } catch (err) {
      log.debug({ err, invoiceId }, "stripe refund lookup: invoice/subscription retrieve failed");
    }
  }

  return null;
};

export async function handleChargeRefunded(stripe: Stripe, charge: Stripe.Charge) {
  // Stripe sends the full (cumulative) amount_refunded on the charge. Prefer the latest refund
  // object amount to avoid double-counting when multiple partial refunds happen.
  const latestRefundAmountMinor = (() => {
    const refunds = (charge as any)?.refunds?.data;
    if (!Array.isArray(refunds) || refunds.length === 0) {
      return null;
    }

    const latest = refunds.reduce((acc: any, cur: any) => {
      if (!acc) return cur;
      const accCreated = typeof acc.created === "number" ? acc.created : 0;
      const curCreated = typeof cur.created === "number" ? cur.created : 0;
      return curCreated >= accCreated ? cur : acc;
    }, null);

    return typeof latest?.amount === "number" ? latest.amount : null;
  })();

  const amountMinor =
    typeof latestRefundAmountMinor === "number"
      ? latestRefundAmountMinor
      : typeof charge.amount_refunded === "number"
      ? charge.amount_refunded
      : 0;
  if (!amountMinor || amountMinor <= 0) {
    return;
  }

  const currency = charge.currency || "";
  const metadata = await resolveStripeMetadataForCharge(stripe, charge);
  const orderNo = asNonEmptyString(metadata?.order_no);
  const clientId = asNonEmptyString(metadata?.ga_client_id);

  if (!orderNo) {
    log.debug({ chargeId: charge.id }, "ga4 refund skipped: missing order_no");
    return;
  }
  if (!clientId) {
    log.debug({ orderNo, chargeId: charge.id }, "ga4 refund skipped: missing ga_client_id");
    return;
  }

  const sessionId = toInt(metadata?.ga_session_id) ?? undefined;
  const sessionNumber = toInt(metadata?.ga_session_number) ?? undefined;

  const productId = asNonEmptyString(metadata?.product_id) || "";
  const productName = asNonEmptyString(metadata?.product_name) || "";

  let transactionId = orderNo;
  const invoiceId = typeof charge.invoice === "string" ? charge.invoice : null;
  if (invoiceId) {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      const subscriptionId =
        typeof invoice.subscription === "string" ? invoice.subscription : null;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const subTimes = computeSubTimesFromInvoice({ invoice, subscription });
        if (subTimes && subTimes > 1) {
          transactionId = `${orderNo}_${subTimes}`;
        }
      }
    } catch (err) {
      log.debug({ err, orderNo, invoiceId }, "stripe refund lookup: sub_times compute failed");
    }
  }

  await trackRefund({
    clientId,
    sessionId,
    sessionNumber,
    transactionId,
    value: minorToMajorCurrencyUnits(amountMinor, currency),
    currency,
    items: productId
      ? [
          {
            item_id: productId,
            item_name: productName,
            quantity: 1,
          },
        ]
      : undefined,
  });
}

export async function handleDisputeCreated(stripe: Stripe, dispute: Stripe.Dispute) {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : null;
  if (!chargeId) {
    return;
  }

  const currency = dispute.currency || "";
  const amountMinor = typeof dispute.amount === "number" ? dispute.amount : 0;

  const charge = await stripe.charges.retrieve(chargeId);
  const metadata = await resolveStripeMetadataForCharge(stripe, charge);

  const orderNo = asNonEmptyString(metadata?.order_no);
  const clientId = asNonEmptyString(metadata?.ga_client_id);

  if (!clientId) {
    log.debug({ disputeId: dispute.id, chargeId }, "ga4 chargeback skipped: missing ga_client_id");
    return;
  }

  const sessionId = toInt(metadata?.ga_session_id) ?? undefined;
  const sessionNumber = toInt(metadata?.ga_session_number) ?? undefined;

  await trackChargeback({
    clientId,
    sessionId,
    sessionNumber,
    transactionId: orderNo || undefined,
    value: minorToMajorCurrencyUnits(amountMinor, currency),
    currency,
    reason: dispute.reason || undefined,
  });
}

const toInt = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

// handle checkout session completed
export async function handleCheckoutSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  try {
    // not handle unpaid session
    if (session.payment_status !== "paid") {
      throw new Error("not handle unpaid session");
    }

    // get session metadata
    const metadata = session.metadata;
    if (!metadata || !metadata.order_no) {
      throw new Error("no metadata in session");
    }

    const subId = session.subscription as string;
    if (subId) {
      // handle subscription
      const subscription = await stripe.subscriptions.retrieve(subId);

      // update subscription metadata
      await stripe.subscriptions.update(subId, {
        metadata: metadata,
      });

      const item = subscription.items.data[0];

      metadata["sub_id"] = subId;
      metadata["sub_times"] = "1";
      metadata["sub_interval"] = item.plan.interval;
      metadata["sub_interval_count"] = item.plan.interval_count.toString();
      metadata["sub_cycle_anchor"] =
        subscription.billing_cycle_anchor.toString();
      metadata["sub_period_start"] =
        subscription.current_period_start.toString();
      metadata["sub_period_end"] = subscription.current_period_end.toString();

      // update subscription first time paid order
      const didUpdate = await updateSubOrder({
        order_no: metadata.order_no,
        user_email: metadata.user_email,
        sub_id: subId,
        sub_interval_count: Number(metadata.sub_interval_count),
        sub_cycle_anchor: Number(metadata.sub_cycle_anchor),
        sub_period_end: Number(metadata.sub_period_end),
        sub_period_start: Number(metadata.sub_period_start),
        sub_times: Number(metadata.sub_times),
        paid_detail: JSON.stringify(session),
      });

      if (didUpdate) {
        const clientId = metadata["ga_client_id"];
        const currency = session.currency || "";
        const amountMinor = typeof session.amount_total === "number" ? session.amount_total : null;

        if (!clientId) {
          log.debug({ order_no: metadata.order_no }, "ga4 purchase skipped: missing ga_client_id");
          return;
        }

        if (!currency || typeof amountMinor !== "number") {
          log.warn({ order_no: metadata.order_no }, "ga4 purchase skipped: missing amount/currency");
          return;
        }

        await trackPurchase({
          clientId,
          sessionId: toInt(metadata["ga_session_id"]) ?? undefined,
          sessionNumber: toInt(metadata["ga_session_number"]) ?? undefined,
          transactionId: metadata.order_no,
          value: minorToMajorCurrencyUnits(amountMinor, currency),
          currency,
          items: [
            {
              item_id: metadata["product_id"] || "",
              item_name: metadata["product_name"] || "",
              quantity: 1,
            },
          ],
          purchaseType: "subscription_initial",
          subTimes: 1,
        });
      }

      return;
    }

    // update one-time payment order
    const order_no = metadata.order_no;
    const paid_email =
      session.customer_details?.email || session.customer_email || "";
    const paid_detail = JSON.stringify(session);

    const didUpdate = await updateOrder({ order_no, paid_email, paid_detail });

    if (didUpdate) {
      const clientId = metadata["ga_client_id"];
      const currency = session.currency || "";
      const amountMinor = typeof session.amount_total === "number" ? session.amount_total : null;

      if (!clientId) {
        log.debug({ order_no }, "ga4 purchase skipped: missing ga_client_id");
        return;
      }

      if (!currency || typeof amountMinor !== "number") {
        log.warn({ order_no }, "ga4 purchase skipped: missing amount/currency");
        return;
      }

      await trackPurchase({
        clientId,
        sessionId: toInt(metadata["ga_session_id"]) ?? undefined,
        sessionNumber: toInt(metadata["ga_session_number"]) ?? undefined,
        transactionId: order_no,
        value: minorToMajorCurrencyUnits(amountMinor, currency),
        currency,
        items: [
          {
            item_id: metadata["product_id"] || "",
            item_name: metadata["product_name"] || "",
            quantity: 1,
          },
        ],
        purchaseType: "one_time",
        subTimes: 1,
      });
    }
  } catch (e) {
    console.log("handle session completed failed: ", e);
    throw e;
  }
}

// handle invoice payment succeeded
export async function handleInvoice(stripe: Stripe, invoice: Stripe.Invoice) {
  try {
    // not handle unpaid invoice
    if (invoice.status !== "paid") {
      throw new Error("not handle unpaid invoice");
    }

    const subId = invoice.subscription as string;
    // not handle none-subscription payment
    if (!subId) {
      throw new Error("not handle none-subscription payment");
    }

    // not handle first subscription, because it's be handled in session completed event
    if (invoice.billing_reason === "subscription_create") {
      return;
    }

    // get subscription
    const subscription = await stripe.subscriptions.retrieve(subId);

    let metadata = subscription.metadata;

    if (!metadata || !metadata.order_no) {
      // get subscription session metadata
      const checkoutSessions = await stripe.checkout.sessions.list({
        subscription: subId,
      });

      if (checkoutSessions.data.length > 0) {
        const session = checkoutSessions.data[0];
        if (session.metadata) {
          metadata = session.metadata;
          await stripe.subscriptions.update(subId, {
            metadata: metadata,
          });
        }
      }
    }

    if (!metadata || !metadata.order_no) {
      throw new Error("no metadata in subscription");
    }

    // get subscription item
    const item = subscription.items.data[0];

    const anchor = subscription.billing_cycle_anchor;
    const start = subscription.current_period_start;
    const end = subscription.current_period_end;

    const periodDuration = end - start;
    const subTimes = Math.round((start - anchor) / periodDuration) + 1;

    metadata["sub_id"] = subId;
    metadata["sub_times"] = subTimes.toString();
    metadata["sub_interval"] = item.plan.interval;
    metadata["sub_interval_count"] = item.plan.interval_count.toString();
    metadata["sub_cycle_anchor"] = subscription.billing_cycle_anchor.toString();
    metadata["sub_period_start"] = subscription.current_period_start.toString();
    metadata["sub_period_end"] = subscription.current_period_end.toString();

    // create renew order
    const didUpdate = await updateSubOrder({
      order_no: metadata.order_no,
      user_email: metadata.user_email,
      sub_id: subId,
      sub_interval_count: Number(metadata.sub_interval_count),
      sub_cycle_anchor: Number(metadata.sub_cycle_anchor),
      sub_period_end: Number(metadata.sub_period_end),
      sub_period_start: Number(metadata.sub_period_start),
      sub_times: Number(metadata.sub_times),
      paid_detail: JSON.stringify(invoice),
    });

    if (didUpdate) {
      const clientId = metadata["ga_client_id"];
      const currency = invoice.currency || "";
      const amountMinor = typeof invoice.amount_paid === "number" ? invoice.amount_paid : null;

      if (!clientId) {
        log.debug({ order_no: metadata.order_no }, "ga4 purchase skipped: missing ga_client_id");
        return;
      }

      if (!currency || typeof amountMinor !== "number") {
        log.warn({ order_no: metadata.order_no }, "ga4 purchase skipped: missing amount/currency");
        return;
      }

      const transactionId = `${metadata.order_no}_${subTimes}`;
      await trackPurchase({
        clientId,
        sessionId: toInt(metadata["ga_session_id"]) ?? undefined,
        sessionNumber: toInt(metadata["ga_session_number"]) ?? undefined,
        transactionId,
        value: minorToMajorCurrencyUnits(amountMinor, currency),
        currency,
        items: [
          {
            item_id: metadata["product_id"] || "",
            item_name: metadata["product_name"] || "",
            quantity: 1,
          },
        ],
        purchaseType: "subscription_renewal",
        subTimes,
      });
    }
  } catch (e) {
    console.log("handle payment succeeded failed: ", e);
    throw e;
  }
}
