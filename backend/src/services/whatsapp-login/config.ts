export const WHATSAPP_LOGIN_COMMAND = [
  "env",
  "TERM=xterm-256color",
  "COLUMNS=120",
  "LINES=60",
  "openclaw",
  "channels",
  "login",
  "--channel",
  "whatsapp",
];

export const WHATSAPP_LOGIN_START_WAIT_TIMEOUT_MS = Number(
  process.env.WHATSAPP_LOGIN_START_WAIT_TIMEOUT_MS || 120_000
);

export const WHATSAPP_LOGIN_SNAPSHOT_RETENTION_MS = Number(
  process.env.WHATSAPP_LOGIN_SNAPSHOT_RETENTION_MS || 10 * 60_000
);

export const WHATSAPP_LOGIN_CONNECTION_TIMEOUT_MS = Number(
  process.env.WHATSAPP_LOGIN_CONNECTION_TIMEOUT_MS || 15 * 60_000
);

export const WHATSAPP_QR_ANCHOR =
  "Scan this QR in WhatsApp (Linked Devices):";
