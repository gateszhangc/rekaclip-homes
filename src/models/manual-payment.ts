import { manualPaymentRequests } from "@/db/schema";
import { db } from "@/db";
import { eq, desc, and } from "drizzle-orm";
import { assertDbWriteAllowed } from "@/lib/db-write-freeze";

export enum ManualPaymentStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
}

export async function insertManualPaymentRequest(
  data: typeof manualPaymentRequests.$inferInsert
) {
  assertDbWriteAllowed("manualPaymentRequests.insert");
  const [record] = await db()
    .insert(manualPaymentRequests)
    .values(data)
    .returning();
  return record;
}

export async function findManualPaymentRequestByOrderNo(orderNo: string) {
  const [record] = await db()
    .select()
    .from(manualPaymentRequests)
    .where(eq(manualPaymentRequests.order_no, orderNo))
    .limit(1);
  return record;
}

export async function getManualPaymentRequestsByUserUuid(userUuid: string) {
  return db()
    .select()
    .from(manualPaymentRequests)
    .where(eq(manualPaymentRequests.user_uuid, userUuid))
    .orderBy(desc(manualPaymentRequests.created_at));
}

export async function getPendingManualPaymentRequests() {
  return db()
    .select()
    .from(manualPaymentRequests)
    .where(eq(manualPaymentRequests.status, ManualPaymentStatus.Pending))
    .orderBy(desc(manualPaymentRequests.created_at));
}

export async function getAllManualPaymentRequests(page: number, limit: number) {
  return db()
    .select()
    .from(manualPaymentRequests)
    .orderBy(desc(manualPaymentRequests.created_at))
    .limit(limit)
    .offset((page - 1) * limit);
}

export async function updateManualPaymentRequestStatus({
  orderNo,
  status,
  reviewedBy,
  notes,
}: {
  orderNo: string;
  status: ManualPaymentStatus;
  reviewedBy: string;
  notes?: string;
}) {
  assertDbWriteAllowed("manualPaymentRequests.updateStatus");
  const [record] = await db()
    .update(manualPaymentRequests)
    .set({
      status,
      reviewed_at: new Date(),
      reviewed_by: reviewedBy,
      notes: notes || null,
    })
    .where(eq(manualPaymentRequests.order_no, orderNo))
    .returning();
  return record;
}

export async function updateManualPaymentRequestTransactionId({
  orderNo,
  transactionId,
  paymentMethod,
}: {
  orderNo: string;
  transactionId: string;
  paymentMethod: string;
}) {
  assertDbWriteAllowed("manualPaymentRequests.updateTransaction");
  const [record] = await db()
    .update(manualPaymentRequests)
    .set({
      transaction_id: transactionId,
      payment_method: paymentMethod,
      paid_at: new Date(),
    })
    .where(eq(manualPaymentRequests.order_no, orderNo))
    .returning();
  return record;
}

export async function hasPendingManualPaymentRequest(
  userUuid: string,
  productId: string
): Promise<boolean> {
  const [record] = await db()
    .select()
    .from(manualPaymentRequests)
    .where(
      and(
        eq(manualPaymentRequests.user_uuid, userUuid),
        eq(manualPaymentRequests.product_id, productId),
        eq(manualPaymentRequests.status, ManualPaymentStatus.Pending)
      )
    )
    .limit(1);
  return !!record;
}
