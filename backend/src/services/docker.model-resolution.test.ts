import test from "node:test";
import assert from "node:assert/strict";
import {
  assertModelProviderConsistency,
  buildProviderBootstrapConfigCommands,
  getModelAuthProviderId,
  inferRequiredProvider,
  resolveModelFromRuntimeCatalog,
  resolveOpenClawModel,
  setOpenClawHomepageProviderModeOverride,
} from "./docker.js";

const withHomepageProviderMode = async (
  mode: string | undefined,
  fn: () => void | Promise<void>
): Promise<void> => {
  const previousMode = process.env.OPENCLAW_HOMEPAGE_PROVIDER_MODE;
  setOpenClawHomepageProviderModeOverride(null);

  if (mode === undefined) {
    delete process.env.OPENCLAW_HOMEPAGE_PROVIDER_MODE;
  } else {
    process.env.OPENCLAW_HOMEPAGE_PROVIDER_MODE = mode;
  }

  try {
    await fn();
  } finally {
    setOpenClawHomepageProviderModeOverride(null);
    if (previousMode === undefined) {
      delete process.env.OPENCLAW_HOMEPAGE_PROVIDER_MODE;
    } else {
      process.env.OPENCLAW_HOMEPAGE_PROVIDER_MODE = previousMode;
    }
  }
};

test("gemini-3-pro strict family: do not fallback to gemini-1.5", () => {
  const requested = "openrouter/google/gemini-3.1-pro-preview";
  const catalog = ["openrouter/google/gemini-1.5-pro"];

  const resolved = resolveModelFromRuntimeCatalog(requested, catalog);
  assert.equal(resolved, null);
});

test("gemini-3-pro strict family: allow preview variant within same family", () => {
  const requested = "openrouter/google/gemini-3-pro";
  const catalog = ["openrouter/google/gemini-3.1-pro-preview"];

  const resolved = resolveModelFromRuntimeCatalog(requested, catalog);
  assert.equal(resolved, "openrouter/google/gemini-3.1-pro-preview");
});

test("non-strict models can still use single-candidate fallback", () => {
  const requested = "openrouter/openai/gpt-5.2";
  const catalog = ["openrouter/openai/gpt-5.2-codex"];

  const resolved = resolveModelFromRuntimeCatalog(requested, catalog);
  assert.equal(resolved, "openrouter/openai/gpt-5.2-codex");
});

test("homepage GPT-5.4 aliases default to Kie models when env is unset (mixed)", () => {
  return withHomepageProviderMode(undefined, () => {
    assert.equal(resolveOpenClawModel("gpt-5-4", "kie"), "kie-gpt/gpt-5-4");
    assert.equal(inferRequiredProvider("gpt-5-4"), "kie");
  });
});

test("homepage GPT-5.4 aliases map to OpenRouter when mode is openrouter", () => {
  return withHomepageProviderMode("openrouter", () => {
    assert.equal(
      resolveOpenClawModel("gpt-5-4", "openrouter"),
      "openrouter/openai/gpt-5.4"
    );
    assert.equal(inferRequiredProvider("gpt-5-4"), "openrouter");
  });
});

test("homepage GPT-5.4 aliases still resolve to Kie when provider is explicitly Kie", () => {
  return withHomepageProviderMode(undefined, () => {
    assert.equal(
      resolveOpenClawModel("gpt-5-4", "kie"),
      "kie-gpt/gpt-5-4"
    );
  });
});

test("legacy kie-codex GPT aliases still resolve to the canonical Kie GPT model", () => {
  assert.equal(
    resolveOpenClawModel("kie-codex/gpt-5-4", "kie"),
    "kie-gpt/gpt-5-4"
  );
});

test("gpt-5.4 can use single-candidate fallback from runtime catalog", () => {
  const requested = "openrouter/openai/gpt-5.4";
  const catalog = ["openrouter/openai/gpt-5.4-codex"];

  const resolved = resolveModelFromRuntimeCatalog(requested, catalog);
  assert.equal(resolved, "openrouter/openai/gpt-5.4-codex");
});

test("homepage Gemini 3 Pro aliases default to Kie when env is unset (mixed)", () => {
  return withHomepageProviderMode(undefined, () => {
    assert.equal(
      resolveOpenClawModel("gemini-3-pro", "kie"),
      "kie-gemini/gemini-3.1-pro"
    );
    assert.equal(inferRequiredProvider("gemini-3-pro"), "kie");
  });
});

test("explicit OpenRouter model IDs are preserved when OpenRouter is requested", () => {
  assert.equal(
    resolveOpenClawModel(
      "openai/gpt-5.4",
      "openrouter"
    ),
    "openrouter/openai/gpt-5.4"
  );
  assert.equal(
    resolveOpenClawModel(
      "google/gemini-3-pro-preview",
      "openrouter"
    ),
    "openrouter/google/gemini-3.1-pro-preview"
  );
  assert.equal(
    inferRequiredProvider("google/gemini-3-pro-preview"),
    "openrouter"
  );
});

test("homepage Claude Opus 4.6 aliases default to Kie when env is unset (mixed)", () => {
  return withHomepageProviderMode(undefined, () => {
    assert.equal(
      resolveOpenClawModel("claude-opus-4-6", "kie"),
      "kie-claude/claude-opus-4-6"
    );
    assert.equal(
      resolveOpenClawModel("claude-opus-4.6", "kie"),
      "kie-claude/claude-opus-4-6"
    );
    assert.equal(inferRequiredProvider("claude-opus-4-6"), "kie");
  });
});

test("homepage aliases switch Claude and Gemini to OpenRouter when mode is openrouter", () => {
  return withHomepageProviderMode("openrouter", () => {
    assert.equal(
      resolveOpenClawModel("gpt-5-4", "openrouter"),
      "openrouter/openai/gpt-5.4"
    );
    assert.equal(
      resolveOpenClawModel("claude-opus-4-6", "openrouter"),
      "openrouter/anthropic/claude-opus-4"
    );
    assert.equal(
      resolveOpenClawModel("gemini-3-pro", "openrouter"),
      "openrouter/google/gemini-3.1-pro-preview"
    );
    assert.equal(inferRequiredProvider("gpt-5-4"), "openrouter");
    assert.equal(inferRequiredProvider("claude-opus-4-6"), "openrouter");
    assert.equal(inferRequiredProvider("gemini-3-pro"), "openrouter");
  });
});

test("explicit provider-qualified models stay stable across homepage provider modes", () => {
  return withHomepageProviderMode("openrouter", () => {
    assert.equal(
      resolveOpenClawModel(
        "kie-claude/claude-opus-4-6",
        "kie"
      ),
      "kie-claude/claude-opus-4-6"
    );
    assert.equal(
      resolveOpenClawModel(
        "openrouter/anthropic/claude-opus-4-6",
        "openrouter"
      ),
      "openrouter/anthropic/claude-opus-4"
    );
    assert.equal(
      resolveOpenClawModel(
        "openrouter/google/gemini-3.1-pro-preview",
        "openrouter"
      ),
      "openrouter/google/gemini-3.1-pro-preview"
    );
    assert.equal(inferRequiredProvider("kie-claude/claude-opus-4-6"), "kie");
    assert.equal(
      inferRequiredProvider("openrouter/anthropic/claude-opus-4-6"),
      "openrouter"
    );
  });
});

test("explicit Kie homepage models reject non-kie providers before container creation", () => {
  assert.throws(
    () =>
      assertModelProviderConsistency(
        resolveOpenClawModel("kie-gpt/gpt-5-4", "kie"),
        "openrouter"
      ),
    /MODEL_PROVIDER_MISMATCH/
  );
});

test("custom Kie providers are bootstrapped through OpenClaw config", () => {
  const commands = buildProviderBootstrapConfigCommands("kie");
  const providers = JSON.parse(commands[1]?.[4] || "{}") as Record<
    string,
    { models?: Array<{ id: string; name: string }> }
  >;

  assert.equal(commands.length, 2);
  assert.deepEqual(commands[0], ["config", "set", "models.mode", "merge"]);
  assert.match(commands[1]?.[4] || "", /"kie-gpt"/);
  assert.match(commands[1]?.[4] || "", /"kie-claude"/);
  assert.match(commands[1]?.[4] || "", /"kie-gemini"/);
  assert.match(commands[1]?.[4] || "", /\$\{KIE_API_KEY\}/);
  assert.deepEqual(providers["kie-gpt"]?.models, [
    { id: "gpt-5-4", name: "GPT-5.4 (Kie)" },
  ]);
  assert.deepEqual(providers["kie-claude"]?.models, [
    { id: "claude-opus-4-6", name: "Claude Opus 4.6 (Kie)" },
  ]);
  assert.deepEqual(providers["kie-gemini"]?.models, [
    { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro (Kie)" },
  ]);
});

test("runtime auth validation targets Kie and OpenRouter providers only when needed", () => {
  assert.equal(getModelAuthProviderId("kie-gpt/gpt-5-4"), "kie-gpt");
  assert.equal(getModelAuthProviderId("kie-claude/claude-opus-4-6"), "kie-claude");
  assert.equal(getModelAuthProviderId("kie-gemini/gemini-3.1-pro"), "kie-gemini");
  assert.equal(
    getModelAuthProviderId("openrouter/openai/gpt-5.4"),
    "openrouter"
  );
  assert.equal(getModelAuthProviderId("anthropic/claude-opus-4-6"), undefined);
});
