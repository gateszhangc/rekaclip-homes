import { randomUUID } from "node:crypto";
import type {
  DashboardLogEntry,
  DashboardLogLevel,
  DashboardSessionSnapshot,
  DashboardTarget,
} from "./types.js";
import { maskDashboardUrl } from "./url.js";

const LOG_RETENTION_LIMIT = 18;

export interface DashboardRuntimeHandle {
  localPort: number;
  dashboardUrl: string;
  target: DashboardTarget;
  stop: () => Promise<void>;
}

export interface DashboardRuntimeAdapter {
  launch(options: {
    onLog: (level: DashboardLogLevel, message: string) => void;
    onUnexpectedExit: (message: string) => void;
    target: DashboardTarget;
  }): Promise<DashboardRuntimeHandle>;
}

type SessionStoreOptions = {
  runtimeAdapter: DashboardRuntimeAdapter;
  now?: () => Date;
  sessionIdFactory?: () => string;
  logIdFactory?: () => string;
};

type LiveSession = {
  snapshot: DashboardSessionSnapshot;
  handle: DashboardRuntimeHandle | null;
  startPromise: Promise<DashboardSessionSnapshot> | null;
};

export class CurrentDashboardSessionStore {
  private readonly runtimeAdapter: DashboardRuntimeAdapter;
  private readonly now: () => Date;
  private readonly sessionIdFactory: () => string;
  private readonly logIdFactory: () => string;
  private currentSession: LiveSession | null = null;

  constructor(options: SessionStoreOptions) {
    this.runtimeAdapter = options.runtimeAdapter;
    this.now = options.now ?? (() => new Date());
    this.sessionIdFactory = options.sessionIdFactory ?? (() => randomUUID());
    this.logIdFactory = options.logIdFactory ?? (() => randomUUID());
  }

  getCurrentSnapshot(): DashboardSessionSnapshot | null {
    return this.currentSession ? cloneSnapshot(this.currentSession.snapshot) : null;
  }

  async startOrReuse(target: DashboardTarget): Promise<DashboardSessionSnapshot> {
    if (this.currentSession?.snapshot.status === "ready") {
      return cloneSnapshot(this.currentSession.snapshot);
    }

    if (this.currentSession?.startPromise) {
      return this.currentSession.startPromise;
    }

    const session = this.createSession(target);
    this.currentSession = session;
    session.startPromise = this.runStart(session, target);
    return session.startPromise;
  }

  async stopCurrent(): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    const { handle } = this.currentSession;
    this.currentSession = null;

    if (handle) {
      await handle.stop();
    }

    return true;
  }

  private createSession(target: DashboardTarget): LiveSession {
    const timestamp = this.timestamp();

    return {
      snapshot: {
        sessionId: this.sessionIdFactory(),
        status: "starting",
        localPort: null,
        dashboardUrl: null,
        maskedDashboardUrl: null,
        startedAt: timestamp,
        updatedAt: timestamp,
        lastError: null,
        logs: [],
        target,
      },
      handle: null,
      startPromise: null,
    };
  }

  private async runStart(
    session: LiveSession,
    target: DashboardTarget
  ): Promise<DashboardSessionSnapshot> {
    this.appendLog(session, "info", `Resolved current pod ${target.pod}.`);

    try {
      const handle = await this.runtimeAdapter.launch({
        target,
        onLog: (level, message) => {
          this.appendLog(session, level, message);
        },
        onUnexpectedExit: (message) => {
          if (this.currentSession !== session) {
            return;
          }

          session.snapshot.status = "failed";
          session.snapshot.lastError = message;
          session.snapshot.updatedAt = this.timestamp();
          this.appendLog(session, "error", message);
        },
      });

      if (this.currentSession !== session) {
        await handle.stop();
        return cloneSnapshot(session.snapshot);
      }

      session.handle = handle;
      session.snapshot.status = "ready";
      session.snapshot.localPort = handle.localPort;
      session.snapshot.dashboardUrl = handle.dashboardUrl;
      session.snapshot.maskedDashboardUrl = maskDashboardUrl(handle.dashboardUrl);
      session.snapshot.lastError = null;
      session.snapshot.target = handle.target;
      session.snapshot.updatedAt = this.timestamp();
      this.appendLog(session, "info", "Gateway Dashboard is ready.");

      return cloneSnapshot(session.snapshot);
    } catch (error) {
      const message = toErrorMessage(
        error,
        "Failed to start the Gateway Dashboard session."
      );
      session.snapshot.status = "failed";
      session.snapshot.lastError = message;
      session.snapshot.updatedAt = this.timestamp();
      this.appendLog(session, "error", message);
      return cloneSnapshot(session.snapshot);
    } finally {
      session.startPromise = null;
    }
  }

  private appendLog(
    session: LiveSession,
    level: DashboardLogLevel,
    message: string
  ): void {
    const entry: DashboardLogEntry = {
      id: this.logIdFactory(),
      level,
      message,
      at: this.timestamp(),
    };

    session.snapshot.logs = [entry, ...session.snapshot.logs].slice(
      0,
      LOG_RETENTION_LIMIT
    );
    session.snapshot.updatedAt = entry.at;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}

function cloneSnapshot(snapshot: DashboardSessionSnapshot): DashboardSessionSnapshot {
  return {
    ...snapshot,
    logs: snapshot.logs.map((entry) => ({ ...entry })),
    target: { ...snapshot.target },
  };
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

