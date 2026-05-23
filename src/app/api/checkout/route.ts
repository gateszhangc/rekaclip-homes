import { getUserEmail, getUserUuid } from "@/services/auth_user";
import {
  insertOrder,
  OrderStatus,
  updateOrderSession,
} from "@/models/order";
import { respData, respErr } from "@/lib/resp";

import Stripe from "stripe";
import { findUserByUuid } from "@/models/user";
import { getSnowId } from "@/lib/hash";
import { getPricingPage } from "@/services/page";
import { PricingItem } from "@/types/blocks/pricing";
import { newStripeClient } from "@/integrations/stripe";
import { Order } from "@/types/order";
import { newCreemClient } from "@/integrations/creem";
import { createLogger } from "@/lib/logger";
import { cookies } from "next/headers";

const log = createLogger("api/checkout");

const parseGaClientId = (raw?: string | null) => {
  if (!raw) {
    return null;
  }

  const parts = raw.split(".").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  }

  return null;
};

const parseGaSessionCookie = (raw?: string | null) => {
  if (!raw) {
    return { sessionId: null, sessionNumber: null };
  }

  const parts = raw.split(".").filter(Boolean);
  if (parts.length >= 4) {
    return { sessionId: parts[2] ?? null, sessionNumber: parts[3] ?? null };
  }

  return { sessionId: null, sessionNumber: null };
};

const getGaCookieMetadata = async () => {
  const store = await cookies();

  const gaCookieRaw = store.get("_ga")?.value ?? null;
  const gaClientId = parseGaClientId(gaCookieRaw);

  const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim() || "";
  const suffix = measurementId.startsWith("G-") ? measurementId.slice(2) : "";
  const preferredSessionCookieName = suffix ? `_ga_${suffix}` : "";

  const allCookies = store.getAll();
  const fallbackSessionCookie =
    allCookies.find((cookie) => cookie.name.startsWith("_ga_") && cookie.value?.startsWith("GS1.")) ||
    null;

  const sessionCookieName = preferredSessionCookieName || fallbackSessionCookie?.name || "";
  const sessionCookieRaw =
    (preferredSessionCookieName ? store.get(preferredSessionCookieName)?.value : null) ||
    fallbackSessionCookie?.value ||
    null;

  const { sessionId, sessionNumber } = parseGaSessionCookie(sessionCookieRaw);

  const metadata: Record<string, string> = {};
  if (gaClientId) {
    metadata.ga_client_id = gaClientId;
  }
  if (sessionId) {
    metadata.ga_session_id = sessionId;
  }
  if (sessionNumber) {
    metadata.ga_session_number = sessionNumber;
  }
  if (gaCookieRaw) {
    metadata.ga_cookie_raw = gaCookieRaw;
  }
  if (sessionCookieRaw) {
    metadata.ga_session_cookie_raw = sessionCookieRaw;
  }
  if (sessionCookieName) {
    metadata.ga_session_cookie_name = sessionCookieName;
  }

  return metadata;
};

export async function POST(req: Request) {
  try {
    let { product_id, currency, locale } = await req.json();

    log.info({ product_id, currency, locale }, "checkout request received");

    let cancel_url = `${process.env.NEXT_PUBLIC_PAY_CANCEL_URL || process.env.NEXT_PUBLIC_WEB_URL
      }`;
    if (cancel_url && cancel_url.startsWith("/")) {
      // relative url
      cancel_url = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}${cancel_url}`;
    }

    if (!product_id) {
      return respErr("invalid params");
    }

    // validate checkout params
    const page = await getPricingPage(locale);
    if (!page || !page.pricing || !page.pricing.items) {
      return respErr("invalid pricing table");
    }

    const item = page.pricing.items.find(
      (item: PricingItem) => item.product_id === product_id
    );

    if (!item || !item.amount || !item.interval || !item.currency) {
      return respErr("invalid checkout params");
    }

    let { amount, interval, valid_months, credits, product_name } = item;

    if (!["year", "month", "one-time"].includes(interval)) {
      return respErr("invalid interval");
    }

    if (interval === "year" && valid_months !== 12) {
      return respErr("invalid valid_months");
    }

    if (interval === "month" && valid_months !== 1) {
      return respErr("invalid valid_months");
    }

    if (currency === "cny") {
      if (!item.cn_amount) {
        return respErr("invalid checkout params: cn_amount");
      }
      amount = item.cn_amount;
    } else {
      currency = item.currency;
    }

    const is_subscription = interval === "month" || interval === "year";

    // get signed user
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("no auth, please sign-in");
    }

    let user_email = await getUserEmail();
    if (!user_email) {
      const user = await findUserByUuid(user_uuid);
      if (user) {
        user_email = user.email;
      }
    }
    if (!user_email) {
      return respErr("invalid user");
    }

    // generate order_no
    const order_no = getSnowId();

    const currentDate = new Date();
    const created_at = currentDate.toISOString();

    // calculate expired_at
    let expired_at = "";
    if (valid_months && valid_months > 0) {
      const timePeriod = new Date(currentDate);
      timePeriod.setMonth(currentDate.getMonth() + valid_months);

      const timePeriodMillis = timePeriod.getTime();
      let delayTimeMillis = 0;

      // subscription
      if (is_subscription) {
        delayTimeMillis = 24 * 60 * 60 * 1000; // delay 24 hours expired
      }

      const newTimeMillis = timePeriodMillis + delayTimeMillis;
      const newDate = new Date(newTimeMillis);

      expired_at = newDate.toISOString();
    }

    // create order
    const order = {
      order_no: order_no,
      created_at: new Date(created_at),
      user_uuid: user_uuid,
      user_email: user_email,
      amount: amount,
      interval: interval,
      expired_at: expired_at ? new Date(expired_at) : null,
      status: OrderStatus.Created,
      credits: credits || 0,
      currency: currency,
      product_id: product_id,
      product_name: product_name,
      valid_months: valid_months,
    };
    await insertOrder(order);
    log.info({ order_no, product_id, provider: process.env.PAY_PROVIDER }, "order created");

    const ga_metadata = await getGaCookieMetadata();

    let provider = process.env.PAY_PROVIDER || "stripe";
    if (currency === "cny") {
      provider = "stripe";
    } else if (provider === "creem") {
      let products: Record<string, string> = {};
      const rawProducts = process.env.CREEM_PRODUCTS;
      if (rawProducts) {
        try {
          products =
            typeof rawProducts === "string" ? JSON.parse(rawProducts) : rawProducts;
        } catch (e) {
          log.warn({ err: e }, "creem products parse failed");
        }
      }
      if (!products[product_id]) {
        log.warn({ product_id }, "creem product mapping missing, falling back to stripe");
        provider = "stripe";
      }
    }

    if (provider === "creem") {
      // checkout with creem
      const result = await creemCheckout({
        order: order as any,
        locale,
        cancel_url,
        ga_metadata,
      });

      return respData(result);
    }

    // checkout with stripe
    const result = await stripeCheckout({
      order: order as any,
      locale,
      cancel_url,
      ga_metadata,
    });

    log.info(
      { order_no: order.order_no, session_id: result.session_id },
      "stripe checkout created"
    );

    return respData(result);
  } catch (e: any) {
    log.error({ err: e }, "checkout failed");
    return respErr("checkout failed: " + e.message);
  }
}

async function stripeCheckout({
  order,
  locale,
  cancel_url,
  ga_metadata,
}: {
  order: Order;
  locale: string;
  cancel_url: string;
  ga_metadata: Record<string, string>;
}) {
  const intervals = ["month", "year"];
  const is_subscription = intervals.includes(order.interval);

  const client = newStripeClient();

  let options: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: order.currency,
          product_data: {
            name: order.product_name || "",
          },
          unit_amount: order.amount,
          recurring: is_subscription
            ? {
              interval: order.interval as any,
            }
            : undefined,
        },
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    metadata: {
      project: process.env.NEXT_PUBLIC_PROJECT_NAME || "",
      product_id: order.product_id || "",
      product_name: order.product_name || "",
      order_no: order.order_no,
      user_email: order.user_email,
      credits: order.credits,
      user_uuid: order.user_uuid,
      interval: order.interval,
      ...ga_metadata,
    },
    mode: is_subscription ? "subscription" : "payment",
    success_url: `${process.env.NEXT_PUBLIC_WEB_URL}/api/pay/callback/stripe?locale=${locale}&session_id={CHECKOUT_SESSION_ID}&order_no=${order.order_no}`,
    cancel_url: cancel_url,
  };

  if (order.user_email) {
    options.customer_email = order.user_email;
  }

  if (order.interval === "month" || order.interval === "year") {
    options.subscription_data = {
      metadata: options.metadata,
    };
  } else {
    // Make refund/chargeback webhooks easier to map back to our order.
    options.payment_intent_data = {
      metadata: options.metadata,
    };
  }

  if (order.currency === "cny") {
    options.payment_method_types = ["wechat_pay", "alipay", "card"];
    options.payment_method_options = {
      wechat_pay: {
        client: "web",
      },
      alipay: {},
    };
  }

  const session = await client.stripe().checkout.sessions.create(options);

  // update order detail
  await updateOrderSession(order.order_no, session.id, JSON.stringify(options));

  return {
    order_no: order.order_no,
    session_id: session.id,
    checkout_url: session.url,
    provider: "stripe",
  };
}

async function creemCheckout({
  order,
  locale,
  cancel_url,
  ga_metadata,
}: {
  order: Order;
  locale: string;
  cancel_url: string;
  ga_metadata: Record<string, string>;
}) {
  const client = newCreemClient();

  let products = (process.env.CREEM_PRODUCTS as any) || {};
  if (typeof products === "string") {
    products = JSON.parse(products);
  }
  log.debug({ products }, "creem products loaded");
  log.debug({ order }, "creating creem checkout for order");

  const product_id = products[order.product_id || ""] || "";
  if (!product_id) {
    throw new Error("invalid product_id");
  }

  const success_url = `${process.env.NEXT_PUBLIC_WEB_URL}/api/pay/callback/creem?locale=${locale}`;

  const metadata = {
    project: process.env.NEXT_PUBLIC_PROJECT_NAME || "",
    product_id: order.product_id || "",
    product_name: order.product_name || "",
    order_no: order.order_no,
    user_email: order.user_email,
    credits: order.credits,
    user_uuid: order.user_uuid,
    interval: order.interval,
    ...ga_metadata,
  };

  const result = await client.creem().createCheckout({
    xApiKey: client.apiKey(),
    createCheckoutRequest: {
      productId: product_id,
      requestId: order.order_no,
      customer: {
        email: order.user_email,
      },
      successUrl: success_url,
      metadata,
    },
  });

  log.info({ order_no: order.order_no, checkout_id: result.id }, "creem checkout created");

  // update order detail
  await updateOrderSession(
    order.order_no,
    result.id,
    JSON.stringify({ ...result, _request_metadata: metadata })
  );

  return {
    order_no: order.order_no,
    session_id: result.id,
    checkout_url: result.checkoutUrl,
    provider: "creem",
  };
}
