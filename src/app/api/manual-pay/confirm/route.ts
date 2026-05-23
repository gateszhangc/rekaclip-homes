import { getUserUuid } from "@/services/auth_user";
import { respData, respErr } from "@/lib/resp";
import { createLogger } from "@/lib/logger";
import {
  findManualPaymentRequestByOrderNo,
  updateManualPaymentRequestTransactionId,
  ManualPaymentStatus,
} from "@/models/manual-payment";

const log = createLogger("api/manual-pay/confirm");

export async function POST(req: Request) {
  try {
    const { order_no, transaction_id, payment_method } = await req.json();

    log.info({ order_no, transaction_id, payment_method }, "manual pay confirm received");

    if (!order_no || !transaction_id) {
      return respErr("order_no and transaction_id are required");
    }

    // Validate payment method
    const validMethods = ["alipay", "wechat"];
    if (!payment_method || !validMethods.includes(payment_method)) {
      return respErr("invalid payment_method, must be alipay or wechat");
    }

    // Get authenticated user
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respErr("no auth, please sign-in");
    }

    // Find the payment request
    const request = await findManualPaymentRequestByOrderNo(order_no);
    if (!request) {
      return respErr("payment request not found");
    }

    // Verify ownership
    if (request.user_uuid !== userUuid) {
      return respErr("unauthorized");
    }

    // Check status
    if (request.status !== ManualPaymentStatus.Pending) {
      return respErr(`payment request already ${request.status}`);
    }

    // Update with transaction info
    const updated = await updateManualPaymentRequestTransactionId({
      orderNo: order_no,
      transactionId: transaction_id,
      paymentMethod: payment_method,
    });

    log.info({ order_no }, "manual payment confirmed by user");

    return respData({
      order_no: updated.order_no,
      status: updated.status,
      message: "payment confirmation submitted, please wait for admin review",
    });
  } catch (e: any) {
    log.error({ err: e }, "manual pay confirm failed");
    return respErr("manual pay confirm failed: " + e.message);
  }
}
