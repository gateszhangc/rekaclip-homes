import test from "node:test";
import assert from "node:assert/strict";
import type {
  LoginExecAdapter,
  LoginExecStartOptions,
} from "./whatsapp-login/exec/types.js";
import { toPlainTerminalOutput } from "./whatsapp-login/ansi.js";
import { detectTerminalOutcome } from "./whatsapp-login/outcome.js";
import { CurrentLoginSessionStore } from "./whatsapp-login/session-store.js";

const QR_LINES = [
  "  █▀▀▀▀▀█  ▀▄ █ █▀▀▀▀▀█",
  "  █ ███ █ ▄▀█ ▀ █ ███ █",
  "  █ ▀▀▀ █ █ ▄▀▄ █ ▀▀▀ █",
  "  ▀▀▀▀▀▀▀ █ █ ▀ ▀▀▀▀▀▀▀",
  "  ▀ ▀▀ ▀▀██ ▀█▀ █▀██ ▀ ",
  "  █▀ ▄▄▀▀█ ▀  █▀▄ ▄ █▀ ",
  "  █▄█ █▀▀▀██▀█▀ ▀▀██▀█ ",
  "  █▀▀▀▀▀█ ▄ █▀█▀ ██ ▄▀ ",
];

const LOGIN_OUTPUT_WAITING_QR = [
  "\u001B[2J\u001B[H\u001B[38;5;45mPreparing WhatsApp linked-device login...\u001B[0m",
  "Scan this QR in WhatsApp (Linked Devices):",
  "",
].join("\n");

const LOGIN_OUTPUT_WITH_QR = [
  LOGIN_OUTPUT_WAITING_QR,
  ...QR_LINES,
  "",
].join("\n");

const LOGIN_OUTPUT_CONNECTED = [
  LOGIN_OUTPUT_WITH_QR,
  "\u001B[32mWhatsApp connected successfully.\u001B[0m",
].join("\n");

class ControlledExecAdapter implements LoginExecAdapter {
  public starts: LoginExecStartOptions[] = [];
  private current: LoginExecStartOptions | null = null;
  private currentResolve: (() => void) | null = null;

  async start(options: LoginExecStartOptions): Promise<void> {
    this.starts.push(options);
    this.current = options;

    return new Promise<void>((resolve) => {
      this.currentResolve = resolve;
      options.signal.addEventListener(
        "abort",
        () => {
          this.current = null;
          resolve();
        },
        { once: true }
      );
    });
  }

  push(chunk: string) {
    this.current?.onData(chunk);
  }

  exit(exitCode: number | null) {
    this.current?.onExit(exitCode);
    this.currentResolve?.();
    this.current = null;
    this.currentResolve = null;
  }
}

test("toPlainTerminalOutput strips ANSI escapes and keeps QR text", () => {
  const plain = toPlainTerminalOutput(LOGIN_OUTPUT_WITH_QR);
  assert.match(plain, /Preparing WhatsApp linked-device login/);
  assert.match(plain, /Scan this QR in WhatsApp/);
  assert.match(plain, /█▀▀▀▀▀█/u);
});

test("detectTerminalOutcome recognizes whatsapp login success", () => {
  const outcome = detectTerminalOutcome(toPlainTerminalOutput(LOGIN_OUTPUT_CONNECTED));
  assert.deepEqual(outcome, {
    status: "connected",
    message: "WhatsApp login connected.",
  });
});

test("detectTerminalOutcome ignores unrelated startup noise that contains generic failures", () => {
  const outcome = detectTerminalOutcome(
    "pricing bootstrap failed: TypeError: fetch failed"
  );
  assert.equal(outcome, null);
});

test("detectTerminalOutcome recognizes explicit whatsapp login failures", () => {
  const outcome = detectTerminalOutcome("WhatsApp login failed: unauthorized");
  assert.deepEqual(outcome, {
    status: "failed",
    message: "WhatsApp login failed.",
  });
});

test("CurrentLoginSessionStore waits for the first QR before resolving start", async () => {
  const adapter = new ControlledExecAdapter();
  const store = new CurrentLoginSessionStore({
    deploymentId: "dep-whatsapp",
    execAdapter: adapter,
    startWaitTimeoutMs: 1_000,
    snapshotRetentionMs: 1_000,
    now: () => new Date("2026-04-09T12:00:00.000Z"),
    sessionIdFactory: (() => {
      let counter = 0;
      return () => `session-${++counter}`;
    })(),
  });

  let resolved = false;
  const startPromise = store.startOrReuse().then((snapshot) => {
    resolved = true;
    return snapshot;
  });

  adapter.push(LOGIN_OUTPUT_WAITING_QR);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(resolved, false);

  adapter.push(QR_LINES.join("\n"));
  const firstSnapshot = await startPromise;
  assert.equal(firstSnapshot.status, "qr_ready");
  assert.equal(firstSnapshot.sessionId, "session-1");
  assert.match(firstSnapshot.qrAscii || "", /█▀▀▀▀▀█/u);
  assert.equal(typeof firstSnapshot.qrSvgDataUrl, "string");
});

test("CurrentLoginSessionStore reuses the same live session for concurrent start calls", async () => {
  const adapter = new ControlledExecAdapter();
  const store = new CurrentLoginSessionStore({
    execAdapter: adapter,
    startWaitTimeoutMs: 1_000,
    snapshotRetentionMs: 1_000,
  });

  const firstPromise = store.startOrReuse();
  const secondPromise = store.startOrReuse();

  adapter.push(LOGIN_OUTPUT_WITH_QR);
  const [first, second] = await Promise.all([firstPromise, secondPromise]);

  assert.equal(adapter.starts.length, 1);
  assert.equal(first.sessionId, second.sessionId);
});

test("CurrentLoginSessionStore cancelCurrent returns null when there is no session", () => {
  const store = new CurrentLoginSessionStore({
    execAdapter: new ControlledExecAdapter(),
  });

  assert.equal(store.cancelCurrent(), null);
  assert.equal(store.getCurrentSnapshot(), null);
});

test("CurrentLoginSessionStore cancelCurrent returns a cancelled snapshot", async () => {
  const adapter = new ControlledExecAdapter();
  const store = new CurrentLoginSessionStore({
    deploymentId: "dep-whatsapp",
    execAdapter: adapter,
    startWaitTimeoutMs: 1_000,
    snapshotRetentionMs: 1_000,
    now: () => new Date("2026-04-09T12:00:00.000Z"),
  });

  void store.startOrReuse();
  adapter.push(LOGIN_OUTPUT_WAITING_QR);

  const cancelled = store.cancelCurrent();
  assert.equal(cancelled?.status, "cancelled");
  assert.equal(cancelled?.isTerminal, true);
});

test("CurrentLoginSessionStore restart starts a new session and waits for a new QR", async () => {
  const adapter = new ControlledExecAdapter();
  const store = new CurrentLoginSessionStore({
    execAdapter: adapter,
    startWaitTimeoutMs: 1_000,
    snapshotRetentionMs: 1_000,
    sessionIdFactory: (() => {
      let counter = 0;
      return () => `session-${++counter}`;
    })(),
  });

  void store.startOrReuse();
  adapter.push(LOGIN_OUTPUT_WAITING_QR);

  const restartPromise = store.restart();
  adapter.push(LOGIN_OUTPUT_WITH_QR);
  const restarted = await restartPromise;

  assert.equal(restarted.sessionId, "session-2");
  assert.equal(restarted.status, "qr_ready");
});

test("CurrentLoginSessionStore keeps the connected terminal snapshot after exit", async () => {
  const adapter = new ControlledExecAdapter();
  const store = new CurrentLoginSessionStore({
    deploymentId: "dep-whatsapp",
    execAdapter: adapter,
    startWaitTimeoutMs: 1_000,
    snapshotRetentionMs: 1_000,
    now: () => new Date("2026-04-09T12:00:00.000Z"),
  });

  const startPromise = store.startOrReuse();
  adapter.push(LOGIN_OUTPUT_WITH_QR);
  const initialSnapshot = await startPromise;
  assert.equal(initialSnapshot.status, "qr_ready");

  adapter.push("\nWhatsApp connected successfully.\n");
  adapter.exit(0);

  const finalSnapshot = store.getCurrentSnapshot();
  assert.equal(finalSnapshot?.status, "connected");
  assert.equal(finalSnapshot?.exitCode, 0);
  assert.equal("runtime" in (finalSnapshot || {}), false);
});

test("CurrentLoginSessionStore notifies terminal listeners when the login command finishes", async () => {
  const adapter = new ControlledExecAdapter();
  const terminalSnapshots: string[] = [];
  const store = new CurrentLoginSessionStore({
    execAdapter: adapter,
    startWaitTimeoutMs: 1_000,
    snapshotRetentionMs: 1_000,
    onTerminal: async (snapshot) => {
      terminalSnapshots.push(snapshot.status);
    },
  });

  const startPromise = store.startOrReuse();
  adapter.push(LOGIN_OUTPUT_WITH_QR);
  await startPromise;

  adapter.push("\nWhatsApp connected successfully.\n");
  adapter.exit(0);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(terminalSnapshots, ["connected"]);
});
