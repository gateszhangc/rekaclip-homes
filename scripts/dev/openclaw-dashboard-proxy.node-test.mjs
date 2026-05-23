import assert from "node:assert/strict";
import test from "node:test";

const ORIGINAL_BACKEND_BASE_URL = process.env.BACKEND_BASE_URL;
const ORIGINAL_FETCH = global.fetch;

const loadRouteModule = async (modulePath) => {
  const imported = await import(modulePath);
  return imported.default ?? imported["module.exports"] ?? imported;
};

const withMockedFetch = async (handler, run) => {
  const requests = [];

  global.fetch = async (input, init) => {
    requests.push({
      url: typeof input === "string" ? input : input.url,
      init: init ?? {},
    });

    return handler(input, init);
  };

  try {
    return await run(requests);
  } finally {
    global.fetch = ORIGINAL_FETCH;
  }
};

test.afterEach(() => {
  if (ORIGINAL_BACKEND_BASE_URL === undefined) {
    delete process.env.BACKEND_BASE_URL;
  } else {
    process.env.BACKEND_BASE_URL = ORIGINAL_BACKEND_BASE_URL;
  }

  global.fetch = ORIGINAL_FETCH;
});

test("openclaw dashboard proxy routes forward without frontend auth headers and rewrite URLs", async () => {
  process.env.BACKEND_BASE_URL = "http://127.0.0.1:5000";

  const startRoute = await loadRouteModule(
    "../../src/app/api/deploy/[id]/openclaw-dashboard/start/route.ts"
  );
  const currentRoute = await loadRouteModule(
    "../../src/app/api/deploy/[id]/openclaw-dashboard/current/route.ts"
  );
  const stopRoute = await loadRouteModule(
    "../../src/app/api/deploy/[id]/openclaw-dashboard/stop/route.ts"
  );

  await withMockedFetch(
    (input) => {
      const url = typeof input === "string" ? input : input.url;

      if (url.endsWith("/openclaw-dashboard/current")) {
        return Promise.resolve(
          Response.json({
            code: 0,
            data: {
              sessionId: "dashboard-1",
              status: "ready",
              localPort: 39123,
              dashboardUrl:
                "http://127.0.0.1:39123/control-ui/#token=codexwa-86add9d981",
              maskedDashboardUrl:
                "http://127.0.0.1:39123/control-ui/#token=code...d981",
              startedAt: "2026-04-09T12:00:00.000Z",
              updatedAt: "2026-04-09T12:00:05.000Z",
              lastError: null,
              logs: [],
              target: {
                namespace: "easyclaw-openclaw",
                deployment: "openclaw-deployment-123",
                pod: "openclaw-deployment-123-abc",
                container: "openclaw",
                gatewayPort: 18789,
              },
            },
          })
        );
      }

      if (url.endsWith("/openclaw-dashboard/stop")) {
        return Promise.resolve(Response.json({ code: 0, data: { ok: true } }));
      }

      return Promise.resolve(
        Response.json({
          code: 0,
          data: {
            sessionId: "dashboard-1",
            status: "ready",
            localPort: 39123,
            dashboardUrl:
              "http://127.0.0.1:39123/control-ui/#token=codexwa-86add9d981",
            maskedDashboardUrl:
              "http://127.0.0.1:39123/control-ui/#token=code...d981",
            startedAt: "2026-04-09T12:00:00.000Z",
            updatedAt: "2026-04-09T12:00:05.000Z",
            lastError: null,
            logs: [],
            target: {
              namespace: "easyclaw-openclaw",
              deployment: "openclaw-deployment-123",
              pod: "openclaw-deployment-123-abc",
              container: "openclaw",
              gatewayPort: 18789,
            },
          },
        })
      );
    },
    async (requests) => {
      const params = Promise.resolve({ id: "deployment-123" });
      const requestUrl =
        "https://staging.easyclaw.pro/api/deploy/deployment-123/openclaw-dashboard/start";

      const startResponse = await startRoute.POST(new Request(requestUrl), {
        params,
      });
      const startPayload = await startResponse.json();
      assert.equal(startResponse.status, 200);
      assert.equal(
        startPayload.data.dashboardUrl,
        "https://staging.easyclaw.pro/_openclaw-dashboard/deployment-123/control-ui/#token=codexwa-86add9d981"
      );

      const currentResponse = await currentRoute.GET(new Request(requestUrl), {
        params,
      });
      const currentPayload = await currentResponse.json();
      assert.equal(currentResponse.status, 200);
      assert.equal(
        currentPayload.data.maskedDashboardUrl,
        "https://staging.easyclaw.pro/_openclaw-dashboard/deployment-123/control-ui/#token=code...d981"
      );

      const stopResponse = await stopRoute.POST(new Request(requestUrl), {
        params,
      });
      assert.equal(stopResponse.status, 200);

      assert.deepEqual(
        requests.map((request) => ({
          url: request.url,
          method: request.init.method ?? "GET",
          authorization: new Headers(request.init.headers).get("authorization"),
        })),
        [
          {
            url: "http://127.0.0.1:5000/api/deploy/deployment-123/openclaw-dashboard/start",
            method: "POST",
            authorization: null,
          },
          {
            url: "http://127.0.0.1:5000/api/deploy/deployment-123/openclaw-dashboard/current",
            method: "GET",
            authorization: null,
          },
          {
            url: "http://127.0.0.1:5000/api/deploy/deployment-123/openclaw-dashboard/stop",
            method: "POST",
            authorization: null,
          },
        ]
      );
    }
  );
});

test("same-domain dashboard route proxies backend responses and rewrites location headers", async () => {
  process.env.BACKEND_BASE_URL = "http://127.0.0.1:5000";

  const proxyRoute = await loadRouteModule(
    "../../src/app/_openclaw-dashboard/[id]/[[...path]]/route.ts"
  );

  await withMockedFetch(
    () =>
      Promise.resolve(
        new Response("<html>ok</html>", {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            location: "http://127.0.0.1:39123/control-ui/login",
          },
        })
      ),
    async (requests) => {
      const response = await proxyRoute.GET(
        new Request(
          "https://staging.easyclaw.pro/_openclaw-dashboard/deployment-123/control-ui/index.html?foo=1"
        ),
        {
          params: Promise.resolve({
            id: "deployment-123",
            path: ["control-ui", "index.html"],
          }),
        }
      );

      assert.equal(response.status, 200);
      assert.equal(await response.text(), "<html>ok</html>");
      assert.equal(
        response.headers.get("location"),
        "https://staging.easyclaw.pro/_openclaw-dashboard/deployment-123/control-ui/login"
      );
      assert.equal(
        requests[0]?.url,
        "http://127.0.0.1:5000/api/deploy/deployment-123/openclaw-dashboard/proxy/control-ui/index.html?foo=1"
      );
    }
  );
});

