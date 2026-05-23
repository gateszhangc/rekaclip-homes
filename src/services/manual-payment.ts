import { findManualPaymentRequestByOrderNo, ManualPaymentStatus } from "@/models/manual-payment";
import { updateOrderStatus, OrderStatus } from "@/models/order";
import { updateCreditForOrder } from "./credit";
import { updateAffiliateForOrder } from "./affiliate";
import { Order } from "@/types/order";
import { getIsoTimestr } from "@/lib/time";
import { createLogger } from "@/lib/logger";

const log = createLogger("services/manual-payment");

/**
 * Approve a manual payment request and fulfill the order
 */
export async function approveManualPaymentRequest({
  orderNo,
  reviewedBy,
  notes,
}: {
  orderNo: string;
  reviewedBy: string;
  notes?: string;
}) {
  const request = await findManualPaymentRequestByOrderNo(orderNo);
  if (!request) {
    throw new Error("payment request not found");
  }

  if (request.status !== ManualPaymentStatus.Pending) {
    throw new Error(`payment request is already ${request.status}`);
  }

  if (!request.paid_at || !request.transaction_id) {
    throw new Error("payment request has not been confirmed by user");
  }

  // Create order data for fulfillment
  const order: Order = {
    order_no: request.order_no,
    created_at: request.created_at?.toISOString() || getIsoTimestr(),
    user_uuid: request.user_uuid,
    user_email: request.user_email,
    amount: request.amount,
    interval: request.interval || "one-time",
    expired_at: request.valid_months
      ? new Date(
          Date.now() + request.valid_months * 30 * 24 * 60 * 60 * 1000
        ).toISOString()
      : "",
    status: OrderStatus.Paid,
    credits: request.credits,
    currency: "CNY",
    product_id: request.product_id,
    product_name: request.product_name || "",
    valid_months: request.valid_months || undefined,
    paid_at: getIsoTimestr(),
    paid_email: request.user_email,
    paid_detail: JSON.stringify({
      payment_method: request.payment_method,
      transaction_id: request.transaction_id,
      reviewed_by: reviewedBy,
      notes: notes,
      type: "manual_payment",
    }),
  };

  // Update order status to paid and fulfill
  const didUpdate = await updateOrderStatus(
    orderNo,
    OrderStatus.Paid,
    order.paid_at!,
    request.user_email,
    order.paid_detail!
  );

  if (didUpdate) {
    log.info(
      { order_no: orderNo, reviewed_by: reviewedBy },
      "manual payment approved and fulfilled"
    );
  }

  return { request, order, didUpdate };
}

/**
 * Reject a manual payment request
 */
export async function rejectManualPaymentRequest({
  orderNo,
  reviewedBy,
  notes,
}: {
  orderNo: string;
  reviewedBy: string;
  notes?: string;
}) {
  const request = await findManualPaymentRequestByOrderNo(orderNo);
  if (!request) {
    throw new Error("payment request not found");
  }

  if (request.status !== ManualPaymentStatus.Pending) {
    throw new Error(`payment request is already ${request.status}`);
  }

  log.info(
    { order_no: orderNo, reviewed_by: reviewedBy, notes },
    "manual payment rejected"
  );

  return request;
}
