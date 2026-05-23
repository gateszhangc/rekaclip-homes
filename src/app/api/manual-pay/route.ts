import { getUserEmail, getUserUuid } from "@/services/auth_user";
import { respData, respErr } from "@/lib/resp";
import { findUserByUuid } from "@/models/user";
import { getSnowId } from "@/lib/hash";
import { getPricingPage } from "@/services/page";
import { PricingItem } from "@/types/blocks/pricing";
import { createLogger } from "@/lib/logger";
import {
  insertManualPaymentRequest,
  hasPendingManualPaymentRequest,
  ManualPaymentStatus,
} from "@/models/manual-payment";
import { findOrderByOrderNo } from "@/models/order";

const log = createLogger("api/manual-pay");

export async function POST(req: Request) {
  try {
    const { product_id, locale } = await req.json();

    log.info({ product_id, locale }, "manual pay request received");

    if (!product_id) {
      return respErr("invalid params: product_id required");
    }

    // Only allow Chinese locale
    const isChineseLocale = locale?.startsWith("zh") || false;
    if (!isChineseLocale) {
      return respErr("manual payment only available for Chinese users");
    }

    // Validate product from pricing page
    const page = await getPricingPage(locale);
    if (!page?.pricing?.items) {
      return respErr("invalid pricing configuration");
    }

    const item = page.pricing.items.find(
      (item: PricingItem) => item.product_id === product_id
    );

    if (!item || !item.cn_amount || item.cn_amount <= 0) {
      return respErr("invalid product or no CNY price available");
    }

    // Get authenticated user
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respErr("no auth, please sign-in");
    }

    let userEmail = await getUserEmail();
    if (!userEmail) {
      const user = await findUserByUuid(userUuid);
      if (user) {
        userEmail = user.email;
      }
    }
    if (!userEmail) {
      return respErr("invalid user");
    }

    // Check if there's already a pending request for this product
    const hasPending = await hasPendingManualPaymentRequest(userUuid, product_id);
    if (hasPending) {
      return respErr("you already have a pending payment request for this product");
    }

    // Generate order number
    const orderNo = getSnowId();

    // Calculate expiration (same logic as regular orders)
    const currentDate = new Date();
    const validMonths = item.valid_months || 1;
    let expiredAt = null;
    if (validMonths > 0) {
      const timePeriod = new Date(currentDate);
      timePeriod.setMonth(currentDate.getMonth() + validMonths);
      const delayTimeMillis = 24 * 60 * 60 * 1000; // delay 24 hours expired
      expiredAt = new Date(timePeriod.getTime() + delayTimeMillis);
    }

    // Create manual payment request
    const request = await insertManualPaymentRequest({
      order_no: orderNo,
      user_uuid: userUuid,
      user_email: userEmail,
      amount: item.cn_amount,
      product_id: product_id,
      product_name: item.product_name || item.title,
      credits: item.credits || 0,
      valid_months: validMonths,
      interval: item.interval,
      status: ManualPaymentStatus.Pending,
    });

    log.info({ order_no: orderNo, product_id }, "manual payment request created");

    return respData({
      order_no: orderNo,
      amount: item.cn_amount,
      amount_yuan: item.cn_amount / 100,
      product_name: item.product_name || item.title,
      product_id: product_id,
      status: request.status,
    });
  } catch (e: any) {
    log.error({ err: e }, "manual pay request failed");
    return respErr("manual pay request failed: " + e.message);
  }
}
