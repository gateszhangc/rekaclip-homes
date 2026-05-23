import test from "node:test";
import assert from "node:assert/strict";
import { CurrentDashboardSessionStore } from "./openclaw-dashboard/session-store.js";
import { maskDashboardUrl } from "./openclaw-dashboard/url.js";
import type { DashboardTarget } from "./openclaw-dashboard/types.js";

const target: DashboardTarget = {
  namespace: "easyclaw-openclaw",
  deployment: "openclaw-dep-123",
  pod: "openclaw-dep-123-abc",
  container: "openclaw",
  gatewayPort: 18_789,
};

test("maskDashboardUrl hides the token in the hash fragment", () => {
  assert.equal(
    maskDashboardUrl(
      "http://127.0.0.1:39123/control-ui/#token=codexwa-86add9d981"
    ),
    "http://127.0.0.1:39123/control-ui/#token=code...d981"
  );
});

test("CurrentDashboardSessionStore starts once and reuses the ready snapshot", async () => {
  let launchCount = 0;
  let stopCount = 0;

  const store = new CurrentDashboardSessionStore({
    runtimeAdapter: {
      async launch({ target: runtimeTarget, onLog }) {
        launchCount += 1;
        onLog("info", `Allocated local port 39123 for ${runtimeTarget.pod}.`);
        return {
          localPort: 39_123,
          dashboardUrl:
            "http://127.0.0.1:39123/control-ui/#token=codexwa-86add9d981",
          target: runtimeTarget,
          stop: async () => {
            stopCount += 1;
          },
        };
      },
    },
    now: () => new Date("2026-04-09T12:00:00.000Z"),
    sessionIdFactory: () => "session-1",
    logIdFactory: () => `log-${launchCount}`,
  });

  const first = await store.startOrReuse(target);
  const second = await store.startOrReuse(target);

  assert.equal(launchCount, 1);
  assert.equal(first.status, "ready");
  assert.equal(first.localPort, 39_123);
  assert.equal(
    first.maskedDashboardUrl,
    "http://127.0.0.1:39123/control-ui/#token=code...d981"
  );
  assert.equal(second.sessionId, "session-1");
  assert.equal(second.dashboardUrl, first.dashboardUrl);
  assert.equal(store.getCurrentSnapshot()?.status, "ready");

  const stopped = await store.stopCurrent();
  assert.equal(stopped, true);
  assert.equal(stopCount, 1);
  assert.equal(store.getCurrentSnapshot(), null);
});

test("CurrentDashboardSessionStore returns false when stopping without a session", async () => {
  const store = new CurrentDashboardSessionStore({
    runtimeAdapter: {
      async launch() {
        throw new Error("not reached");
      },
    },
  });

  assert.equal(await store.stopCurrent(), false);
});

