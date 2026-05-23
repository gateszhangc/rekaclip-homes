import test from "node:test";
import assert from "node:assert/strict";
import { MODEL_PROVIDER_MISMATCH, normalizeImportedAccountProviderAndModel, } from "./account-pool.js";
test("defaults homepage short model IDs to OpenRouter when provider is omitted", () => {
    assert.deepEqual(normalizeImportedAccountProviderAndModel({
        model: "gpt-5-4",
    }), {
        provider: "openrouter",
        model: "openrouter/openai/gpt-5.4",
    });
    assert.deepEqual(normalizeImportedAccountProviderAndModel({
        model: "claude-opus-4-6",
    }), {
        provider: "openrouter",
        model: "openrouter/anthropic/claude-opus-4",
    });
    assert.deepEqual(normalizeImportedAccountProviderAndModel({
        model: "gemini-3-pro",
    }), {
        provider: "openrouter",
        model: "openrouter/google/gemini-3.1-pro-preview",
    });
});
test("normalizes legacy kie-codex GPT aliases to the canonical Kie GPT model", () => {
    assert.deepEqual(normalizeImportedAccountProviderAndModel({
        provider: "kie",
        model: "kie-codex/gpt-5-4",
    }), {
        provider: "kie",
        model: "kie-gpt/gpt-5-4",
    });
});
test("normalizes Gemini 3 Pro aliases to the Kie runtime model when provider is Kie", () => {
    assert.deepEqual(normalizeImportedAccountProviderAndModel({
        provider: "kie",
        model: "gemini-3-pro",
    }), {
        provider: "kie",
        model: "kie-gemini/gemini-3.1-pro",
    });
});
test("keeps GPT-5.4 under explicit OpenRouter routing when provider is OpenRouter", () => {
    assert.deepEqual(normalizeImportedAccountProviderAndModel({
        provider: "openrouter",
        model: "gpt-5-4",
    }), {
        provider: "openrouter",
        model: "openrouter/openai/gpt-5.4",
    });
});
test("keeps Claude Opus 4.6 under explicit Anthropic routing when provider is Anthropic", () => {
    assert.deepEqual(normalizeImportedAccountProviderAndModel({
        provider: "anthropic",
        model: "claude-opus-4-6",
    }), {
        provider: "anthropic",
        model: "anthropic/claude-opus-4-6",
    });
});
test("rejects Kie canonical models when provider is explicitly not kie", () => {
    assert.throws(() => normalizeImportedAccountProviderAndModel({
        provider: "openrouter",
        model: "kie-gemini/gemini-3.1-pro",
    }), new RegExp(MODEL_PROVIDER_MISMATCH));
});
test("rejects non-kie explicit model IDs when provider is kie", () => {
    assert.throws(() => normalizeImportedAccountProviderAndModel({
        provider: "kie",
        model: "openai/gpt-5.4",
    }), new RegExp(MODEL_PROVIDER_MISMATCH));
});
