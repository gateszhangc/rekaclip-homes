export const WHATSAPP_LOGIN_STATUSES = [
  "starting",
  "waiting_qr",
  "qr_ready",
  "connected",
  "failed",
  "cancelled",
] as const;

export type WhatsAppLoginStatus = (typeof WHATSAPP_LOGIN_STATUSES)[number];

export type WhatsAppLoginTarget = {
  namespace: string;
  pod: string;
  container: string;
  command: string[];
};

export type WhatsAppLoginSessionSnapshot = {
  sessionId: string;
  status: WhatsAppLoginStatus;
  message: string;
  rawOutput: string;
  plainOutput: string;
  qrAscii: string | null;
  qrSvgDataUrl: string | null;
  qrUpdatedAt: string | null;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  isTerminal: boolean;
};

export type PublicWhatsAppLoginSnapshot = {
  sessionId: string;
  status: WhatsAppLoginStatus;
  message: string;
  rawOutput: string;
  plainOutput: string;
  qrAscii: string | null;
  qrSvgDataUrl: string | null;
  qrUpdatedAt: string | null;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  isTerminal: boolean;
};

export const isTerminalWhatsAppLoginStatus = (
  status: WhatsAppLoginStatus
): boolean =>
  status === "connected" || status === "failed" || status === "cancelled";

export const toPublicWhatsAppLoginSnapshot = (
  snapshot: WhatsAppLoginSessionSnapshot
): PublicWhatsAppLoginSnapshot => ({
  sessionId: snapshot.sessionId,
  status: snapshot.status,
  message: snapshot.message,
  rawOutput: snapshot.rawOutput,
  plainOutput: snapshot.plainOutput,
  qrAscii: snapshot.qrAscii,
  qrSvgDataUrl: snapshot.qrSvgDataUrl,
  qrUpdatedAt: snapshot.qrUpdatedAt,
  startedAt: snapshot.startedAt,
  updatedAt: snapshot.updatedAt,
  finishedAt: snapshot.finishedAt,
  exitCode: snapshot.exitCode,
  isTerminal: snapshot.isTerminal,
});
