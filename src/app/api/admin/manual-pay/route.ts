import { respData, respErr } from "@/lib/resp";
import { createLogger } from "@/lib/logger";
import {
  getAllManualPaymentRequests,
  getPendingManualPaymentRequests,
  updateManualPaymentRequestStatus,
  ManualPaymentStatus,
} from "@/models/manual-payment";
import { approveManualPaymentRequest, rejectManualPaymentRequest } from "@/services/manual-payment";
import { getUserEmail } from "@/services/auth_user";

const log = createLogger("api/admin/manual-pay");

// Get all manual payment requests (admin only)
export async function GET(req: Request) {
  try {
    // Check admin permission
    const userEmail = await getUserEmail();
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    if (!adminEmails.includes(userEmail || "")) {
      return Response.json({ code: -1, message: "unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    let requests;
    if (status === "pending") {
      requests = await getPendingManualPaymentRequests();
    } else {
      requests = await getAllManualPaymentRequests(page, limit);
    }

    return respData({
      requests: requests.map((req) => ({
        order_no: req.order_no,
        user_uuid: req.user_uuid,
        user_email: req.user_email,
        amount: req.amount,
        amount_yuan: req.amount / 100,
        product_name: req.product_name,
        product_id: req.product_id,
        status: req.status,
        payment_method: req.payment_method,
        transaction_id: req.transaction_id,
        credits: req.credits,
        interval: req.interval,
        created_at: req.created_at,
        paid_at: req.paid_at,
        reviewed_at: req.reviewed_at,
        reviewed_by: req.reviewed_by,
        notes: req.notes,
      })),
    });
  } catch (e: any) {
    log.error({ err: e }, "admin manual pay list failed");
    return respErr("admin manual pay list failed: " + e.message);
  }
}

// Approve or reject a manual payment request
export async function POST(req: Request) {
  try {
    // Check admin permission
    const userEmail = await getUserEmail();
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    if (!adminEmails.includes(userEmail || "")) {
      return Response.json({ code: -1, message: "unauthorized" }, { status: 403 });
    }

    const { order_no, action, notes } = await req.json();

    if (!order_no || !action) {
      return respErr("order_no and action are required");
    }

    if (!["approve", "reject"].includes(action)) {
      return respErr("action must be approve or reject");
    }

    if (action === "approve") {
      const result = await approveManualPaymentRequest({
        orderNo: order_no,
        reviewedBy: userEmail || "",
        notes,
      });

      // Update status to approved
      await updateManualPaymentRequestStatus({
        orderNo: order_no,
        status: ManualPaymentStatus.Approved,
        reviewedBy: userEmail || "",
        notes,
      });

      log.info({ order_no, reviewed_by: userEmail }, "manual payment approved by admin");

      return respData({
        message: "payment approved and order fulfilled",
        order_no: result.order.order_no,
        credits_added: result.order.credits,
      });
    } else {
      // Reject
      await rejectManualPaymentRequest({
        orderNo: order_no,
        reviewedBy: userEmail || "",
        notes,
      });

      await updateManualPaymentRequestStatus({
        orderNo: order_no,
        status: ManualPaymentStatus.Rejected,
        reviewedBy: userEmail || "",
        notes,
      });

      log.info({ order_no, reviewed_by: userEmail }, "manual payment rejected by admin");

      return respData({
        message: "payment rejected",
        order_no,
      });
    }
  } catch (e: any) {
    log.error({ err: e }, "admin manual pay action failed");
    return respErr("admin manual pay action failed: " + e.message);
  }
}
