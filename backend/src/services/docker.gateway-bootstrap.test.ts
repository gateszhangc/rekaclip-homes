import test from "node:test";
import assert from "node:assert/strict";
import { buildGatewayBootstrapConfigCommands } from "./docker.js";

test("buildGatewayBootstrapConfigCommands persists gateway mode and control UI fallbacks", () => {
  const commands = buildGatewayBootstrapConfigCommands("local");

  assert.deepEqual(commands, [
    ["config", "set", "gateway.mode", "local"],
    [
      "config",
      "set",
      "--strict-json",
      "gateway.controlUi.dangerouslyDisableDeviceAuth",
      "true",
    ],
    [
      "config",
      "set",
      "--strict-json",
      "gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback",
      "true",
    ],
  ]);
});
