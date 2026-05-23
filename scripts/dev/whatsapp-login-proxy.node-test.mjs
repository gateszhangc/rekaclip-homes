import assert from "node:assert/strict";
import test from "node:test";

const ORIGINAL_BACKEND_BASE_URL = process.env.BACKEND_BASE_URL;
const ORIGINAL_FETCH = global.fetch;

const okJsonResponse = (data) =>
  Response.json({
    code: 0,
    data,
  });

const noContentResponse = () =>
  new Response(null, {
    status: 204,
  });

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

test("whatsapp login proxy routes forward without frontend auth headers", async () => {
  process.env.BACKEND_BASE_URL = "http://127.0.0.1:5000";

  const startRoute = await loadRouteModule(
    "../../src/app/api/deploy/[id]/whatsapp-login/start/route.ts"
  );
  const currentRoute = await loadRouteModule(
    "../../src/app/api/deploy/[id]/whatsapp-login/current/route.ts"
  );
  const cancelRoute = await loadRouteModule(
    "../../src/app/api/deploy/[id]/whatsapp-login/current/cancel/route.ts"
  );
  const restartRoute = await loadRouteModule(
    "../../src/app/api/deploy/[id]/whatsapp-login/restart/route.ts"
  );

  await withMockedFetch(
    (input) => {
      const url = typeof input === "string" ? input : input.url;

      if (url.endsWith("/whatsapp-login/current")) {
        return Promise.resolve(noContentResponse());
      }

      return Promise.resolve(
        okJsonResponse({
          sessionId: "session-1",
          status: "qr_ready",
        })
      );
    },
    async (requests) => {
      const params = Promise.resolve({ id: "deployment-123" });

      const startResponse = await startRoute.POST(new Request("http://localhost"), {
        params,
      });
      assert.equal(startResponse.status, 200);

      const currentResponse = await currentRoute.GET(
        new Request("http://localhost"),
        {
          params,
        }
      );
      assert.equal(currentResponse.status, 204);

      const cancelResponse = await cancelRoute.POST(
        new Request("http://localhost"),
        {
          params,
        }
      );
      assert.equal(cancelResponse.status, 200);

      const restartResponse = await restartRoute.POST(
        new Request("http://localhost"),
        {
          params,
        }
      );
      assert.equal(restartResponse.status, 200);

      assert.equal(requests.length, 4);
      assert.deepEqual(
        requests.map((request) => ({
          url: request.url,
          method: request.init.method ?? "GET",
          authorization: new Headers(request.init.headers).get("authorization"),
          contentType: new Headers(request.init.headers).get("content-type"),
        })),
        [
          {
            url: "http://127.0.0.1:5000/api/deploy/deployment-123/whatsapp-login/start",
            method: "POST",
            authorization: null,
            contentType: "application/json",
          },
          {
            url: "http://127.0.0.1:5000/api/deploy/deployment-123/whatsapp-login/current",
            method: "GET",
            authorization: null,
            contentType: null,
          },
          {
            url: "http://127.0.0.1:5000/api/deploy/deployment-123/whatsapp-login/current/cancel",
            method: "POST",
            authorization: null,
            contentType: "application/json",
          },
          {
            url: "http://127.0.0.1:5000/api/deploy/deployment-123/whatsapp-login/restart",
            method: "POST",
            authorization: null,
            contentType: "application/json",
          },
        ]
      );
    }
  );
});
