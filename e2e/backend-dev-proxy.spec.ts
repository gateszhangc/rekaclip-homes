import { expect, test } from "@playwright/test";

test("dev health rewrite reaches configured backend", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"] || "").toContain("application/json");

  const body = await response.json();
  expect(body.status).toBe("ok");
  expect(body.ok).toBe(true);
});

test("dev admin proxy reaches the local backend", async ({
  request,
}) => {
  const response = await request.get("/api/admin/accounts?tier=invalid");

  expect(response.status()).toBe(400);
  expect(response.headers()["content-type"] || "").toContain("application/json");

  const raw = await response.text();
  expect(raw).not.toContain("Backend unavailable");
  expect(raw).not.toContain("89.167.51.48");
  expect(raw).not.toContain("127.0.0.1:5000");

  const body = JSON.parse(raw);
  expect(body.error).toContain("tier");
});
