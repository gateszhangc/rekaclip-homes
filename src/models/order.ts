import { deployments, orders } from "@/db/schema";
import { db } from "@/db";
import { assertDbWriteAllowed } from "@/lib/db-write-freeze";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
} from "drizzle-orm";

export enum OrderStatus {
  Created = "created",
  Paid = "paid",
  Deleted = "deleted",
}

export async function insertOrder(data: typeof orders.$inferInsert) {
  assertDbWriteAllowed("orders.insert");
  if (data.created_at && typeof data.created_at === "string") {
    data.created_at = new Date(data.created_at);
  }
  if (data.expired_at && typeof data.expired_at === "string") {
    data.expired_at = new Date(data.expired_at);
  }
  if (data.paid_at && typeof data.paid_at === "string") {
    data.paid_at = new Date(data.paid_at);
  }

  const [order] = await db().insert(orders).values(data).returning();

  return order;
}

export async function findOrderByOrderNo(
  order_no: string
): Promise<typeof orders.$inferSelect | undefined> {
  const [order] = await db()
    .select()
    .from(orders)
    .where(eq(orders.order_no, order_no))
    .limit(1);

  return order;
}

export async function getFirstPaidOrderByUserUuid(
  user_uuid: string
): Promise<typeof orders.$inferSelect | undefined> {
  const [order] = await db()
    .select()
    .from(orders)
    .where(
      and(eq(orders.user_uuid, user_uuid), eq(orders.status, OrderStatus.Paid))
    )
    .orderBy(asc(orders.created_at))
    .limit(1);

  return order;
}

export async function getFirstPaidOrderByUserEmail(
  user_email: string
): Promise<typeof orders.$inferSelect | undefined> {
  const [order] = await db()
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.user_email, user_email),
        eq(orders.status, OrderStatus.Paid)
      )
    )
    .orderBy(desc(orders.created_at))
    .limit(1);

  return order;
}

export async function updateOrderStatus(
  order_no: string,
  status: string,
  paid_at: string,
  paid_email: string,
  paid_detail: string
) {
  assertDbWriteAllowed("orders.updateStatus");
  const [order] = await db()
    .update(orders)
    .set({ status, paid_at: new Date(paid_at), paid_detail, paid_email })
    .where(eq(orders.order_no, order_no))
    .returning();

  return order;
}

export async function updateOrderSession(
  order_no: string,
  stripe_session_id: string,
  order_detail: string
) {
  assertDbWriteAllowed("orders.updateSession");
  const [order] = await db()
    .update(orders)
    .set({ stripe_session_id, order_detail })
    .where(eq(orders.order_no, order_no))
    .returning();

  return order;
}

export async function updateOrderSubscription(
  order_no: string,
  sub_id: string,
  sub_interval_count: number,
  sub_cycle_anchor: number,
  sub_period_end: number,
  sub_period_start: number,
  status: string,
  paid_at: string,
  sub_times: number,
  paid_email: string,
  paid_detail: string
) {
  assertDbWriteAllowed("orders.updateSubscription");
  const [order] = await db()
    .update(orders)
    .set({
      sub_id,
      sub_interval_count,
      sub_cycle_anchor,
      sub_period_end,
      sub_period_start,
      status,
      paid_at: new Date(paid_at),
      sub_times,
      paid_email,
      paid_detail,
    })
    .where(eq(orders.order_no, order_no))
    .returning();

  return order;
}

export async function getOrdersByUserUuid(
  user_uuid: string
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(
      and(eq(orders.user_uuid, user_uuid), eq(orders.status, OrderStatus.Paid))
    )
    .orderBy(desc(orders.created_at));

  return data;
}

export async function getOrdersByUserEmail(
  user_email: string
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.user_email, user_email),
        eq(orders.status, OrderStatus.Paid)
      )
    )
    .orderBy(desc(orders.created_at));

  return data;
}

export async function getOrdersByPaidEmail(
  paid_email: string
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.paid_email, paid_email),
        eq(orders.status, OrderStatus.Paid)
      )
    )
    .orderBy(desc(orders.created_at));

  return data;
}

export async function getPaiedOrders(
  page: number,
  limit: number
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(eq(orders.status, OrderStatus.Paid))
    .orderBy(desc(orders.created_at))
    .limit(limit)
    .offset((page - 1) * limit);

  return data;
}

export async function getPaidOrdersTotal(): Promise<number | undefined> {
  const total = await db().$count(orders);

  return total;
}

export async function getOrderCountByDate(
  startTime: string,
  status?: string
): Promise<Map<string, number> | undefined> {
  const data = await db()
    .select({ created_at: orders.created_at })
    .from(orders)
    .where(gte(orders.created_at, new Date(startTime)));

  data.sort((a, b) => a.created_at!.getTime() - b.created_at!.getTime());

  const dateCountMap = new Map<string, number>();
  data.forEach((item) => {
    const date = item.created_at!.toISOString().split("T")[0];
    dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1);
  });

  return dateCountMap;
}

export type SubscriptionTier = "starter" | "pro";
const ACTIVE_DEPLOYMENT_STATUSES = ["provisioning", "running"] as const;

const inferSubscriptionTierFromOrderProduct = (
  productId?: string | null,
  productName?: string | null
): SubscriptionTier => {
  const normalizedProductId = (productId || "").toLowerCase();
  const normalizedProductName = (productName || "").toLowerCase();
  const token = `${normalizedProductId} ${normalizedProductName}`;

  if (token.includes("premium") || token.includes("pro")) {
    return "pro";
  }

  return "starter";
};

type ActiveSubscriptionOrder = {
  order_no: string;
  product_id: string | null;
  product_name: string | null;
};

type ActiveDeploymentSeat = {
  subscription_order_no: string | null;
};

const getValidSubscriptionOrdersByUserUuid = async (
  user_uuid: string
): Promise<ActiveSubscriptionOrder[]> => {
  return db()
    .select({
      order_no: orders.order_no,
      product_id: orders.product_id,
      product_name: orders.product_name,
    })
    .from(orders)
    .where(
      and(
        eq(orders.user_uuid, user_uuid),
        eq(orders.status, OrderStatus.Paid),
        inArray(orders.interval, ["month", "year"]),
        gt(orders.expired_at, new Date())
      )
    )
    .orderBy(asc(orders.paid_at), asc(orders.created_at), asc(orders.order_no));
};

const getActiveDeploymentsByUserUuid = async (
  user_uuid: string
): Promise<ActiveDeploymentSeat[]> => {
  return db()
    .select({
      subscription_order_no: deployments.subscription_order_no,
    })
    .from(deployments)
    .where(
      and(
        eq(deployments.user_id, user_uuid),
        inArray(deployments.status, ACTIVE_DEPLOYMENT_STATUSES)
      )
    );
};

export type DeployEligibility = {
  canDeploy: boolean;
  remainingDeployQuota: number;
  subscriptionTier: SubscriptionTier | null;
  hasActiveSubscription: boolean;
  availableSubscriptionOrderNo: string | null;
};

export function createDefaultDeployEligibility(): DeployEligibility {
  return {
    canDeploy: false,
    remainingDeployQuota: 0,
    subscriptionTier: null,
    hasActiveSubscription: false,
    availableSubscriptionOrderNo: null,
  };
}

export function computeDeployEligibilityFromOrderState({
  validOrders,
  activeDeployments,
}: {
  validOrders: ActiveSubscriptionOrder[];
  activeDeployments: ActiveDeploymentSeat[];
}): DeployEligibility {
  if (validOrders.length === 0) {
    return createDefaultDeployEligibility();
  }

  const occupiedSubscriptionOrderNos = new Set<string>();
  for (const deployment of activeDeployments) {
    const orderNo = deployment.subscription_order_no?.trim();
    if (orderNo) {
      occupiedSubscriptionOrderNos.add(orderNo);
    }
  }

  const remainingDeployQuota = Math.max(
    0,
    validOrders.length - activeDeployments.length
  );
  const availableOrder =
    remainingDeployQuota > 0
      ? validOrders.find(
          (order) => !occupiedSubscriptionOrderNos.has(order.order_no)
        ) ?? null
      : null;
  const fallbackOrder = validOrders[validOrders.length - 1] ?? null;
  const tierOrder = availableOrder ?? fallbackOrder;

  return {
    canDeploy: Boolean(availableOrder),
    remainingDeployQuota,
    subscriptionTier: tierOrder
      ? inferSubscriptionTierFromOrderProduct(
          tierOrder.product_id,
          tierOrder.product_name
        )
      : null,
    hasActiveSubscription: true,
    availableSubscriptionOrderNo: availableOrder?.order_no ?? null,
  };
}

export async function getDeployEligibilityByUserUuid(
  user_uuid: string
): Promise<DeployEligibility> {
  if (!user_uuid) {
    return createDefaultDeployEligibility();
  }

  const [validOrders, activeDeployments] = await Promise.all([
    getValidSubscriptionOrdersByUserUuid(user_uuid),
    getActiveDeploymentsByUserUuid(user_uuid),
  ]);

  return computeDeployEligibilityFromOrderState({
    validOrders,
    activeDeployments,
  });
}

export async function hasActiveSubscriptionByUserUuid(
  user_uuid: string
): Promise<boolean> {
  const eligibility = await getDeployEligibilityByUserUuid(user_uuid);
  return eligibility.hasActiveSubscription;
}

export async function getActiveSubscriptionTierByUserUuid(
  user_uuid: string
): Promise<SubscriptionTier | null> {
  const eligibility = await getDeployEligibilityByUserUuid(user_uuid);
  return eligibility.subscriptionTier;
}

export type DeploySubscriptionAllocation = {
  orderNo: string;
  tier: SubscriptionTier;
  remainingDeployQuota: number;
};

export async function allocateDeploySubscriptionOrderByUserUuid(
  user_uuid: string
): Promise<DeploySubscriptionAllocation | null> {
  const eligibility = await getDeployEligibilityByUserUuid(user_uuid);
  if (
    !eligibility.canDeploy ||
    !eligibility.availableSubscriptionOrderNo ||
    !eligibility.subscriptionTier
  ) {
    return null;
  }

  return {
    orderNo: eligibility.availableSubscriptionOrderNo,
    tier: eligibility.subscriptionTier,
    remainingDeployQuota: eligibility.remainingDeployQuota,
  };
}
