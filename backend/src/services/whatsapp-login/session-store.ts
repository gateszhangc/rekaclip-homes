import { randomUUID } from "node:crypto";
import {
  WHATSAPP_LOGIN_SNAPSHOT_RETENTION_MS,
  WHATSAPP_LOGIN_START_WAIT_TIMEOUT_MS,
} from "./config.js";
import { toPlainTerminalOutput } from "./ansi.js";
import { detectTerminalOutcome } from "./outcome.js";
import { extractLatestQrAscii, qrAsciiToSvgDataUrl } from "./qr.js";
import type { LoginExecAdapter } from "./exec/types.js";
import {
  type WhatsAppLoginSessionSnapshot,
  type WhatsAppLoginStatus,
  isTerminalWhatsAppLoginStatus,
} from "./types.js";

type SessionStoreOptions = {
  deploymentId?: string;
  execAdapter: LoginExecAdapter;
  startWaitTimeoutMs?: number;
  snapshotRetentionMs?: number;
  now?: () => Date;
  sessionIdFactory?: () => string;
  onTerminal?: (
    snapshot: WhatsAppLoginSessionSnapshot
  ) => void | Promise<void>;
};

type StartWaiter = {
  resolve: (snapshot: WhatsAppLoginSessionSnapshot) => void;
};

type LiveSession = {
  snapshot: WhatsAppLoginSessionSnapshot;
  abortController: AbortController;
  qrWaitTimeout: NodeJS.Timeout | null;
  retentionTimeout: NodeJS.Timeout | null;
  stoppedByOperator: boolean;
  waiters: Set<StartWaiter>;
};

const START_TIMEOUT_MESSAGE =
  "Timed out waiting for the first WhatsApp QR code.";

export class CurrentLoginSessionStore {
  private readonly execAdapter: LoginExecAdapter;
  private readonly startWaitTimeoutMs: number;
  private readonly snapshotRetentionMs: number;
  private readonly now: () => Date;
  private readonly sessionIdFactory: () => string;
  private readonly onTerminal?: (
    snapshot: WhatsAppLoginSessionSnapshot
  ) => void | Promise<void>;
  private currentSession: LiveSession | null = null;

  constructor(options: SessionStoreOptions) {
    this.execAdapter = options.execAdapter;
    this.startWaitTimeoutMs =
      options.startWaitTimeoutMs ?? WHATSAPP_LOGIN_START_WAIT_TIMEOUT_MS;
    this.snapshotRetentionMs =
      options.snapshotRetentionMs ?? WHATSAPP_LOGIN_SNAPSHOT_RETENTION_MS;
    this.now = options.now ?? (() => new Date());
    this.sessionIdFactory = options.sessionIdFactory ?? (() => randomUUID());
    this.onTerminal = options.onTerminal;
  }

  getCurrentSnapshot(): WhatsAppLoginSessionSnapshot | null {
    this.cleanupExpiredSession();
    return this.currentSession ? cloneSnapshot(this.currentSession.snapshot) : null;
  }

  async startOrReuse(): Promise<WhatsAppLoginSessionSnapshot> {
    this.cleanupExpiredSession();

    if (
      this.currentSession === null ||
      isTerminalWhatsAppLoginStatus(this.currentSession.snapshot.status)
    ) {
      const session = this.createSession();
      this.currentSession = session;
      void this.runSession(session);
    }

    return this.waitForStartResult(this.currentSession);
  }

  async restart(): Promise<WhatsAppLoginSessionSnapshot> {
    this.cleanupExpiredSession();

    if (
      this.currentSession !== null &&
      !isTerminalWhatsAppLoginStatus(this.currentSession.snapshot.status)
    ) {
      this.stopSession(
        this.currentSession,
        "cancelled",
        "WhatsApp login restarted by operator.",
        this.currentSession.snapshot.exitCode
      );
    }

    const session = this.createSession();
    this.currentSession = session;
    void this.runSession(session);
    return this.waitForStartResult(session);
  }

  cancelCurrent(): WhatsAppLoginSessionSnapshot | null {
    this.cleanupExpiredSession();

    if (this.currentSession === null) {
      return null;
    }

    if (isTerminalWhatsAppLoginStatus(this.currentSession.snapshot.status)) {
      return cloneSnapshot(this.currentSession.snapshot);
    }

    this.stopSession(
      this.currentSession,
      "cancelled",
      "WhatsApp login cancelled by user.",
      this.currentSession.snapshot.exitCode
    );

    return cloneSnapshot(this.currentSession.snapshot);
  }

  private createSession(): LiveSession {
    const timestamp = this.timestamp();
    const session: LiveSession = {
      snapshot: {
        sessionId: this.sessionIdFactory(),
        status: "starting",
        message: "Starting WhatsApp login command.",
        rawOutput: "",
        plainOutput: "",
        qrAscii: null,
        qrSvgDataUrl: null,
        qrUpdatedAt: null,
        startedAt: timestamp,
        updatedAt: timestamp,
        finishedAt: null,
        exitCode: null,
        isTerminal: false,
      },
      abortController: new AbortController(),
      qrWaitTimeout: null,
      retentionTimeout: null,
      stoppedByOperator: false,
      waiters: new Set(),
    };

    session.qrWaitTimeout = setTimeout(() => {
      if (this.canResolveStart(session)) {
        return;
      }

      this.stopSession(session, "failed", START_TIMEOUT_MESSAGE, null);
    }, this.startWaitTimeoutMs);

    return session;
  }

  private async runSession(session: LiveSession): Promise<void> {
    try {
      await this.execAdapter.start({
        signal: session.abortController.signal,
        onData: (chunk) => {
          this.appendOutput(session, chunk);
        },
        onExit: (exitCode) => {
          this.handleExit(session, exitCode);
        },
        onError: (error) => {
          if (session.abortController.signal.aborted && session.stoppedByOperator) {
            return;
          }

          this.finalizeSession(
            session,
            "failed",
            toErrorMessage(error, "Failed to execute WhatsApp login command."),
            session.snapshot.exitCode
          );
        },
      });

      if (
        !isTerminalWhatsAppLoginStatus(session.snapshot.status) &&
        !session.abortController.signal.aborted
      ) {
        this.finalizeSession(
          session,
          "failed",
          "WhatsApp login exec stream ended without a terminal status.",
          session.snapshot.exitCode
        );
      }
    } catch (error) {
      if (session.abortController.signal.aborted && session.stoppedByOperator) {
        return;
      }

      this.finalizeSession(
        session,
        "failed",
        toErrorMessage(error, "Failed to execute WhatsApp login command."),
        session.snapshot.exitCode
      );
    }
  }

  private appendOutput(session: LiveSession, chunk: string): void {
    session.snapshot.rawOutput += chunk;
    session.snapshot.plainOutput = toPlainTerminalOutput(session.snapshot.rawOutput);
    session.snapshot.updatedAt = this.timestamp();

    if (
      session.snapshot.status === "starting" &&
      session.snapshot.plainOutput.trim().length > 0
    ) {
      session.snapshot.status = "waiting_qr";
      session.snapshot.message = "Waiting for the first WhatsApp QR code.";
    }

    const qrMatch = extractLatestQrAscii(session.snapshot.plainOutput);
    if (qrMatch !== null && qrMatch.ascii !== session.snapshot.qrAscii) {
      const hadPreviousQr = session.snapshot.qrAscii !== null;
      session.snapshot.qrAscii = qrMatch.ascii;
      session.snapshot.qrSvgDataUrl = qrAsciiToSvgDataUrl(qrMatch.ascii);
      session.snapshot.qrUpdatedAt = this.timestamp();

      if (!isTerminalWhatsAppLoginStatus(session.snapshot.status)) {
        session.snapshot.status = "qr_ready";
        session.snapshot.message = hadPreviousQr
          ? "WhatsApp QR code refreshed."
          : "First WhatsApp QR code ready.";
      }

      if (session.qrWaitTimeout !== null) {
        clearTimeout(session.qrWaitTimeout);
        session.qrWaitTimeout = null;
      }

      this.notifyStartWaiters(session);
    }

    const outcome = detectTerminalOutcome(session.snapshot.plainOutput);
    if (outcome !== null) {
      this.finalizeSession(
        session,
        outcome.status,
        outcome.message,
        session.snapshot.exitCode
      );
    }
  }

  private handleExit(session: LiveSession, exitCode: number | null): void {
    if (session.stoppedByOperator) {
      if (exitCode !== null) {
        session.snapshot.exitCode = exitCode;
        session.snapshot.updatedAt = this.timestamp();
      }
      return;
    }

    if (isTerminalWhatsAppLoginStatus(session.snapshot.status)) {
      session.snapshot.exitCode = exitCode ?? session.snapshot.exitCode;
      session.snapshot.updatedAt = this.timestamp();
      if (session.snapshot.finishedAt === null) {
        session.snapshot.finishedAt = this.timestamp();
      }
      this.scheduleRetentionCleanup(session);
      this.notifyStartWaiters(session);
      return;
    }

    const detected = detectTerminalOutcome(session.snapshot.plainOutput);
    if (detected !== null) {
      this.finalizeSession(session, detected.status, detected.message, exitCode);
      return;
    }

    this.finalizeSession(
      session,
      exitCode === 0 ? "connected" : "failed",
      exitCode === 0
        ? "WhatsApp login command finished successfully."
        : exitCode === null
          ? "WhatsApp login command ended without an exit code."
          : `WhatsApp login command exited with code ${exitCode}.`,
      exitCode
    );
  }

  private finalizeSession(
    session: LiveSession,
    status: Extract<WhatsAppLoginStatus, "connected" | "failed" | "cancelled">,
    message: string,
    exitCode: number | null
  ): void {
    if (session.snapshot.status === "cancelled" && status !== "cancelled") {
      session.snapshot.exitCode = exitCode ?? session.snapshot.exitCode;
      session.snapshot.updatedAt = this.timestamp();
      if (session.snapshot.finishedAt === null) {
        session.snapshot.finishedAt = this.timestamp();
      }
      this.scheduleRetentionCleanup(session);
      this.notifyStartWaiters(session);
      return;
    }

    if (!isTerminalWhatsAppLoginStatus(session.snapshot.status)) {
      session.snapshot.status = status;
      session.snapshot.message = message;
      session.snapshot.isTerminal = true;
    }

    session.snapshot.exitCode = exitCode ?? session.snapshot.exitCode;
    session.snapshot.updatedAt = this.timestamp();
    if (session.snapshot.finishedAt === null) {
      session.snapshot.finishedAt = this.timestamp();
    }

    if (session.qrWaitTimeout !== null) {
      clearTimeout(session.qrWaitTimeout);
      session.qrWaitTimeout = null;
    }

    this.scheduleRetentionCleanup(session);
    this.notifyStartWaiters(session);
    this.notifyTerminal(session);
  }

  private stopSession(
    session: LiveSession,
    status: Extract<WhatsAppLoginStatus, "failed" | "cancelled">,
    message: string,
    exitCode: number | null
  ): void {
    session.stoppedByOperator = status === "cancelled";
    this.finalizeSession(session, status, message, exitCode);
    session.abortController.abort();
  }

  private waitForStartResult(
    session: LiveSession
  ): Promise<WhatsAppLoginSessionSnapshot> {
    if (this.canResolveStart(session)) {
      return Promise.resolve(cloneSnapshot(session.snapshot));
    }

    return new Promise<WhatsAppLoginSessionSnapshot>((resolve) => {
      const waiter: StartWaiter = { resolve };
      session.waiters.add(waiter);
      if (this.canResolveStart(session)) {
        this.resolveWaiter(session, waiter);
      }
    });
  }

  private canResolveStart(session: LiveSession): boolean {
    return (
      session.snapshot.status === "qr_ready" ||
      isTerminalWhatsAppLoginStatus(session.snapshot.status)
    );
  }

  private notifyTerminal(session: LiveSession): void {
    if (!session.snapshot.isTerminal || !this.onTerminal) {
      return;
    }

    const snapshot = cloneSnapshot(session.snapshot);
    queueMicrotask(() => {
      void this.onTerminal?.(snapshot);
    });
  }

  private notifyStartWaiters(session: LiveSession): void {
    if (!this.canResolveStart(session)) {
      return;
    }

    for (const waiter of [...session.waiters]) {
      this.resolveWaiter(session, waiter);
    }
  }

  private resolveWaiter(session: LiveSession, waiter: StartWaiter): void {
    session.waiters.delete(waiter);
    waiter.resolve(cloneSnapshot(session.snapshot));
  }

  private scheduleRetentionCleanup(session: LiveSession): void {
    if (session.retentionTimeout !== null) {
      return;
    }

    session.retentionTimeout = setTimeout(() => {
      if (
        this.currentSession !== null &&
        this.currentSession.snapshot.sessionId === session.snapshot.sessionId &&
        isTerminalWhatsAppLoginStatus(this.currentSession.snapshot.status)
      ) {
        this.currentSession = null;
      }
    }, this.snapshotRetentionMs);
  }

  private cleanupExpiredSession(): void {
    if (
      this.currentSession === null ||
      this.currentSession.snapshot.finishedAt === null
    ) {
      return;
    }

    const finishedAt = new Date(this.currentSession.snapshot.finishedAt).getTime();
    if (Number.isNaN(finishedAt)) {
      return;
    }

    if (this.now().getTime() - finishedAt > this.snapshotRetentionMs) {
      if (this.currentSession.qrWaitTimeout !== null) {
        clearTimeout(this.currentSession.qrWaitTimeout);
      }
      if (this.currentSession.retentionTimeout !== null) {
        clearTimeout(this.currentSession.retentionTimeout);
      }
      this.currentSession = null;
    }
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}

const cloneSnapshot = (
  snapshot: WhatsAppLoginSessionSnapshot
): WhatsAppLoginSessionSnapshot => ({
  ...snapshot,
});

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
};
