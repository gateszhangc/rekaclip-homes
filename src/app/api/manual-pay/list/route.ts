import { getUserUuid } from "@/services/auth_user";
import { respData, respErr } from "@/lib/resp";
import { createLogger } from "@/lib/logger";
import { getManualPaymentRequestsByUserUuid } from "@/models/manual-payment";

const log = createLogger("api/manual-pay/list");

export async function GET() {
  try {
    // Get authenticated user
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respErr("no auth, please sign-in");
    }

    // Get user's payment requests
    const requests = await getManualPaymentRequestsByUserUuid(userUuid);

    return respData({
      requests: requests.map((req) => ({
        order_no: req.order_no,
        amount: req.amount,
        amount_yuan: req.amount / 100,
        product_name: req.product_name,
        product_id: req.product_id,
        status: req.status,
        payment_method: req.payment_method,
        transaction_id: req.transaction_id,
        created_at: req.created_at,
        paid_at: req.paid_at,
        reviewed_at: req.reviewed_at,
        notes: req.notes,
      })),
    });
  } catch (e: any) {
    log.error({ err: e }, "manual pay list failed");
    return respErr("manual pay list failed: " + e.message);
  }
}
