import test from "node:test";
import assert from "node:assert/strict";

const loadOrderModule = async () => {
  const imported = (await import("./order")) as typeof import("./order") & {
    default?: typeof import("./order");
  };
  return imported.default ?? imported;
};

test("createDefaultDeployEligibility returns the safe empty-state payload", async () => {
  const orderModule = await loadOrderModule();
  assert.deepEqual(orderModule.createDefaultDeployEligibility(), {
    canDeploy: false,
    remainingDeployQuota: 0,
    subscriptionTier: null,
    hasActiveSubscription: false,
    availableSubscriptionOrderNo: null,
  });
});

test("getDeployEligibilityByUserUuid short-circuits empty user ids", async () => {
  const orderModule = await loadOrderModule();
  assert.deepEqual(await orderModule.getDeployEligibilityByUserUuid(""), {
    canDeploy: false,
    remainingDeployQuota: 0,
    subscriptionTier: null,
    hasActiveSubscription: false,
    availableSubscriptionOrderNo: null,
  });
});

test("computeDeployEligibilityFromOrderState allows deploy when a seat is free", async () => {
  const orderModule = await loadOrderModule();

  assert.deepEqual(
    orderModule.computeDeployEligibilityFromOrderState({
      validOrders: [
        { order_no: "order_a", product_id: "starter-plan", product_name: "Starter" },
      ],
      activeDeployments: [],
    }),
    {
      canDeploy: true,
      remainingDeployQuota: 1,
      subscriptionTier: "starter",
      hasActiveSubscription: true,
      availableSubscriptionOrderNo: "order_a",
    }
  );
});

test("computeDeployEligibilityFromOrderState blocks deploy when all active seats are occupied", async () => {
  const orderModule = await loadOrderModule();

  assert.deepEqual(
    orderModule.computeDeployEligibilityFromOrderState({
      validOrders: [
        { order_no: "order_a", product_id: "starter-plan", product_name: "Starter" },
      ],
      activeDeployments: [{ subscription_order_no: "order_a" }],
    }),
    {
      canDeploy: false,
      remainingDeployQuota: 0,
      subscriptionTier: "starter",
      hasActiveSubscription: true,
      availableSubscriptionOrderNo: null,
    }
  );
});

test("computeDeployEligibilityFromOrderState counts active deployments even if they were created from older orders", async () => {
  const orderModule = await loadOrderModule();

  assert.deepEqual(
    orderModule.computeDeployEligibilityFromOrderState({
      validOrders: [
        { order_no: "renewed_order", product_id: "pro-plan", product_name: "Pro" },
      ],
      activeDeployments: [{ subscription_order_no: "expired_order" }],
    }),
    {
      canDeploy: false,
      remainingDeployQuota: 0,
      subscriptionTier: "pro",
      hasActiveSubscription: true,
      availableSubscriptionOrderNo: null,
    }
  );
});

test("computeDeployEligibilityFromOrderState chooses the first unoccupied valid order", async () => {
  const orderModule = await loadOrderModule();

  assert.deepEqual(
    orderModule.computeDeployEligibilityFromOrderState({
      validOrders: [
        { order_no: "order_a", product_id: "starter-plan", product_name: "Starter" },
        { order_no: "order_b", product_id: "pro-plan", product_name: "Pro" },
      ],
      activeDeployments: [{ subscription_order_no: "order_a" }],
    }),
    {
      canDeploy: true,
      remainingDeployQuota: 1,
      subscriptionTier: "pro",
      hasActiveSubscription: true,
      availableSubscriptionOrderNo: "order_b",
    }
  );
});
