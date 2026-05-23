import { updateCreditForOrder } from "./credit";
import {
  findOrderByOrderNo,
  insertOrder,
  OrderStatus,
  updateOrderStatus,
  updateOrderSubscription,
} from "@/models/order";
import { getIsoTimestr } from "@/lib/time";

import { updateAffiliateForOrder } from "./affiliate";
import { Order } from "@/types/order";
import Stripe from "stripe";
import { orders } from "@/db/schema";
import { minorToMajorCurrencyUnits, trackPurchase } from "@/lib/ga4-server";
import { createLogger } from "@/lib/logger";

const log = createLogger("services/order");

const safeJsonParse = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const asString = (value: unknown) => (typeof value === "string" ? value : null);

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

// update paied order, call by async callback
export async function updateOrder({
  order_no,
  paid_email,
  paid_detail,
}: {
  order_no: string;
  paid_email: string;
  paid_detail: string;
}): Promise<boolean> {
  try {
    if (!order_no || !paid_email || !paid_detail) {
      throw new Error("invalid params");
    }

    // query order
    const order = await findOrderByOrderNo(order_no);
    if (!order) {
      throw new Error("invalid order");
    }

    // order already paied
    if (order.status === OrderStatus.Paid) {
      return false;
    }

    // only update order status from created to paid
    if (order.status !== OrderStatus.Created) {
      throw new Error("invalid order status");
    }

    const paid_at = getIsoTimestr();
    await updateOrderStatus(
      order_no,
      OrderStatus.Paid,
      paid_at,
      paid_email,
      paid_detail
    );

    if (order.user_uuid) {
      if (order.credits > 0) {
        // increase credits for paied order
        await updateCreditForOrder(order as unknown as Order);
      }

      // update affiliate for paied order
      await updateAffiliateForOrder(order as unknown as Order);
    }

    // Creem (and other providers) purchase tracking should be sent from the "created -> paid"
    // transition to avoid duplicates. Stripe purchase is tracked in src/services/stripe.ts.
    const parsed = safeJsonParse(paid_detail);
    const isStripeCheckoutSession = parsed?.object === "checkout.session";
    if (!isStripeCheckoutSession) {
      const metadata = parsed?.metadata;
      const clientId = asString(metadata?.ga_client_id);

      if (!clientId) {
        log.debug({ order_no }, "ga4 purchase skipped: missing ga_client_id");
        return true;
      }

      const sessionId = toInt(metadata?.ga_session_id) ?? undefined;
      const sessionNumber = toInt(metadata?.ga_session_number) ?? undefined;

      const payloadCurrency = asString(parsed?.order?.currency);
      const currency = (payloadCurrency || order.currency || "").toUpperCase();

      const payloadAmountPaid = parsed?.order?.amountPaid;
      const payloadAmount = parsed?.order?.amount;
      const amountMinor =
        typeof payloadAmountPaid === "number"
          ? payloadAmountPaid
          : typeof payloadAmount === "number"
          ? payloadAmount
          : order.amount;

      const value = minorToMajorCurrencyUnits(amountMinor, currency);

      const productId = asString(metadata?.product_id) || order.product_id || "";
      const itemName = asString(metadata?.product_name) || order.product_name || "";
      const interval = asString(metadata?.interval) || order.interval || "";

      await trackPurchase({
        clientId,
        sessionId,
        sessionNumber,
        transactionId: order_no,
        value,
        currency,
        items: [
          {
            item_id: productId,
            item_name: itemName,
            quantity: 1,
          },
        ],
        purchaseType: interval === "one-time" ? "one_time" : "subscription_initial",
        subTimes: 1,
      });
    }

    return true;
  } catch (e) {
    console.log("update order failed: ", e);
    throw e;
  }
}

// update subscription order, call by async notify
export async function updateSubOrder({
  order_no,
  user_email,
  sub_id,
  sub_interval_count,
  sub_cycle_anchor,
  sub_period_end,
  sub_period_start,
  sub_times,
  paid_detail,
}: {
  order_no: string;
  user_email: string;
  sub_id: string;
  sub_interval_count: number;
  sub_cycle_anchor: number;
  sub_period_end: number;
  sub_period_start: number;
  sub_times: number;
  paid_detail: string;
}): Promise<boolean> {
  try {
    if (!order_no || !user_email || !paid_detail) {
      throw new Error("invalid params");
    }

    // not subscribe
    if (
      !sub_id ||
      !sub_interval_count ||
      !sub_cycle_anchor ||
      !sub_period_end ||
      !sub_period_start ||
      !sub_times
    ) {
      throw new Error("invalid subscription info");
    }

    const order = await findOrderByOrderNo(order_no);
    if (
      !order ||
      !order.amount ||
      !order.currency ||
      !order.stripe_session_id ||
      order.user_email !== user_email
    ) {
      throw new Error("invalid order");
    }

    // not subscription
    if (order.interval !== "year" && order.interval !== "month") {
      throw new Error("invalid subscription interval");
    }

    // subscribe first payment
    if (Number(sub_times) === 1) {
      // order paied
      if (order.status === OrderStatus.Paid) {
        return false;
      }

      // update order to be paied
      const paied_at = getIsoTimestr();
      await updateOrderSubscription(
        order_no,
        sub_id,
        sub_interval_count,
        sub_cycle_anchor,
        sub_period_end,
        sub_period_start,
        OrderStatus.Paid,
        paied_at,
        sub_times,
        user_email,
        paid_detail
      );

      if (order.user_uuid) {
        if (order.credits > 0) {
          // increase credits for paied order
          await updateCreditForOrder(order as unknown as Order);
        }

        // update affiliate for paied order
        await updateAffiliateForOrder(order as unknown as Order);
      }

      return true;
    }

    // subscribe renew
    if (Number(sub_times) > 1) {
      const renew_order_no = `${order.order_no}_${sub_times}`;

      const existing = await findOrderByOrderNo(renew_order_no);
      if (existing) {
        return false;
      }

      const currentDate = new Date();
      const created_at = currentDate.toISOString();

      let expired_at = "";

      if (order.interval === "year") {
        // subscription yearly
        const oneYearLater = currentDate;
        oneYearLater.setFullYear(currentDate.getFullYear() + 1);

        const oneYearLaterMillis = oneYearLater.getTime();
        const delayMillis = 24 * 60 * 60 * 1000; // delay 24 hours expired
        const newTimeMillis = oneYearLaterMillis + delayMillis;
        const newDate = new Date(newTimeMillis);

        expired_at = newDate.toISOString();
      } else {
        // subscription monthly
        const oneMonthLater = currentDate;
        oneMonthLater.setMonth(currentDate.getMonth() + 1);

        const oneMonthLaterMillis = oneMonthLater.getTime();
        const delayMillis = 24 * 60 * 60 * 1000; // delay 24 hours expired
        const newTimeMillis = oneMonthLaterMillis + delayMillis;
        const newDate = new Date(newTimeMillis);

        expired_at = newDate.toISOString();
      }

      const paid_at = getIsoTimestr();

      // create renew order
      const renew_order: Order = {
        order_no: renew_order_no,
        created_at: created_at,
        user_uuid: order.user_uuid,
        user_email: order.user_email,
        amount: order.amount,
        interval: order.interval,
        expired_at: expired_at,
        status: OrderStatus.Paid,
        credits: order.credits,
        currency: order.currency,
        sub_id: sub_id,
        sub_interval_count: sub_interval_count,
        sub_cycle_anchor: sub_cycle_anchor,
        sub_period_end: sub_period_end,
        sub_period_start: sub_period_start,
        sub_times: sub_times,
        stripe_session_id: order.stripe_session_id,
        paid_at: paid_at,
        paid_email: user_email,
        paid_detail: paid_detail,
        product_id: order.product_id || "",
        product_name: order.product_name || "",
        valid_months: order.valid_months || 0,
        order_detail: order.order_detail || "",
      };

      await insertOrder(renew_order as unknown as typeof orders.$inferInsert);

      if (renew_order.user_uuid) {
        if (renew_order.credits > 0) {
          // increase credits for paied order
          await updateCreditForOrder(renew_order as unknown as Order);
        }
      }

      return true;
    }

    return false;
  } catch (e) {
    console.log("renew order failed: ", e);
    throw e;
  }
}

// get stripe billing portal url
export async function getStripeBilling(sub_id: string) {
  try {
    const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY || "");

    const subscription = await stripe.subscriptions.retrieve(sub_id);

    const billing = await stripe.billingPortal.sessions.create({
      customer: subscription.customer as string,

      return_url: `${process.env.NEXT_PUBLIC_WEB_URL}/my-orders`,
    });

    return billing;
  } catch (e) {
    console.log("get subscription billing failed: ", e);
    throw e;
  }
}
