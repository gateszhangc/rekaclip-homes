import { expect, test, type Page } from "@playwright/test";

function buildWhatsAppSvgDataUrl(label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21"><rect width="21" height="21" fill="#fff"/><text x="10.5" y="11.5" font-size="4" text-anchor="middle" fill="#000">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildWhatsAppLoginSnapshot({
  sessionId,
  status,
  plainOutput,
  qrLabel,
  updatedAt,
}: {
  sessionId: string;
  status: "waiting_qr" | "qr_ready" | "connected" | "failed" | "cancelled";
  plainOutput: string;
  qrLabel?: string;
  updatedAt: string;
}) {
  return {
    sessionId,
    status,
    message:
      status === "qr_ready"
        ? "First WhatsApp QR code ready."
        : status === "connected"
          ? "WhatsApp login connected."
          : "Waiting for the first WhatsApp QR code.",
    rawOutput: plainOutput,
    plainOutput,
    qrAscii: qrLabel ? qrLabel : null,
    qrSvgDataUrl: qrLabel ? buildWhatsAppSvgDataUrl(qrLabel) : null,
    qrUpdatedAt: qrLabel ? updatedAt : null,
    startedAt: "2026-04-09T12:00:00.000Z",
    updatedAt,
    finishedAt: status === "connected" ? updatedAt : null,
    exitCode: status === "connected" ? 0 : null,
    isTerminal: status === "connected" || status === "failed" || status === "cancelled",
  };
}

async function connectTelegramAndDeploy(page: Page, locale: "en" | "zh", token: string) {
  await page.getByRole("button", { name: /GPT-5\.4/i }).click();
  await page.getByRole("button", { name: /Telegram/i }).click();

  const telegramDialog = page.getByRole("dialog", { name: /Telegram/i });
  await telegramDialog
    .getByPlaceholder(/1234567890[:：]ABCdefGHIjklMNOpqrsTUVwxyz/)
    .fill(token);
  await telegramDialog
    .getByRole("button", { name: locale === "zh" ? /保存并连接/i : /Save & Connect/i })
    .click();
  await expect(telegramDialog).not.toBeVisible();

  await page
    .getByRole("button", { name: locale === "zh" ? /^部署$/i : /^Deploy$/i })
    .click();
}

async function connectWhatsAppAndDeploy(page: Page, locale: "en" | "zh") {
  await page.getByRole("button", { name: /GPT-5\.4/i }).click();
  await page.getByRole("button", { name: /WhatsApp/i }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: locale === "zh" ? /^部署$/i : /^Deploy$/i })
    .click();
}

test("homepage deploy flow keeps the GPT-5.4 short id and resolves it to the OpenRouter runtime model", async ({ page }) => {
  let deployRequestBody: Record<string, unknown> | null = null;

  await page.route("**/api/deploy", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    deployRequestBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          deployment_id: "test-deployment",
          status: "provisioning",
          requested_model: "gpt-5-4",
          resolved_model: null,
        },
      }),
    });
  });

  await page.route("**/api/deploy/test-deployment", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          status: "running",
          requested_model: "gpt-5-4",
          resolved_model: "openrouter/openai/gpt-5.4",
        },
      }),
    });
  });

  await page.goto("/en");

  const gpt54Card = page.getByRole("button", { name: /GPT-5\.4/i });
  await expect(gpt54Card).toBeVisible();
  await gpt54Card.click();
  await expect(gpt54Card).toContainText(/Selected/i);

  await page.getByRole("button", { name: /Telegram/i }).click();

  const telegramDialog = page.getByRole("dialog", { name: /Connect Telegram/i });
  await expect(telegramDialog).toBeVisible();
  await telegramDialog
    .getByPlaceholder("1234567890:ABCdefGHIjklMNOpqrsTUVwxyz")
    .fill("123456789:TESTTOKEN");
  await telegramDialog.getByRole("button", { name: /Save & Connect/i }).click();
  await expect(telegramDialog).not.toBeVisible();

  await page.getByRole("button", { name: /^Deploy$/i }).click();

  await expect
    .poll(() => deployRequestBody?.model)
    .toBe("gpt-5-4");
  await expect
    .poll(() => deployRequestBody?.channel)
    .toBe("telegram");
  await expect
    .poll(() => deployRequestBody?.channel_token)
    .toBe("123456789:TESTTOKEN");
  await expect
    .poll(() =>
      Object.prototype.hasOwnProperty.call(deployRequestBody || {}, "telegram_token")
    )
    .toBe(false);
  await expect(page.getByText(/Deployment successful!/i)).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(/Model substitution detected/i)).toHaveCount(0);
});

test("homepage deploy flow keeps the Claude Opus 4.6 short id and resolves it to the OpenRouter runtime model", async ({ page }) => {
  let deployRequestBody: Record<string, unknown> | null = null;

  await page.route("**/api/deploy", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    deployRequestBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          deployment_id: "discord-deployment",
          status: "provisioning",
          channel_type: "discord",
          requested_model: "claude-opus-4-6",
          resolved_model: null,
        },
      }),
    });
  });

  await page.route("**/api/deploy/discord-deployment", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          status: "running",
          channel_type: "discord",
          requested_model: "claude-opus-4-6",
          resolved_model: "openrouter/anthropic/claude-opus-4",
        },
      }),
    });
  });

  await page.goto("/en");

  const claudeCard = page.getByRole("button", { name: /Claude Opus 4\.6/i });
  await claudeCard.click();
  await expect(claudeCard).toContainText(/Selected/i);

  await page.getByRole("button", { name: /Discord/i }).click();

  const discordDialog = page.getByRole("dialog", { name: /Connect Discord/i });
  await expect(discordDialog).toBeVisible();
  await discordDialog
    .getByPlaceholder("MTExMTExMTExMTExMTExMTExMQ.GhIjKl.MNopQRSTuvWXyz0123456789abc")
    .fill("discord-bot-token");
  await discordDialog.getByRole("button", { name: /Save & Connect/i }).click();
  await expect(discordDialog).not.toBeVisible();

  await page.getByRole("button", { name: /^Deploy$/i }).click();

  await expect
    .poll(() => deployRequestBody?.channel)
    .toBe("discord");
  await expect
    .poll(() => deployRequestBody?.channel_token)
    .toBe("discord-bot-token");
  await expect
    .poll(() => deployRequestBody?.model)
    .toBe("claude-opus-4-6");
  await expect(page.getByText(/Deployment successful!/i)).toBeVisible({
    timeout: 10_000,
  });
});

test("homepage whatsapp deploy flow only refreshes on demand and treats connected as the final second-stage state", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const recorder = {
      lastOpenUrl: null as string | null,
    };
    Object.defineProperty(window, "__dashboardRecorder", {
      value: recorder,
      configurable: true,
    });
    window.open = ((url?: string | URL) => {
      recorder.lastOpenUrl = typeof url === "string" ? url : url?.toString() ?? null;
      return null;
    }) as typeof window.open;
  });

  let deployRequestBody: Record<string, unknown> | null = null;
  let statusPollCount = 0;
  let currentRequestCount = 0;
  let activateRequestCount = 0;
  let dashboardCurrentRequestCount = 0;
  const firstOutput = [
    "Preparing WhatsApp linked-device login...",
    "Scan this QR in WhatsApp (Linked Devices):",
    "QR-ONE",
  ].join("\n");
  const secondOutput = [
    "Preparing WhatsApp linked-device login...",
    "Scan this QR in WhatsApp (Linked Devices):",
    "QR-TWO",
  ].join("\n");
  const firstSnapshot = buildWhatsAppLoginSnapshot({
    sessionId: "session-1",
    status: "qr_ready",
    plainOutput: firstOutput,
    qrLabel: "QR-ONE",
    updatedAt: "2026-04-09T12:00:01.000Z",
  });
  const secondSnapshot = buildWhatsAppLoginSnapshot({
    sessionId: "session-1",
    status: "connected",
    plainOutput: secondOutput,
    qrLabel: "QR-TWO",
    updatedAt: "2026-04-09T12:00:05.000Z",
  });
  const dashboardSnapshot = {
    sessionId: "dashboard-1",
    status: "ready",
    localPort: 39123,
    dashboardUrl:
      "http://127.0.0.1:3001/_openclaw-dashboard/whatsapp-deployment/control-ui/#token=codexwa-86add9d981",
    maskedDashboardUrl:
      "http://127.0.0.1:3001/_openclaw-dashboard/whatsapp-deployment/control-ui/#token=code...d981",
    startedAt: "2026-04-09T12:00:00.000Z",
    updatedAt: "2026-04-09T12:00:05.000Z",
    lastError: null,
    logs: [
      {
        id: "log-1",
        level: "info",
        message: "Gateway Dashboard is ready.",
        at: "2026-04-09T12:00:05.000Z",
      },
    ],
    target: {
      namespace: "rekaclip-openclaw",
      deployment: "openclaw-whatsapp-deployment",
      pod: "openclaw-whatsapp-deployment-abc",
      container: "openclaw",
      gatewayPort: 18789,
    },
  };

  await page.route("**/api/deploy", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    deployRequestBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          deployment_id: "whatsapp-deployment",
          status: "provisioning",
          channel_type: "whatsapp",
          requested_model: "gpt-5-4",
          resolved_model: null,
        },
      }),
    });
  });

  await page.route(
    "**/api/deploy/whatsapp-deployment/whatsapp-login/start",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          code: 0,
          data: firstSnapshot,
        }),
      });
    }
  );

  await page.route(
    "**/api/deploy/whatsapp-deployment/whatsapp-login/current",
    async (route) => {
      currentRequestCount += 1;
      if (currentRequestCount === 1) {
        await route.fulfill({
          status: 204,
          body: "",
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          code: 0,
          data: secondSnapshot,
        }),
      });
    }
  );

  await page.route(
    "**/api/deploy/whatsapp-deployment/openclaw-dashboard/current",
    async (route) => {
      dashboardCurrentRequestCount += 1;
      await route.fulfill({
        status: 204,
        body: "",
      });
    }
  );

  await page.route(
    "**/api/deploy/whatsapp-deployment/openclaw-dashboard/start",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          code: 0,
          data: dashboardSnapshot,
        }),
      });
    }
  );

  await page.route(
    "**/api/deploy/whatsapp-deployment/openclaw-dashboard/stop",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          code: 0,
          data: { ok: true },
        }),
      });
    }
  );

  await page.route(
    "**/api/deploy/whatsapp-deployment/whatsapp-login/activate",
    async (route) => {
      activateRequestCount += 1;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          code: -1,
          message: "activate should not be called",
        }),
      });
    }
  );

  await page.route("**/api/deploy/whatsapp-deployment", async (route) => {
    statusPollCount += 1;

    if (statusPollCount < 2) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          code: 0,
          data: {
            status: "provisioning",
            channel_type: "whatsapp",
            requested_model: "gpt-5-4",
            resolved_model: null,
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          status: "running",
          channel_type: "whatsapp",
          requested_model: "gpt-5-4",
          resolved_model: "openrouter/openai/gpt-5.4",
        },
      }),
    });
  });

  await page.goto("/en");
  await connectWhatsAppAndDeploy(page, "en");

  await expect
    .poll(() => deployRequestBody?.channel)
    .toBe("whatsapp");
  await expect
    .poll(() =>
      Object.prototype.hasOwnProperty.call(deployRequestBody || {}, "channel_token")
    )
    .toBe(false);

  await expect(
    page.getByRole("button", { name: /^Deploying...$/i })
  ).toBeVisible();
  await expect(page.getByTestId("whatsapp-login-panel")).toHaveCount(0);
  await expect(page.getByText(/Deployment successful!/i)).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId("whatsapp-login-panel")).toBeVisible();
  await expect(page.getByTestId("whatsapp-start-button")).toBeVisible();
  await expect(page.getByTestId("whatsapp-retry-button")).toBeVisible();
  await expect(page.getByTestId("whatsapp-refresh-button")).toBeVisible();
  await expect(page.getByTestId("whatsapp-cancel-button")).toBeVisible();
  await expect(page.getByTestId("whatsapp-activate-button")).toHaveCount(0);
  await expect(page.getByTestId("whatsapp-dashboard-panel")).toBeVisible();
  await expect(page.getByTestId("whatsapp-dashboard-start-button")).toBeVisible();
  await expect(page.getByTestId("whatsapp-dashboard-open-button")).toBeVisible();
  await expect(page.getByTestId("whatsapp-dashboard-copy-button")).toBeVisible();
  await expect(page.getByTestId("whatsapp-dashboard-stop-button")).toBeVisible();
  expect(dashboardCurrentRequestCount).toBe(1);

  await page.getByTestId("whatsapp-start-button").click();
  await expect(page.getByTestId("whatsapp-status-badge")).toHaveText("qr_ready");
  await expect(page.getByTestId("whatsapp-qr-image")).toBeVisible();
  await expect(page.getByTestId("whatsapp-output")).toContainText("QR-ONE");
  await expect(page.getByTestId("whatsapp-status-badge")).not.toHaveText("connected");

  await page.waitForTimeout(3_500);
  expect(currentRequestCount).toBe(1);
  expect(activateRequestCount).toBe(0);
  await expect(page.getByTestId("whatsapp-status-badge")).toHaveText("qr_ready");

  await page.getByTestId("whatsapp-refresh-button").click();
  await expect(page.getByTestId("whatsapp-status-badge")).toHaveText("connected");
  await expect(page.getByTestId("whatsapp-output")).toContainText("QR-TWO");
  expect(currentRequestCount).toBe(2);
  expect(activateRequestCount).toBe(0);

  await page.getByTestId("whatsapp-dashboard-start-button").click();
  await expect(page.getByTestId("whatsapp-dashboard-status-badge")).toHaveText(
    "ready"
  );
  await expect(page.getByTestId("whatsapp-dashboard-masked-url")).toContainText(
    "code...d981"
  );
  await page.getByTestId("whatsapp-dashboard-open-button").click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        return (window as typeof window & {
          __dashboardRecorder?: { lastOpenUrl: string | null };
        }).__dashboardRecorder?.lastOpenUrl;
      })
    )
    .toBe(
      "http://127.0.0.1:3001/_openclaw-dashboard/whatsapp-deployment/control-ui/#token=codexwa-86add9d981"
    );
});

test("homepage whatsapp deploy flow falls back to English post-deploy connect copy on the Chinese page", async ({
  page,
}) => {
  const output = [
    "Preparing WhatsApp linked-device login...",
    "Scan this QR in WhatsApp (Linked Devices):",
    "QR-ZH",
  ].join("\n");
  const zhSnapshot = buildWhatsAppLoginSnapshot({
    sessionId: "session-zh",
    status: "qr_ready",
    plainOutput: output,
    qrLabel: "QR-ZH",
    updatedAt: "2026-04-09T12:00:01.000Z",
  });

  await page.route("**/api/deploy", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          deployment_id: "whatsapp-zh-deployment",
          status: "provisioning",
          channel_type: "whatsapp",
          requested_model: "gpt-5-4",
          resolved_model: null,
        },
      }),
    });
  });

  await page.route("**/api/deploy/whatsapp-zh-deployment", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          status: "running",
          channel_type: "whatsapp",
          requested_model: "gpt-5-4",
          resolved_model: "openrouter/openai/gpt-5.4",
        },
      }),
    });
  });

  await page.route(
    "**/api/deploy/whatsapp-zh-deployment/whatsapp-login/current",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          code: 0,
          data: zhSnapshot,
        }),
      });
    }
  );

  await page.route(
    "**/api/deploy/whatsapp-zh-deployment/openclaw-dashboard/current",
    async (route) => {
      await route.fulfill({
        status: 204,
        body: "",
      });
    }
  );

  await page.goto("/zh");
  await connectWhatsAppAndDeploy(page, "zh");

  await expect(page.getByText(/Connect WhatsApp/)).toBeVisible();
  await expect(page.getByTestId("whatsapp-start-button")).toContainText(
    "Start QR login"
  );
  await expect(page.getByTestId("whatsapp-refresh-button")).toContainText(
    "Refresh result"
  );
  await expect(page.getByTestId("whatsapp-restore-notice")).toContainText(
    "This page does not auto-refresh."
  );
  await expect(page.getByTestId("whatsapp-output")).toContainText("QR-ZH");
  await expect(page.getByText(/Deploy first, then connect WhatsApp\./)).toBeVisible();
  await expect(page.getByText(/Gateway Dashboard fallback/)).toBeVisible();
});

test("discord connect dialog describes server channel replies instead of DM-only replies", async ({
  page,
}) => {
  await page.goto("/en");

  await page.getByRole("button", { name: /Discord/i }).click();

  const discordDialog = page.getByRole("dialog", { name: /Connect Discord/i });
  await expect(discordDialog).toBeVisible();
  await expect(
    discordDialog.getByText(/Invite it to your server/i)
  ).toBeVisible();
  await expect(
    discordDialog.getByText(/reply in your channels/i)
  ).toBeVisible();
  await expect(discordDialog.getByText(/Discord DM/i)).toHaveCount(0);
});

test("homepage deploy flow surfaces Discord message content intent errors", async ({
  page,
}) => {
  await page.route("**/api/deploy", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          deployment_id: "discord-intent-error-deployment",
          status: "provisioning",
          channel_type: "discord",
          requested_model: "claude-opus-4-6",
          resolved_model: null,
        },
      }),
    });
  });

  await page.route("**/api/deploy/discord-intent-error-deployment", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          status: "failed",
          channel_type: "discord",
          error_code: "DISCORD_MESSAGE_CONTENT_INTENT_DISABLED",
          error_message:
            "DISCORD_MESSAGE_CONTENT_INTENT_DISABLED: Discord Message Content Intent is disabled.",
        },
      }),
    });
  });

  await page.goto("/en");

  const claudeCard = page.getByRole("button", { name: /Claude Opus 4\.6/i });
  await claudeCard.click();
  await page.getByRole("button", { name: /Discord/i }).click();

  const discordDialog = page.getByRole("dialog", { name: /Connect Discord/i });
  await discordDialog
    .getByPlaceholder("MTExMTExMTExMTExMTExMTExMQ.GhIjKl.MNopQRSTuvWXyz0123456789abc")
    .fill("discord-bot-token");
  await discordDialog.getByRole("button", { name: /Save & Connect/i }).click();
  await expect(discordDialog).not.toBeVisible();

  await page.getByRole("button", { name: /^Deploy$/i }).click();

  await expect(
    page.getByText(/Message Content Intent is disabled/i)
  ).toBeVisible({ timeout: 10_000 });
});

test("homepage deploy flow shows Gemini 3.1 Pro while keeping the short id and resolving to the OpenRouter runtime model", async ({
  page,
}) => {
  let deployRequestBody: Record<string, unknown> | null = null;

  await page.route("**/api/deploy", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    deployRequestBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          deployment_id: "gemini-deployment",
          status: "provisioning",
          requested_model: "gemini-3-pro",
          resolved_model: null,
        },
      }),
    });
  });

  await page.route("**/api/deploy/gemini-deployment", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          status: "running",
          requested_model: "gemini-3-pro",
          resolved_model: "openrouter/google/gemini-3.1-pro-preview",
        },
      }),
    });
  });

  await page.goto("/en");

  const geminiCard = page.getByRole("button", { name: /Gemini 3\.1 Pro/i });
  await expect(geminiCard).toBeVisible();
  await geminiCard.click();
  await expect(geminiCard).toContainText(/Selected/i);

  await page.getByRole("button", { name: /Telegram/i }).click();

  const telegramDialog = page.getByRole("dialog", { name: /Connect Telegram/i });
  await expect(telegramDialog).toBeVisible();
  await telegramDialog
    .getByPlaceholder("1234567890:ABCdefGHIjklMNOpqrsTUVwxyz")
    .fill("123456789:GEMINITOKEN");
  await telegramDialog.getByRole("button", { name: /Save & Connect/i }).click();
  await expect(telegramDialog).not.toBeVisible();

  await page.getByRole("button", { name: /^Deploy$/i }).click();

  await expect.poll(() => deployRequestBody?.model).toBe("gemini-3-pro");
  await expect(page.getByText(/Deployment successful!/i)).toBeVisible();
});

test("homepage deploy button ignores rapid double clicks while request is in flight", async ({
  page,
}) => {
  let deployRequestCount = 0;

  await page.route("**/api/deploy", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    deployRequestCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          deployment_id: "double-click-deployment",
          status: "provisioning",
          requested_model: "gpt-5-4",
          resolved_model: null,
        },
      }),
    });
  });

  await page.route("**/api/deploy/double-click-deployment", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          status: "running",
          requested_model: "gpt-5-4",
          resolved_model: "openrouter/openai/gpt-5.4",
        },
      }),
    });
  });

  await page.goto("/en");

  await page.getByRole("button", { name: /GPT-5\.4/i }).click();
  await page.getByRole("button", { name: /Telegram/i }).click();

  const telegramDialog = page.getByRole("dialog", { name: /Connect Telegram/i });
  await telegramDialog
    .getByPlaceholder("1234567890:ABCdefGHIjklMNOpqrsTUVwxyz")
    .fill("123456789:DOUBLECLICKTOKEN");
  await telegramDialog.getByRole("button", { name: /Save & Connect/i }).click();

  const deployButton = page.getByRole("button", { name: /^Deploy$/i });
  await deployButton.evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });

  await expect.poll(() => deployRequestCount).toBe(1);
  await expect(page.getByText(/Deployment successful!/i)).toBeVisible();
});

test("homepage deploy flow redirects to pricing when the backend requires a subscription", async ({
  page,
}) => {
  let deployRequestCount = 0;

  await page.route("**/api/deploy", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    deployRequestCount += 1;
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        code: -1,
        message: "SUBSCRIPTION_REQUIRED",
        error_code: "SUBSCRIPTION_REQUIRED",
        errorCode: "SUBSCRIPTION_REQUIRED",
      }),
    });
  });

  await page.goto("/en");

  await page.getByRole("button", { name: /GPT-5\.4/i }).click();
  await page.getByRole("button", { name: /Telegram/i }).click();

  const telegramDialog = page.getByRole("dialog", { name: /Connect Telegram/i });
  await telegramDialog
    .getByPlaceholder("1234567890:ABCdefGHIjklMNOpqrsTUVwxyz")
    .fill("123456789:PRICINGTOKEN");
  await telegramDialog.getByRole("button", { name: /Save & Connect/i }).click();

  await page.getByRole("button", { name: /^Deploy$/i }).click();

  await expect.poll(() => deployRequestCount).toBe(1);
  await expect(
    page.getByRole("heading", { name: /^Pricing$/i })
  ).toBeVisible({ timeout: 20_000 });
});

test("homepage deploy flow shows a non-retryable error when no target node is available", async ({
  page,
}) => {
  let deployRequestCount = 0;

  await page.route("**/api/deploy", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    deployRequestCount += 1;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        code: -1,
        message: "No available node right now. Please try again later.",
        error_code: "NO_AVAILABLE_NODE",
        errorCode: "NO_AVAILABLE_NODE",
      }),
    });
  });

  await page.goto("/en");
  await connectTelegramAndDeploy(page, "en", "123456789:NODEPOOLTOKEN");

  await expect.poll(() => deployRequestCount).toBe(1);
  await expect(
    page.getByText("No available node right now. Please try again later.")
  ).toBeVisible();
  await expect(page).toHaveURL(/\/en$/);
});

test("homepage deploy flow shows a Kie-specific error when the Kie account pool is empty", async ({
  page,
}) => {
  await page.route("**/api/deploy", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          deployment_id: "kie-empty-deployment",
          status: "provisioning",
          requested_model: "gpt-5-4",
          resolved_model: null,
        },
      }),
    });
  });

  await page.route("**/api/deploy/kie-empty-deployment", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          status: "failed",
          requested_model: "gpt-5-4",
          resolved_model: null,
          error_message:
            "NO_AVAILABLE_ACCOUNT_FOR_PROVIDER: tier=starter, provider=kie, model=gpt-5-4",
          error_code: "NO_AVAILABLE_ACCOUNT_FOR_PROVIDER",
          errorCode: "NO_AVAILABLE_ACCOUNT_FOR_PROVIDER",
        },
      }),
    });
  });

  await page.goto("/en");
  await connectTelegramAndDeploy(page, "en", "123456789:KIEEMPTYTOKEN");

  await expect(
    page.getByText(
      "No Kie account is available right now. Please ask the admin to import a Kie account."
    )
  ).toBeVisible();
});

test("homepage deploy flow recovers from transient poll transport errors and eventually succeeds", async ({
  page,
}) => {
  let pollAttempts = 0;

  await page.route("**/api/deploy", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          deployment_id: "recovering-deployment",
          status: "provisioning",
          requested_model: "gpt-5-4",
          resolved_model: null,
        },
      }),
    });
  });

  await page.route("**/api/deploy/recovering-deployment", async (route) => {
    pollAttempts += 1;

    if (pollAttempts < 3) {
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({
          code: -1,
          message:
            "request to https://86.48.5.165:6443 failed, reason: Client network socket disconnected before secure TLS connection was established",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          status: "running",
          requested_model: "gpt-5-4",
          resolved_model: "openrouter/openai/gpt-5.4",
        },
      }),
    });
  });

  await page.goto("/en");
  await connectTelegramAndDeploy(page, "en", "123456789:RECOVERPOLL");

  await expect(page.getByText(/Deployment successful!/i)).toBeVisible({
    timeout: 10_000,
  });
  await expect.poll(() => pollAttempts).toBe(3);
  await expect(
    page.getByText("Network is unstable. Please try again shortly.")
  ).toHaveCount(0);
});

test("homepage deploy flow localizes network unstable errors on the English page", async ({
  page,
}) => {
  await page.route("**/api/deploy", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        code: -1,
        message: "NETWORK_UNSTABLE",
        error_code: "NETWORK_UNSTABLE",
        errorCode: "NETWORK_UNSTABLE",
      }),
    });
  });

  await page.goto("/en");
  await connectTelegramAndDeploy(page, "en", "123456789:NETWORKEN");

  await expect(
    page.getByText("Network is unstable. Please try again shortly.")
  ).toBeVisible();
});

test("homepage deploy flow localizes network unstable errors on the Chinese page", async ({
  page,
}) => {
  await page.route("**/api/deploy", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        code: -1,
        message: "NETWORK_UNSTABLE",
        error_code: "NETWORK_UNSTABLE",
        errorCode: "NETWORK_UNSTABLE",
      }),
    });
  });

  await page.goto("/zh");
  await connectTelegramAndDeploy(page, "zh", "123456789:NETWORKZH");

  await expect(page.getByText("网络不稳定。请稍后重试。")).toBeVisible();
});

test("homepage deploy flow localizes no-available-node errors on the Chinese page", async ({
  page,
}) => {
  await page.route("**/api/deploy", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        code: -1,
        message: "No available node right now. Please try again later.",
        error_code: "NO_AVAILABLE_NODE",
        errorCode: "NO_AVAILABLE_NODE",
      }),
    });
  });

  await page.goto("/zh");
  await connectTelegramAndDeploy(page, "zh", "123456789:NODEPOOLZH");

  await expect(page.getByText("当前没有可用节点。请稍后重试。")).toBeVisible();
  await expect(page).toHaveURL(/\/zh$/);
});
