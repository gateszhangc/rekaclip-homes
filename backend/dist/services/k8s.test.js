import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { buildOpenClawK8sCliCommand, buildOpenClawK8sConfigFingerprint, buildOpenClawK8sVolumePrepScript, buildOpenClawK8sDeploymentManifest, buildOpenClawK8sHostname, buildKieModelPreflightRequest, buildOpenClawKieConfigJson, buildRenderedOpenClawConfigForK8s, buildOpenClawWorkspaceMemorySeedScript, buildOpenClawK8sLabels, buildOpenClawK8sSecretManifest, classifyKiePreflightHttpFailure, configureOpenClawInPod, extractKieAssistantText, isOpenClawHealthReadyForChannel, isRetryableK8sTransportError, loadOpenClawKubeConfig, parseKieCreditBalance, performKiePodLocalCreditCheck, performKiePodLocalPreflight, performKieLivePreflight, restartOpenClawGatewayInPod, runKieLivePreflightIfNeeded, resolveOpenClawK8sAutoUpdateForOpenRouter, resolveKieRuntimeModelForK8s, isWhatsAppRuntimeReadyFromLogs, waitForOpenClawReady, WHATSAPP_SESSION_UNAUTHORIZED_ERROR_CODE, withRetryableK8sControlPlaneCall, } from "./k8s.js";
import { buildKieGatewaySmokeArgs, KIE_CLAUDE_AUTH_PROXY_BASE_URL, KIE_CLAUDE_AUTH_PROXY_PORT, } from "./openclaw/kie-claude-auth-proxy.js";
const createSuccessfulExecMock = (commands) => ({
    exec: {
        async exec(_namespace, _podName, _containerName, cmd, stdout, _stderr, _stdin, _tty, statusCallback) {
            commands.push(cmd);
            const ws = new EventEmitter();
            ws.close = () => {
                ws.emit("close");
            };
            setImmediate(() => {
                if (cmd[0] === "env" &&
                    cmd[1] === "HOME=/home/node" &&
                    cmd[2] === "openclaw" &&
                    cmd[3] === "models" &&
                    cmd[4] === "status" &&
                    cmd[5] === "--json") {
                    stdout.write(JSON.stringify({
                        resolvedDefault: "openai/gpt-4.1",
                        auth: { providers: [] },
                    }));
                }
                statusCallback({ status: "Success" });
                ws.emit("close");
            });
            return ws;
        },
    },
});
const createPodExecMock = (commands, handlers) => ({
    exec: {
        async exec(_namespace, _podName, _containerName, cmd, stdout, stderr, _stdin, _tty, statusCallback) {
            commands.push(cmd);
            const ws = new EventEmitter();
            ws.close = () => {
                ws.emit("close");
            };
            setImmediate(() => {
                const key = cmd.join(" ");
                const result = handlers[key]?.();
                if (result?.stdout) {
                    stdout.write(result.stdout);
                }
                if (result?.stderr) {
                    stderr.write(result.stderr);
                }
                statusCallback({ status: "Success" });
                ws.emit("close");
            });
            return ws;
        },
    },
});
const createRunningPodCoreMock = (logs = "") => ({
    async readNamespacedPod() {
        return {
            status: {
                phase: "Running",
                containerStatuses: [{ state: { running: { startedAt: new Date() } } }],
            },
        };
    },
    async readNamespacedPodLog() {
        return logs;
    },
});
test("resolveOpenClawK8sAutoUpdateForOpenRouter defaults to false", () => {
    const previous = process.env.OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER;
    delete process.env.OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER;
    try {
        assert.equal(resolveOpenClawK8sAutoUpdateForOpenRouter(), false);
    }
    finally {
        if (previous === undefined) {
            delete process.env.OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER;
        }
        else {
            process.env.OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER = previous;
        }
    }
});
test("resolveOpenClawK8sAutoUpdateForOpenRouter only enables K8s auto-update when explicitly true", () => {
    const previousK8s = process.env.OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER;
    const previousShared = process.env.OPENCLAW_AUTO_UPDATE_FOR_OPENROUTER;
    process.env.OPENCLAW_AUTO_UPDATE_FOR_OPENROUTER = "true";
    delete process.env.OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER;
    try {
        assert.equal(resolveOpenClawK8sAutoUpdateForOpenRouter(), false);
        process.env.OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER = "true";
        assert.equal(resolveOpenClawK8sAutoUpdateForOpenRouter(), true);
    }
    finally {
        if (previousK8s === undefined) {
            delete process.env.OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER;
        }
        else {
            process.env.OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER = previousK8s;
        }
        if (previousShared === undefined) {
            delete process.env.OPENCLAW_AUTO_UPDATE_FOR_OPENROUTER;
        }
        else {
            process.env.OPENCLAW_AUTO_UPDATE_FOR_OPENROUTER = previousShared;
        }
    }
});
test("buildOpenClawK8sLabels matches the current naming convention", () => {
    assert.deepEqual(buildOpenClawK8sLabels("dep-123"), {
        "app.kubernetes.io/name": "openclaw",
        "app.kubernetes.io/instance": "openclaw-dep-123",
        "app.kubernetes.io/managed-by": "easyclaw-backend",
        "easyclaw/deployment-id": "dep-123",
    });
});
test("buildOpenClawK8sHostname keeps pod hostnames short and dns-safe", () => {
    assert.equal(buildOpenClawK8sHostname("8dfaac99-839d-4e63-b958-e7ec7c81d1cc"), "oc-8dfaac99839d");
    assert.match(buildOpenClawK8sHostname("DEP_123"), /^[a-z0-9-]+$/);
    assert.ok(buildOpenClawK8sHostname("dep-123").length < 63);
});
test("buildOpenClawK8sSecretManifest writes gateway token and channel credentials", () => {
    const secret = buildOpenClawK8sSecretManifest({
        deploymentId: "dep-123",
        channel: "telegram",
        channelToken: "123:telegram-token",
        gatewayToken: "dep-123",
        apiKey: "sk-test",
        provider: "openrouter",
    });
    assert.equal(secret.metadata?.name, "openclaw-secret-dep-123");
    assert.equal(secret.stringData?.OPENCLAW_GATEWAY_TOKEN, "dep-123");
    assert.equal(secret.stringData?.OPENROUTER_API_KEY, "sk-test");
    assert.equal(secret.stringData?.TELEGRAM_BOT_TOKEN, "123:telegram-token");
    assert.equal(secret.stringData?.TELEGRAM_TOKEN, "123:telegram-token");
});
test("buildOpenClawK8sSecretManifest maps Kie accounts to KIE_API_KEY", () => {
    const secret = buildOpenClawK8sSecretManifest({
        deploymentId: "dep-kie",
        channel: "discord",
        channelToken: "discord-token",
        gatewayToken: "dep-kie",
        apiKey: "kie-test-key",
        provider: "kie",
    });
    assert.equal(secret.stringData?.OPENCLAW_GATEWAY_TOKEN, "dep-kie");
    assert.equal(secret.stringData?.KIE_API_KEY, "kie-test-key");
    assert.equal(secret.stringData?.DISCORD_BOT_TOKEN, "discord-token");
});
test("buildOpenClawK8sCliCommand keeps openrouter on the existing container-default path", () => {
    assert.deepEqual(buildOpenClawK8sCliCommand(["models", "status", "--json"], "openrouter"), [
        "env",
        "HOME=/home/node",
        "openclaw",
        "models",
        "status",
        "--json",
    ]);
});
test("buildOpenClawK8sCliCommand keeps Kie on the same container-default path as openrouter", () => {
    assert.deepEqual(buildOpenClawK8sCliCommand(["models", "status", "--json"], "kie"), [
        "env",
        "HOME=/home/node",
        "openclaw",
        "models",
        "status",
        "--json",
    ]);
});
test("buildOpenClawKieConfigJson writes the three Kie providers with env-backed auth", () => {
    const config = JSON.parse(buildOpenClawKieConfigJson());
    assert.equal(config.models?.mode, "merge");
    assert.equal(config.models?.providers?.["kie-gpt"]?.apiKey, "${KIE_API_KEY}");
    assert.equal(config.models?.providers?.["kie-claude"]?.apiKey, "${KIE_API_KEY}");
    assert.equal(config.models?.providers?.["kie-claude"]?.baseUrl, KIE_CLAUDE_AUTH_PROXY_BASE_URL);
    assert.equal(config.models?.providers?.["kie-gemini"]?.apiKey, "${KIE_API_KEY}");
});
test("buildRenderedOpenClawConfigForK8s writes the rendered KIE gateway, model, and telegram config", () => {
    const config = JSON.parse(buildRenderedOpenClawConfigForK8s({
        channel: "telegram",
        provider: "kie",
        resolvedModel: "kie-gpt/gpt-5-4",
    }));
    assert.equal(config.gateway?.mode, "local");
    assert.equal(config.gateway?.controlUi?.dangerouslyDisableDeviceAuth, true);
    assert.equal(config.gateway?.controlUi?.dangerouslyAllowHostHeaderOriginFallback, true);
    assert.equal(config.models?.mode, "merge");
    assert.equal(config.models?.providers?.["kie-gpt"]?.apiKey, "${KIE_API_KEY}");
    assert.equal(config.models?.providers?.["kie-claude"]?.baseUrl, KIE_CLAUDE_AUTH_PROXY_BASE_URL);
    assert.equal(config.agents?.defaults?.model?.primary, "kie-gpt/gpt-5-4");
    assert.equal(config.channels?.telegram?.enabled, true);
    assert.equal(config.channels?.telegram?.dmPolicy, "open");
    assert.deepEqual(config.channels?.telegram?.allowFrom, ["*"]);
    assert.equal(config.channels?.telegram?.groupPolicy, "allowlist");
    assert.equal(config.channels?.telegram?.streaming, "partial");
});
test("buildRenderedOpenClawConfigForK8s writes discord config with guild replies enabled", () => {
    const config = JSON.parse(buildRenderedOpenClawConfigForK8s({
        channel: "discord",
        provider: "kie",
        resolvedModel: "kie-claude/claude-opus-4-6",
    }));
    assert.equal(config.channels?.discord?.enabled, true);
    assert.equal(config.channels?.discord?.dmPolicy, "open");
    assert.deepEqual(config.channels?.discord?.allowFrom, ["*"]);
    assert.equal(config.channels?.discord?.groupPolicy, "open");
});
test("buildRenderedOpenClawConfigForK8s writes whatsapp config with groups disabled", () => {
    const config = JSON.parse(buildRenderedOpenClawConfigForK8s({
        channel: "whatsapp",
        provider: "kie",
        resolvedModel: "kie-gpt/gpt-5-4",
    }));
    assert.equal(config.channels?.whatsapp?.enabled, true);
    assert.equal(config.channels?.whatsapp?.dmPolicy, "open");
    assert.deepEqual(config.channels?.whatsapp?.allowFrom, ["*"]);
    assert.equal(config.channels?.whatsapp?.groupPolicy, "disabled");
});
test("resolveKieRuntimeModelForK8s fails fast for unsupported runtime models", () => {
    assert.equal(resolveKieRuntimeModelForK8s("kie-gpt/gpt-5-4"), "kie-gpt/gpt-5-4");
    assert.throws(() => resolveKieRuntimeModelForK8s("openrouter/openai/gpt-5.4"), /unsupported KIE model/);
});
test("buildOpenClawK8sConfigFingerprint bumps the KIE fingerprint version for Claude proxy rewrites", () => {
    const fingerprint = buildOpenClawK8sConfigFingerprint({
        channel: "telegram",
        provider: "kie",
        model: "kie-claude/claude-opus-4-6",
    });
    const decoded = JSON.parse(Buffer.from(fingerprint, "base64url").toString("utf8"));
    assert.equal(decoded.version, 2);
    assert.equal(decoded.kieClaudeProxyRevision, 1);
    assert.equal(decoded.gatewayMode, "local");
});
test("buildKieModelPreflightRequest maps each Kie runtime model to the expected upstream endpoint", () => {
    const gpt = buildKieModelPreflightRequest("kie-gpt/gpt-5-4", "kie-key");
    const claude = buildKieModelPreflightRequest("kie-claude/claude-opus-4-6", "kie-key");
    const gemini = buildKieModelPreflightRequest("kie-gemini/gemini-3.1-pro", "kie-key");
    assert.equal(gpt.url, "https://api.kie.ai/codex/v1/responses");
    assert.equal(claude.url, "https://api.kie.ai/claude/v1/messages");
    assert.equal(gemini.url, "https://api.kie.ai/gemini-3.1-pro/v1/chat/completions");
    assert.equal(gpt.body.model, "gpt-5-4");
    assert.equal(gpt.body.stream, false);
    assert.equal(claude.body.model, "claude-opus-4-6");
    assert.equal(gemini.body.model, "gemini-3.1-pro");
    assert.equal(claude.headers["anthropic-version"], "2023-06-01");
});
test("parseKieCreditBalance accepts Kie flat data number and string payloads", () => {
    assert.equal(parseKieCreditBalance({ code: 200, msg: "success", data: 970.02 }), 970.02);
    assert.equal(parseKieCreditBalance({ code: 200, data: "970.02" }), 970.02);
});
test("parseKieCreditBalance finds credits in nested payloads", () => {
    assert.equal(parseKieCreditBalance({ credits: 12 }), 12);
    assert.equal(parseKieCreditBalance({ data: { credit: "8.5" } }), 8.5);
    assert.equal(parseKieCreditBalance({ data: { quota: 9 } }), null);
});
test("extractKieAssistantText handles the three Kie provider response shapes", () => {
    assert.equal(extractKieAssistantText("kie-gpt/gpt-5-4", {
        output: [
            {
                content: [{ type: "output_text", text: "OK" }],
            },
        ],
    }), "OK");
    assert.equal(extractKieAssistantText("kie-claude/claude-opus-4-6", {
        content: [{ type: "text", text: "OK" }],
    }), "OK");
    assert.equal(extractKieAssistantText("kie-gemini/gemini-3.1-pro", {
        choices: [{ message: { content: "OK" } }],
    }), "OK");
});
test("classifyKiePreflightHttpFailure maps 402 to exhausted and 429/5xx to upstream unavailable", () => {
    assert.match(classifyKiePreflightHttpFailure({
        stage: "credit",
        status: 402,
        resolvedModel: "kie-gpt/gpt-5-4",
        bodyText: "Payment Required",
    }).message, /^KIE_CREDIT_EXHAUSTED:/);
    assert.match(classifyKiePreflightHttpFailure({
        stage: "smoke",
        status: 429,
        resolvedModel: "kie-gpt/gpt-5-4",
        bodyText: "Too Many Requests",
    }).message, /^KIE_UPSTREAM_UNAVAILABLE:/);
    assert.match(classifyKiePreflightHttpFailure({
        stage: "smoke",
        status: 401,
        resolvedModel: "kie-gpt/gpt-5-4",
        bodyText: "Unauthorized",
    }).message, /^KIE_MODEL_PRECHECK_FAILED:/);
});
test("performKieLivePreflight fails fast when Kie credits are exhausted", async () => {
    const fetchCalls = [];
    const fetchImpl = async (input) => {
        fetchCalls.push(String(input));
        return {
            ok: true,
            status: 200,
            async text() {
                return JSON.stringify({ data: { credits: 0 } });
            },
        };
    };
    await assert.rejects(() => performKieLivePreflight({
        apiKey: "kie-key",
        resolvedModel: "kie-gpt/gpt-5-4",
        fetchImpl,
    }), /KIE_CREDIT_EXHAUSTED/);
    assert.deepEqual(fetchCalls, ["https://api.kie.ai/api/v1/chat/credit"]);
});
test("performKieLivePreflight succeeds with Kie flat credit data and assistant text", async () => {
    const responses = [
        {
            ok: true,
            status: 200,
            async text() {
                return JSON.stringify({ code: 200, msg: "success", data: 970.02 });
            },
        },
        {
            ok: true,
            status: 200,
            async text() {
                return JSON.stringify({
                    output: [{ content: [{ type: "output_text", text: "OK" }] }],
                });
            },
        },
    ];
    let callIndex = 0;
    const result = await performKieLivePreflight({
        apiKey: "kie-key",
        resolvedModel: "kie-gpt/gpt-5-4",
        fetchImpl: async () => responses[callIndex++],
    });
    assert.deepEqual(result, { credits: 970.02, text: "OK" });
});
test("performKieLivePreflight rejects Kie smoke requests that return no assistant text", async () => {
    const responses = [
        {
            ok: true,
            status: 200,
            async text() {
                return JSON.stringify({ data: { credits: 3 } });
            },
        },
        {
            ok: true,
            status: 200,
            async text() {
                return JSON.stringify({ output: [] });
            },
        },
    ];
    let callIndex = 0;
    await assert.rejects(() => performKieLivePreflight({
        apiKey: "kie-key",
        resolvedModel: "kie-gpt/gpt-5-4",
        fetchImpl: async () => responses[callIndex++],
    }), /KIE_MODEL_PRECHECK_FAILED/);
});
test("performKiePodLocalPreflight returns parsed success payload", async () => {
    const result = await performKiePodLocalPreflight({
        resolvedModel: "kie-gpt/gpt-5-4",
        runScriptInPod: async () => ({
            stdout: '{"credits":970.02,"text":"OK"}\n',
        }),
    });
    assert.deepEqual(result, { credits: 970.02, text: "OK" });
});
test("performKiePodLocalCreditCheck returns parsed credit-only payload", async () => {
    const result = await performKiePodLocalCreditCheck({
        resolvedModel: "kie-claude/claude-opus-4-6",
        runScriptInPod: async () => ({
            stdout: '{"credits":970.02}\n',
        }),
    });
    assert.deepEqual(result, { credits: 970.02 });
});
test("runKieLivePreflightIfNeeded uses credit check plus gateway smoke for KIE Gemini 3.1 Pro", async () => {
    const commands = [];
    const execMock = {
        async exec(_namespace, _podName, _containerName, cmd, stdout, stderr, _stdin, _tty, statusCallback) {
            commands.push(cmd);
            const ws = new EventEmitter();
            ws.close = () => {
                ws.emit("close");
            };
            setImmediate(() => {
                if (cmd[0] === "node" && cmd[1] === "-e") {
                    stdout.write('{"credits":970.02}\n');
                }
                else if (cmd.join(" ") === buildOpenClawK8sCliCommand(buildKieGatewaySmokeArgs(), "kie").join(" ")) {
                    stdout.write(JSON.stringify({ payloads: [{ text: "OK" }] }));
                }
                else {
                    stderr.write(`unexpected command: ${cmd.join(" ")}`);
                }
                statusCallback({ status: "Success" });
                ws.emit("close");
            });
            return ws;
        },
    };
    await runKieLivePreflightIfNeeded({
        deploymentId: "dep-gemini",
        provider: "kie",
        resolvedModel: "kie-gemini/gemini-3.1-pro",
        exec: execMock,
        pod: {
            name: "pod-gemini",
            namespace: "easyclaw-openclaw",
            containerName: "openclaw",
        },
    });
    assert.equal(commands.length, 2);
    assert.equal(commands[0]?.[0], "node");
    assert.equal(commands[0]?.[1], "-e");
    assert.match(commands[0]?.[2] || "", /api\/v1\/chat\/credit/);
    assert.deepEqual(commands[1], buildOpenClawK8sCliCommand(buildKieGatewaySmokeArgs(), "kie"));
});
test("runKieLivePreflightIfNeeded keeps KIE GPT on pod-local preflight", async () => {
    const commands = [];
    const execMock = {
        async exec(_namespace, _podName, _containerName, cmd, stdout, _stderr, _stdin, _tty, statusCallback) {
            commands.push(cmd);
            const ws = new EventEmitter();
            ws.close = () => {
                ws.emit("close");
            };
            setImmediate(() => {
                stdout.write('{"credits":970.02,"text":"OK"}\n');
                statusCallback({ status: "Success" });
                ws.emit("close");
            });
            return ws;
        },
    };
    await runKieLivePreflightIfNeeded({
        deploymentId: "dep-gpt",
        provider: "kie",
        resolvedModel: "kie-gpt/gpt-5-4",
        exec: execMock,
        pod: {
            name: "pod-gpt",
            namespace: "easyclaw-openclaw",
            containerName: "openclaw",
        },
    });
    assert.equal(commands.length, 1);
    assert.equal(commands[0]?.[0], "node");
    assert.equal(commands[0]?.[1], "-e");
    assert.match(commands[0]?.[2] || "", /codex\/v1\/responses/);
});
test("performKiePodLocalPreflight retries K8s transport errors and eventually succeeds", async () => {
    let attempts = 0;
    const result = await performKiePodLocalPreflight({
        resolvedModel: "kie-gpt/gpt-5-4",
        retryDelaysMs: [0, 0, 0],
        runScriptInPod: async () => {
            attempts += 1;
            if (attempts === 1) {
                throw new Error("request to https://86.48.5.165:6443 failed, reason: Client network socket disconnected before secure TLS connection was established");
            }
            return {
                stdout: '{"credits":970.02,"text":"OK"}\n',
            };
        },
    });
    assert.deepEqual(result, { credits: 970.02, text: "OK" });
    assert.equal(attempts, 2);
});
test("performKiePodLocalPreflight maps 402 failures to KIE_CREDIT_EXHAUSTED", async () => {
    await assert.rejects(() => performKiePodLocalPreflight({
        resolvedModel: "kie-gpt/gpt-5-4",
        runScriptInPod: async () => {
            throw new Error("Pod exec failed (exit=1): node -e ...\nKIE_CREDIT_EXHAUSTED: stage=credit, status=402");
        },
    }), /KIE_CREDIT_EXHAUSTED/);
});
test("performKiePodLocalPreflight maps pod-local timeout to KIE_UPSTREAM_UNAVAILABLE", async () => {
    await assert.rejects(() => performKiePodLocalPreflight({
        resolvedModel: "kie-gpt/gpt-5-4",
        runScriptInPod: async () => {
            throw new Error("Pod exec timed out after 25000ms: node -e ...");
        },
    }), /KIE_UPSTREAM_UNAVAILABLE/);
});
test("performKiePodLocalPreflight maps exhausted K8s transport errors to KIE_UPSTREAM_UNAVAILABLE", async () => {
    let attempts = 0;
    await assert.rejects(() => performKiePodLocalPreflight({
        resolvedModel: "kie-gpt/gpt-5-4",
        retryDelaysMs: [0],
        runScriptInPod: async () => {
            attempts += 1;
            throw new Error("request to https://86.48.5.165:6443 failed, reason: read ECONNRESET");
        },
    }), /KIE_UPSTREAM_UNAVAILABLE/);
    assert.equal(attempts, 2);
});
test("performKiePodLocalPreflight preserves pod-local 429 and 5xx upstream failures", async () => {
    await assert.rejects(() => performKiePodLocalPreflight({
        resolvedModel: "kie-gpt/gpt-5-4",
        runScriptInPod: async () => {
            throw new Error("Pod exec failed (exit=1): node -e ...\nKIE_UPSTREAM_UNAVAILABLE: stage=smoke, status=429");
        },
    }), /KIE_UPSTREAM_UNAVAILABLE/);
    await assert.rejects(() => performKiePodLocalPreflight({
        resolvedModel: "kie-gpt/gpt-5-4",
        runScriptInPod: async () => {
            throw new Error("Pod exec failed (exit=1): node -e ...\nKIE_UPSTREAM_UNAVAILABLE: stage=smoke, status=500");
        },
    }), /KIE_UPSTREAM_UNAVAILABLE/);
});
test("performKiePodLocalPreflight maps HTTP 200 body-level 500 codes to KIE_UPSTREAM_UNAVAILABLE", async () => {
    await assert.rejects(() => performKiePodLocalPreflight({
        resolvedModel: "kie-gpt/gpt-5-4",
        runScriptInPod: async () => {
            throw new Error("Pod exec failed (exit=1): node -e ...\nKIE_UPSTREAM_UNAVAILABLE: stage=smoke, status=200, code=500");
        },
    }), /KIE_UPSTREAM_UNAVAILABLE/);
});
test("performKiePodLocalPreflight maps empty or invalid success payloads to KIE_MODEL_PRECHECK_FAILED", async () => {
    await assert.rejects(() => performKiePodLocalPreflight({
        resolvedModel: "kie-gpt/gpt-5-4",
        runScriptInPod: async () => ({
            stdout: '{"credits":970.02,"text":""}\n',
        }),
    }), /KIE_MODEL_PRECHECK_FAILED/);
    await assert.rejects(() => performKiePodLocalPreflight({
        resolvedModel: "kie-gpt/gpt-5-4",
        runScriptInPod: async () => ({
            stdout: "not-json\n",
        }),
    }), /KIE_MODEL_PRECHECK_FAILED/);
});
test("buildOpenClawK8sVolumePrepScript resets the gateway ready marker and restores it for matching config", () => {
    const script = buildOpenClawK8sVolumePrepScript("fingerprint-123");
    assert.match(script, /\.easyclaw-config-ready/);
    assert.match(script, /\.easyclaw-config-fingerprint/);
    assert.match(script, /EXPECTED_FINGERPRINT='fingerprint-123'/);
    assert.match(script, /rm -f "\$READY_FILE"/);
    assert.match(script, /touch "\$READY_FILE"/);
});
test("buildOpenClawK8sVolumePrepScript no longer rewrites provider config during init", () => {
    const script = buildOpenClawK8sVolumePrepScript("fingerprint-123");
    assert.doesNotMatch(script, /openclaw\.json/);
    assert.doesNotMatch(script, /kie-gpt/);
});
test("buildOpenClawWorkspaceMemorySeedScript creates missing memory files without overwriting existing notes", () => {
    const script = buildOpenClawWorkspaceMemorySeedScript(new Date("2026-04-04T12:00:00.000Z"));
    assert.match(script, /MEMORY\.md/);
    assert.match(script, /2026-04-04/);
    assert.match(script, /2026-04-03/);
    assert.match(script, /mkdir -p "\$MEMORY_DIR"/);
    assert.match(script, /\[ -f "\$WORKSPACE_DIR\/MEMORY\.md" \] \|\|/);
    assert.match(script, /if \[ "\$\(id -u\)" = "0" \]; then chown -R node:node "\$WORKSPACE_DIR\/MEMORY\.md" "\$MEMORY_DIR"; fi/);
});
test("buildOpenClawK8sDeploymentManifest binds workloads to openclaw workers without PVCs", () => {
    const deployment = buildOpenClawK8sDeploymentManifest({
        deploymentId: "dep-123",
        image: "fourplayers/openclaw:2026.3.23-2",
        secretName: "openclaw-secret-dep-123",
        provider: "kie",
        configFingerprint: "fingerprint-123",
        modelEnv: null,
    });
    const container = deployment.spec?.template?.spec?.containers?.[0];
    const claudeProxySidecar = deployment.spec?.template?.spec?.containers?.find(({ name }) => name === "kie-claude-auth-proxy");
    const initContainer = deployment.spec?.template?.spec?.initContainers?.[0];
    const nodeExpressions = deployment.spec?.template?.spec?.affinity?.nodeAffinity
        ?.requiredDuringSchedulingIgnoredDuringExecution?.nodeSelectorTerms?.[0]
        ?.matchExpressions;
    const volume = deployment.spec?.template?.spec?.volumes?.[0];
    const volumeMount = container?.volumeMounts?.[0];
    const initVolumeMount = initContainer?.volumeMounts?.[0];
    assert.equal(container?.image, "fourplayers/openclaw:2026.3.23-2");
    assert.equal(container?.resources?.requests?.cpu, "500m");
    assert.equal(container?.resources?.requests?.memory, "1Gi");
    assert.equal(container?.resources?.limits?.cpu, "2");
    assert.equal(container?.resources?.limits?.memory, "4Gi");
    assert.deepEqual(container?.command?.slice(0, 2), ["sh", "-lc"]);
    assert.match(container?.command?.[2] || "", /\.easyclaw-config-ready/);
    assert.match(container?.command?.[2] || "", /openclaw gateway run/);
    assert.equal(container?.securityContext?.runAsUser, 1000);
    assert.equal(container?.securityContext?.runAsGroup, 1000);
    assert.equal(container?.securityContext?.runAsNonRoot, true);
    assert.equal(volume?.name, "openclaw-data");
    assert.deepEqual(volume?.emptyDir || {}, {});
    assert.equal(volumeMount?.name, "openclaw-data");
    assert.equal(volumeMount?.mountPath, "/home/node/.openclaw");
    assert.equal(deployment.spec?.template?.spec?.hostname, buildOpenClawK8sHostname("dep-123"));
    assert.equal(initContainer?.name, "openclaw-volume-prep");
    assert.equal(initContainer?.image, "fourplayers/openclaw:2026.3.23-2");
    assert.deepEqual(initContainer?.command?.slice(0, 2), ["sh", "-lc"]);
    assert.match(initContainer?.command?.[2] || "", /cat \/IMAGE_BUILD_DATE > \/home\/node\/\.openclaw\/\.last_image_update/);
    assert.match(initContainer?.command?.[2] || "", /\.easyclaw-config-ready/);
    assert.match(initContainer?.command?.[2] || "", /\.easyclaw-config-fingerprint/);
    assert.match(initContainer?.command?.[2] || "", /fingerprint-123/);
    assert.equal(initContainer?.securityContext?.runAsUser, 0);
    assert.equal(initContainer?.securityContext?.runAsGroup, 0);
    assert.equal(initVolumeMount?.name, "openclaw-data");
    assert.equal(initVolumeMount?.mountPath, "/home/node/.openclaw");
    assert.ok(claudeProxySidecar);
    assert.equal(claudeProxySidecar?.image, "fourplayers/openclaw:2026.3.23-2");
    assert.deepEqual(claudeProxySidecar?.command?.slice(0, 2), ["node", "-e"]);
    assert.match(claudeProxySidecar?.command?.[2] || "", /KIE Claude auth proxy/);
    assert.equal(claudeProxySidecar?.ports?.[0]?.containerPort, KIE_CLAUDE_AUTH_PROXY_PORT);
    assert.deepEqual(nodeExpressions, [
        {
            key: "easyclaw-role",
            operator: "In",
            values: ["openclaw-worker"],
        },
    ]);
});
test("buildOpenClawK8sDeploymentManifest only adds the Claude proxy sidecar for KIE runtimes", () => {
    const deployment = buildOpenClawK8sDeploymentManifest({
        deploymentId: "dep-openai",
        image: "fourplayers/openclaw:2026.3.23-2",
        secretName: "openclaw-secret-dep-openai",
        provider: "openai",
        configFingerprint: "fingerprint-openai",
        modelEnv: null,
    });
    assert.equal(deployment.spec?.template?.spec?.containers?.some(({ name }) => name === "kie-claude-auth-proxy"), false);
});
test("configureOpenClawInPod writes config fingerprint + ready marker and no longer restarts the gateway process", async () => {
    const commands = [];
    const execMock = createSuccessfulExecMock(commands);
    const runtimeModel = await configureOpenClawInPod(execMock.exec, {
        name: "pod-1",
        namespace: "easyclaw-openclaw",
        containerName: "openclaw",
    }, {
        channel: "telegram",
        provider: "openai",
        configFingerprint: "fingerprint-123",
    });
    assert.equal(runtimeModel, undefined);
    assert.equal(commands.some((cmd) => cmd.join(" ").includes("pkill -f '[o]penclaw-gateway'")), false);
    assert.equal(commands.some((cmd) => cmd.join(" ").includes("printf '%s' 'fingerprint-123'")), true);
    assert.equal(commands.some((cmd) => cmd.join(" ").includes(".easyclaw-config-ready")), true);
});
test("restartOpenClawGatewayInPod kills the gateway child process for K8s runtimes", async () => {
    const commands = [];
    const execMock = createSuccessfulExecMock(commands);
    await restartOpenClawGatewayInPod(execMock.exec, {
        name: "pod-1",
        namespace: "easyclaw-openclaw",
        containerName: "openclaw",
    });
    assert.equal(commands.some((cmd) => cmd.join(" ").includes("pkill -f '[o]penclaw-gateway' || true")), true);
});
test("configureOpenClawInPod renders KIE config once and skips models CLI commands", async () => {
    const commands = [];
    const execMock = createSuccessfulExecMock(commands);
    const runtimeModel = await configureOpenClawInPod(execMock.exec, {
        name: "pod-kie",
        namespace: "easyclaw-openclaw",
        containerName: "openclaw",
    }, {
        channel: "telegram",
        model: "kie-gpt/gpt-5-4",
        provider: "kie",
        configFingerprint: "fingerprint-kie",
    });
    assert.equal(runtimeModel, "kie-gpt/gpt-5-4");
    assert.equal(commands.some((cmd) => cmd.slice(0, 4).join(" ") === "env HOME=/home/node openclaw models"), false);
    assert.equal(commands.some((cmd) => cmd.join(" ").includes("openclaw config set")), false);
    const configWriteCommand = commands.find((cmd) => cmd[0] === "sh" &&
        cmd[1] === "-lc" &&
        (cmd[2] || "").includes("openclaw.json.tmp") &&
        (cmd[2] || "").includes(".easyclaw-config-ready"));
    assert.ok(configWriteCommand);
    assert.match(configWriteCommand?.[2] || "", /telegram-pairing\.json/);
    assert.match(configWriteCommand?.[2] || "", /fingerprint-kie/);
});
test("configureOpenClawInPod opens Discord guild replies for non-KIE runtimes", async () => {
    const commands = [];
    const execMock = createSuccessfulExecMock(commands);
    await configureOpenClawInPod(execMock.exec, {
        name: "pod-discord",
        namespace: "easyclaw-openclaw",
        containerName: "openclaw",
    }, {
        channel: "discord",
        provider: "openai",
        configFingerprint: "fingerprint-discord",
    });
    assert.equal(commands.some((cmd) => cmd.join(" ") ===
        'env HOME=/home/node openclaw config set channels.discord.groupPolicy open'), true);
});
test("configureOpenClawInPod configures WhatsApp for DMs only on non-KIE runtimes", async () => {
    const commands = [];
    const execMock = createSuccessfulExecMock(commands);
    await configureOpenClawInPod(execMock.exec, {
        name: "pod-whatsapp",
        namespace: "easyclaw-openclaw",
        containerName: "openclaw",
    }, {
        channel: "whatsapp",
        provider: "openai",
        configFingerprint: "fingerprint-whatsapp",
    });
    assert.equal(commands.some((cmd) => cmd.join(" ") ===
        "env HOME=/home/node openclaw config set channels.whatsapp.enabled true"), true);
    assert.equal(commands.some((cmd) => cmd.join(" ") ===
        "env HOME=/home/node openclaw config set channels.whatsapp.groupPolicy disabled"), true);
});
test("loadOpenClawKubeConfig prefers OPENCLAW_K8S_KUBECONFIG_B64", () => {
    const previousB64 = process.env.OPENCLAW_K8S_KUBECONFIG_B64;
    const previousPath = process.env.OPENCLAW_K8S_KUBECONFIG;
    process.env.OPENCLAW_K8S_KUBECONFIG_B64 = Buffer.from([
        "apiVersion: v1",
        "kind: Config",
        "clusters: []",
        "contexts: []",
        "users: []",
        "current-context: ''",
    ].join("\n"), "utf8").toString("base64");
    process.env.OPENCLAW_K8S_KUBECONFIG = "/tmp/should-not-be-used";
    const calls = [];
    const fakeKubeConfig = {
        loadFromString(value) {
            calls.push(`string:${value}`);
        },
        loadFromFile(value) {
            calls.push(`file:${value}`);
        },
        loadFromDefault() {
            calls.push("default");
        },
    };
    try {
        loadOpenClawKubeConfig(fakeKubeConfig);
        assert.equal(calls.length, 1);
        assert.match(calls[0] || "", /^string:apiVersion: v1/);
    }
    finally {
        if (previousB64 === undefined) {
            delete process.env.OPENCLAW_K8S_KUBECONFIG_B64;
        }
        else {
            process.env.OPENCLAW_K8S_KUBECONFIG_B64 = previousB64;
        }
        if (previousPath === undefined) {
            delete process.env.OPENCLAW_K8S_KUBECONFIG;
        }
        else {
            process.env.OPENCLAW_K8S_KUBECONFIG = previousPath;
        }
    }
});
test("loadOpenClawKubeConfig falls back to OPENCLAW_K8S_KUBECONFIG file path", () => {
    const previousB64 = process.env.OPENCLAW_K8S_KUBECONFIG_B64;
    const previousPath = process.env.OPENCLAW_K8S_KUBECONFIG;
    delete process.env.OPENCLAW_K8S_KUBECONFIG_B64;
    process.env.OPENCLAW_K8S_KUBECONFIG = "/tmp/test-kubeconfig";
    const calls = [];
    const fakeKubeConfig = {
        loadFromString(value) {
            calls.push(`string:${value}`);
        },
        loadFromFile(value) {
            calls.push(`file:${value}`);
        },
        loadFromDefault() {
            calls.push("default");
        },
    };
    try {
        loadOpenClawKubeConfig(fakeKubeConfig);
        assert.deepEqual(calls, ["file:/tmp/test-kubeconfig"]);
    }
    finally {
        if (previousB64 === undefined) {
            delete process.env.OPENCLAW_K8S_KUBECONFIG_B64;
        }
        else {
            process.env.OPENCLAW_K8S_KUBECONFIG_B64 = previousB64;
        }
        if (previousPath === undefined) {
            delete process.env.OPENCLAW_K8S_KUBECONFIG;
        }
        else {
            process.env.OPENCLAW_K8S_KUBECONFIG = previousPath;
        }
    }
});
test("loadOpenClawKubeConfig rejects invalid OPENCLAW_K8S_KUBECONFIG_B64", () => {
    const previousB64 = process.env.OPENCLAW_K8S_KUBECONFIG_B64;
    const previousPath = process.env.OPENCLAW_K8S_KUBECONFIG;
    process.env.OPENCLAW_K8S_KUBECONFIG_B64 = "not-base64";
    delete process.env.OPENCLAW_K8S_KUBECONFIG;
    try {
        assert.throws(() => loadOpenClawKubeConfig({
            loadFromString() { },
            loadFromFile() { },
            loadFromDefault() { },
        }), /invalid OPENCLAW_K8S_KUBECONFIG_B64/);
    }
    finally {
        if (previousB64 === undefined) {
            delete process.env.OPENCLAW_K8S_KUBECONFIG_B64;
        }
        else {
            process.env.OPENCLAW_K8S_KUBECONFIG_B64 = previousB64;
        }
        if (previousPath === undefined) {
            delete process.env.OPENCLAW_K8S_KUBECONFIG;
        }
        else {
            process.env.OPENCLAW_K8S_KUBECONFIG = previousPath;
        }
    }
});
test("isRetryableK8sTransportError recognizes transient transport failures", () => {
    assert.equal(isRetryableK8sTransportError(new Error("request to https://86.48.5.165:6443 failed, reason: read ECONNRESET")), true);
    assert.equal(isRetryableK8sTransportError(new Error("socket hang up")), true);
    assert.equal(isRetryableK8sTransportError(new Error("fetch failed")), true);
    assert.equal(isRetryableK8sTransportError(new Error("request to https://86.48.5.165:6443 failed, reason: Client network socket disconnected before secure TLS connection was established")), true);
    assert.equal(isRetryableK8sTransportError("Connection terminated unexpectedly"), true);
    assert.equal(isRetryableK8sTransportError("EOF"), true);
});
test("withRetryableK8sControlPlaneCall retries transport errors and eventually succeeds", async () => {
    let attempts = 0;
    const retryAttempts = [];
    const result = await withRetryableK8sControlPlaneCall({
        operation: "deployment.read:test-deployment",
        retryDelaysMs: [0, 0, 0],
        onRetry: ({ attempt }) => {
            retryAttempts.push(attempt);
        },
        fn: async () => {
            attempts += 1;
            if (attempts < 3) {
                throw new Error("request to https://86.48.5.165:6443 failed, reason: Client network socket disconnected before secure TLS connection was established");
            }
            return "ok";
        },
    });
    assert.equal(result, "ok");
    assert.equal(attempts, 3);
    assert.deepEqual(retryAttempts, [1, 2]);
});
test("withRetryableK8sControlPlaneCall does not retry business failures", async () => {
    let attempts = 0;
    const originalError = new Error("Deployment name is required");
    await assert.rejects(() => withRetryableK8sControlPlaneCall({
        operation: "deployment.read:test-deployment",
        retryDelaysMs: [0, 0, 0],
        fn: async () => {
            attempts += 1;
            throw originalError;
        },
    }), (error) => {
        assert.equal(error, originalError);
        return true;
    });
    assert.equal(attempts, 1);
});
test("withRetryableK8sControlPlaneCall surfaces the original transport error after retries are exhausted", async () => {
    let attempts = 0;
    const originalError = new Error("request to https://86.48.5.165:6443 failed, reason: Client network socket disconnected before secure TLS connection was established");
    await assert.rejects(() => withRetryableK8sControlPlaneCall({
        operation: "deployment.read:test-deployment",
        retryDelaysMs: [0, 0, 0],
        fn: async () => {
            attempts += 1;
            throw originalError;
        },
    }), (error) => {
        assert.equal(error, originalError);
        return true;
    });
    assert.equal(attempts, 4);
});
test("isRetryableK8sTransportError ignores business failures", () => {
    assert.equal(isRetryableK8sTransportError(new Error("OpenClaw reported unknown model")), false);
    assert.equal(isRetryableK8sTransportError(new Error("Pod exec failed (exit=1): openclaw channels status")), false);
});
test("isOpenClawHealthReadyForChannel accepts a successful Telegram probe even before running flips true", () => {
    assert.equal(isOpenClawHealthReadyForChannel({
        ok: true,
        channels: {
            telegram: {
                configured: true,
                running: false,
                lastError: null,
                probe: { ok: true, status: null, error: null },
            },
        },
    }, "telegram"), true);
});
test("isOpenClawHealthReadyForChannel rejects failed probes and channel errors", () => {
    assert.equal(isOpenClawHealthReadyForChannel({
        ok: true,
        channels: {
            telegram: {
                configured: true,
                running: false,
                lastError: "Unauthorized",
                probe: { ok: false, status: 401, error: "Unauthorized" },
            },
        },
    }, "telegram"), false);
});
test("isOpenClawHealthReadyForChannel accepts a running WhatsApp channel", () => {
    assert.equal(isOpenClawHealthReadyForChannel({
        ok: true,
        channels: {
            whatsapp: {
                configured: true,
                running: true,
                lastError: null,
                probe: { ok: true, status: 200, error: null },
            },
        },
    }, "whatsapp"), true);
});
test("isWhatsAppRuntimeReadyFromLogs detects the WhatsApp listener startup line", () => {
    assert.equal(isWhatsAppRuntimeReadyFromLogs("[whatsapp] Listening for personal WhatsApp inbound messages."), true);
    assert.equal(isWhatsAppRuntimeReadyFromLogs("no whatsapp listener yet"), false);
});
test("waitForOpenClawReady accepts Telegram health probe readiness without channels status", async () => {
    const commands = [];
    const execMock = createPodExecMock(commands, {
        "env HOME=/home/node openclaw health --json": () => ({
            stdout: JSON.stringify({
                ok: true,
                channels: {
                    telegram: {
                        configured: true,
                        running: false,
                        lastError: null,
                        probe: { ok: true, status: 200, error: null },
                    },
                },
            }),
        }),
    });
    await waitForOpenClawReady({
        core: createRunningPodCoreMock(),
        exec: execMock.exec,
        pod: {
            name: "pod-1",
            namespace: "easyclaw-openclaw",
            containerName: "openclaw",
        },
        channel: "telegram",
        deploymentId: "dep-1",
    });
    assert.equal(commands.some((cmd) => cmd.join(" ").includes("channels status --json")), false);
    assert.equal(commands.filter((cmd) => cmd.join(" ") === "env HOME=/home/node openclaw health --json")
        .length >= 2, true);
});
test("waitForOpenClawReady accepts linked WhatsApp runtimes once listener startup is visible in logs", async () => {
    const commands = [];
    const execMock = createPodExecMock(commands, {
        "env HOME=/home/node openclaw health --json": () => ({
            stdout: JSON.stringify({
                ok: true,
                channels: {
                    whatsapp: {
                        configured: true,
                        linked: true,
                        running: false,
                        lastError: null,
                    },
                },
            }),
        }),
    });
    await waitForOpenClawReady({
        core: createRunningPodCoreMock("[whatsapp] Listening for personal WhatsApp inbound messages."),
        exec: execMock.exec,
        pod: {
            name: "pod-whatsapp-linked",
            namespace: "easyclaw-openclaw",
            containerName: "openclaw",
        },
        channel: "whatsapp",
        deploymentId: "dep-whatsapp-linked",
    });
    assert.equal(commands.some((cmd) => cmd.join(" ").includes("channels status --json")), false);
});
test("waitForOpenClawReady maps unauthorized WhatsApp runtimes to WHATSAPP_SESSION_UNAUTHORIZED", async () => {
    const commands = [];
    const execMock = createPodExecMock(commands, {
        "env HOME=/home/node openclaw health --json": () => ({
            stdout: JSON.stringify({
                ok: true,
                channels: {
                    whatsapp: {
                        configured: true,
                        linked: true,
                        running: false,
                        lastError: "Connection Failure",
                        probe: { ok: false, status: 401, error: "Unauthorized" },
                    },
                },
            }),
        }),
    });
    await assert.rejects(() => waitForOpenClawReady({
        core: createRunningPodCoreMock("[whatsapp:default] channel exited: {\"message\":\"Connection Failure\",\"statusCode\":401}"),
        exec: execMock.exec,
        pod: {
            name: "pod-whatsapp-unauthorized",
            namespace: "easyclaw-openclaw",
            containerName: "openclaw",
        },
        channel: "whatsapp",
        deploymentId: "dep-whatsapp-unauthorized",
    }), new RegExp(WHATSAPP_SESSION_UNAUTHORIZED_ERROR_CODE));
});
test("waitForOpenClawReady maps Telegram unauthorized health probes to TELEGRAM_UNAUTHORIZED", async () => {
    const commands = [];
    const execMock = createPodExecMock(commands, {
        "env HOME=/home/node openclaw health --json": () => ({
            stdout: JSON.stringify({
                ok: true,
                channels: {
                    telegram: {
                        configured: true,
                        running: false,
                        lastError: null,
                        probe: { ok: false, status: 401, error: "Unauthorized" },
                    },
                },
            }),
        }),
    });
    await assert.rejects(() => waitForOpenClawReady({
        core: createRunningPodCoreMock(),
        exec: execMock.exec,
        pod: {
            name: "pod-unauthorized",
            namespace: "easyclaw-openclaw",
            containerName: "openclaw",
        },
        channel: "telegram",
        deploymentId: "dep-unauthorized",
    }), /TELEGRAM_UNAUTHORIZED/);
    assert.equal(commands.some((cmd) => cmd.join(" ").includes("channels status --json")), false);
});
test("waitForOpenClawReady rejects Discord deployments when Message Content Intent is disabled", async () => {
    const commands = [];
    const execMock = createPodExecMock(commands, {
        "env HOME=/home/node openclaw health --json": () => ({
            stdout: JSON.stringify({
                ok: true,
                channels: {
                    discord: {
                        configured: true,
                        running: true,
                        lastError: null,
                        probe: { ok: true, status: 200, error: null },
                    },
                },
            }),
        }),
        "env HOME=/home/node openclaw channels status --json": () => ({
            stdout: JSON.stringify({
                channels: {
                    discord: {
                        configured: true,
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
        }),
    });
    await assert.rejects(() => waitForOpenClawReady({
        core: createRunningPodCoreMock(),
        exec: execMock.exec,
        pod: {
            name: "pod-discord-disabled-intent",
            namespace: "easyclaw-openclaw",
            containerName: "openclaw",
        },
        channel: "discord",
        deploymentId: "dep-discord-disabled-intent",
    }), /DISCORD_MESSAGE_CONTENT_INTENT_DISABLED/);
    assert.equal(commands.some((cmd) => cmd.join(" ") === "env HOME=/home/node openclaw channels status --json"), true);
});
