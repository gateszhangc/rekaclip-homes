export const WHATSAPP_LOGIN_STATUSES = [
    "starting",
    "waiting_qr",
    "qr_ready",
    "connected",
    "failed",
    "cancelled",
];
export const isTerminalWhatsAppLoginStatus = (status) => status === "connected" || status === "failed" || status === "cancelled";
export const toPublicWhatsAppLoginSnapshot = (snapshot) => ({
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
