import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOpenClawVolumePrepScript,
  parseOpenClawVolumePrepLogs,
} from "./docker.js";

test("buildOpenClawVolumePrepScript writes the image build marker into the OpenClaw home volume", () => {
  const script = buildOpenClawVolumePrepScript();

  assert.match(script, /mkdir -p \/home\/node\/\.openclaw/);
  assert.match(script, /cat \/IMAGE_BUILD_DATE > \/home\/node\/\.openclaw\/\.last_image_update/);
  assert.match(script, /OPENCLAW_IMAGE_MARKER_WRITTEN=1/);
  assert.match(script, /chown -R node:node \/home\/node\/\.openclaw/);
});

test("parseOpenClawVolumePrepLogs detects a written marker", () => {
  assert.equal(
    parseOpenClawVolumePrepLogs("OPENCLAW_IMAGE_MARKER_WRITTEN=1"),
    "written"
  );
});

test("parseOpenClawVolumePrepLogs detects a missing IMAGE_BUILD_DATE fallback", () => {
  assert.equal(
    parseOpenClawVolumePrepLogs("OPENCLAW_IMAGE_MARKER_WRITTEN=0"),
    "missing"
  );
});

test("parseOpenClawVolumePrepLogs treats unrelated output as unknown", () => {
  assert.equal(parseOpenClawVolumePrepLogs("noop"), "unknown");
});
