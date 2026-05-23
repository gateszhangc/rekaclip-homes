import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveOpenClawK8sNamespace,
  resolveOpenClawRuntimeProvider,
} from "./runtime-provider.js";

test("resolveOpenClawRuntimeProvider defaults to k8s", () => {
  const previous = process.env.OPENCLAW_RUNTIME_PROVIDER;
  delete process.env.OPENCLAW_RUNTIME_PROVIDER;

  try {
    assert.equal(resolveOpenClawRuntimeProvider(), "k8s");
  } finally {
    if (previous === undefined) {
      delete process.env.OPENCLAW_RUNTIME_PROVIDER;
    } else {
      process.env.OPENCLAW_RUNTIME_PROVIDER = previous;
    }
  }
});

test("resolveOpenClawRuntimeProvider accepts docker override", () => {
  const previous = process.env.OPENCLAW_RUNTIME_PROVIDER;
  process.env.OPENCLAW_RUNTIME_PROVIDER = "docker";

  try {
    assert.equal(resolveOpenClawRuntimeProvider(), "docker");
  } finally {
    if (previous === undefined) {
      delete process.env.OPENCLAW_RUNTIME_PROVIDER;
    } else {
      process.env.OPENCLAW_RUNTIME_PROVIDER = previous;
    }
  }
});

test("resolveOpenClawK8sNamespace defaults to easyclaw-openclaw", () => {
  const previous = process.env.OPENCLAW_K8S_NAMESPACE;
  delete process.env.OPENCLAW_K8S_NAMESPACE;

  try {
    assert.equal(resolveOpenClawK8sNamespace(), "easyclaw-openclaw");
  } finally {
    if (previous === undefined) {
      delete process.env.OPENCLAW_K8S_NAMESPACE;
    } else {
      process.env.OPENCLAW_K8S_NAMESPACE = previous;
    }
  }
});
