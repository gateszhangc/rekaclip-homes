import { expect, test } from "@playwright/test";

test("auth api routes stay healthy in dev", async ({ request }) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const sessionResponse = await request.get("/api/auth/session");

    expect(sessionResponse.status()).toBe(200);
    expect(sessionResponse.headers()["content-type"] || "").toContain(
      "application/json"
    );

    const sessionBody = await sessionResponse.text();
    expect(sessionBody).not.toContain("ENOENT");
    expect(sessionBody).not.toContain("app-paths-manifest.json");
  }

  const providersResponse = await request.get("/api/auth/providers");
  expect(providersResponse.status()).toBe(200);

  const providersBody = await providersResponse.text();
  expect(providersBody).not.toContain("ENOENT");
  expect(providersBody).not.toContain("app-paths-manifest.json");
});

test("auth signin endpoint redirects instead of crashing", async ({
  request,
}) => {
  const response = await request.get("/api/auth/signin", {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(302);
  expect(response.headers()["location"] || "").toContain("/auth/signin");

  const body = await response.text();
  expect(body).not.toContain("ENOENT");
  expect(body).not.toContain("app-paths-manifest.json");
});
