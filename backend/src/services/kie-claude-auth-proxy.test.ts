import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import {
  buildKieGatewaySmokeArgs,
  buildKieClaudeProxyForwardHeaders,
  extractOpenClawAgentTextFromJson,
  startKieClaudeAuthProxyServer,
} from "./openclaw/kie-claude-auth-proxy.js";

test("buildKieClaudeProxyForwardHeaders rewrites inbound auth to Bearer and preserves Anthropic headers", () => {
  const headers = buildKieClaudeProxyForwardHeaders({
    "x-api-key": "kie-token",
    "anthropic-version": "2023-06-01",
    "anthropic-beta": "tools-2026-01-01",
    "content-type": "application/json",
  });

  assert.equal(headers.Authorization, "Bearer kie-token");
  assert.equal(headers["anthropic-version"], "2023-06-01");
  assert.equal(headers["anthropic-beta"], "tools-2026-01-01");
  assert.equal(headers["content-type"], "application/json");
  assert.equal("x-api-key" in headers, false);
});

test("gateway smoke helpers keep the exact OpenClaw command contract and parse payload text", () => {
  assert.deepEqual(buildKieGatewaySmokeArgs(), [
    "agent",
    "--agent",
    "main",
    "--message",
    "reply with exactly OK",
    "--json",
  ]);

  assert.equal(
    extractOpenClawAgentTextFromJson(
      JSON.stringify({
        payloads: [{ text: "OK" }],
      })
    ),
    "OK"
  );
});

test("KIE Claude auth proxy exposes /healthz and forwards /v1/messages with rewritten auth", async () => {
  let upstreamHeaders: Record<string, string | string[] | undefined> | null = null;
  let upstreamBody = "";
  const upstreamServer = createServer(async (request, response) => {
    upstreamHeaders = request.headers;

    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    upstreamBody = Buffer.concat(chunks).toString("utf8");

    response.writeHead(200, {
      "content-type": "application/json",
    });
    response.write('{"content":[{"type":"text","text":"');
    await new Promise((resolve) => setTimeout(resolve, 5));
    response.end('OK"}]}');
  });

  upstreamServer.listen(0, "127.0.0.1");
  await once(upstreamServer, "listening");
  const upstreamAddress = upstreamServer.address();
  assert.ok(upstreamAddress && typeof upstreamAddress !== "string");

  const proxy = await startKieClaudeAuthProxyServer({
    port: 0,
    upstreamMessagesUrl: `http://127.0.0.1:${upstreamAddress.port}/v1/messages`,
  });

  try {
    const healthResponse = await fetch(`${proxy.baseUrl}/healthz`);
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(await healthResponse.json(), { ok: true });

    const response = await fetch(`${proxy.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": "kie-token",
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "tools-2026-01-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Reply with exactly OK" }],
      }),
    });

    assert.equal(response.status, 200);
    assert.equal(
      await response.text(),
      '{"content":[{"type":"text","text":"OK"}]}'
    );
    if (!upstreamHeaders) {
      assert.fail("proxy did not forward the request upstream");
    }
    const receivedHeaders: Record<string, string | string[] | undefined> =
      upstreamHeaders;
    assert.equal(receivedHeaders.authorization, "Bearer kie-token");
    assert.equal(receivedHeaders["x-api-key"], undefined);
    assert.equal(receivedHeaders["anthropic-version"], "2023-06-01");
    assert.equal(
      receivedHeaders["anthropic-beta"],
      "tools-2026-01-01"
    );
    assert.deepEqual(JSON.parse(upstreamBody), {
      messages: [{ role: "user", content: "Reply with exactly OK" }],
    });
  } finally {
    await proxy.close();
    await new Promise<void>((resolve, reject) => {
      upstreamServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
});
