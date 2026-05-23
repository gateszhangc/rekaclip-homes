import test from "node:test";
import assert from "node:assert/strict";
import { parseOpenClawChannelStatus } from "./docker.js";

test("parseOpenClawChannelStatus reads telegram status from channels wrapper", () => {
  const status = parseOpenClawChannelStatus(
    JSON.stringify({
      channels: {
        telegram: {
          running: true,
          lastError: null,
        },
      },
    }),
    "telegram"
  );

  assert.deepEqual(status, {
    running: true,
    lastError: null,
    messageContentIntent: null,
  });
});

test("parseOpenClawChannelStatus reads discord status from top-level payload", () => {
  const status = parseOpenClawChannelStatus(
    JSON.stringify({
      discord: {
        running: false,
        last_error: "bad token",
      },
    }),
    "discord"
  );

  assert.deepEqual(status, {
    running: false,
    lastError: "bad token",
    messageContentIntent: null,
  });
});

test("parseOpenClawChannelStatus reads discord message content intent from channel accounts", () => {
  const status = parseOpenClawChannelStatus(
    JSON.stringify({
      channels: {
        discord: {
          running: true,
          lastError: null,
        },
      },
      channelAccounts: {
        discord: [
          {
            application: {
              intents: {
                messageContent: "disabled",
              },
            },
          },
        ],
      },
    }),
    "discord"
  );

  assert.deepEqual(status, {
    running: true,
    lastError: null,
    messageContentIntent: "disabled",
  });
});

test("parseOpenClawChannelStatus fails when requested channel is missing", () => {
  assert.throws(
    () =>
      parseOpenClawChannelStatus(
        JSON.stringify({
          channels: {
            telegram: { running: true },
          },
        }),
        "discord"
      ),
    /missing discord channel/i
  );
});
