import type { WhatsAppLoginStatus } from "./types.js";

export type DetectedOutcome = {
  status: Extract<WhatsAppLoginStatus, "connected" | "failed" | "cancelled">;
  message: string;
};

const SUCCESS_PATTERNS = [
  /\bconnected\b/i,
  /\blogin successful\b/i,
  /\bsuccessfully linked\b/i,
  /\balready logged in\b/i,
];

const FAILURE_PATTERNS = [
  /\bwhatsapp login failed\b/i,
  /\bpairing failed\b/i,
  /\blink(?:ed)? device login failed\b/i,
  /\bfailed to (?:connect|link|pair)\b/i,
  /\bunable to (?:authenticate|link|pair)\b/i,
  /\bconnection failure\b/i,
  /\bunauthorized\b/i,
];

const CANCEL_PATTERNS = [/\bcancelled\b/i, /\bcanceled\b/i];

export const detectTerminalOutcome = (
  plainOutput: string
): DetectedOutcome | null => {
  for (const pattern of CANCEL_PATTERNS) {
    if (pattern.test(plainOutput)) {
      return {
        status: "cancelled",
        message: "WhatsApp login was cancelled.",
      };
    }
  }

  for (const pattern of SUCCESS_PATTERNS) {
    if (pattern.test(plainOutput)) {
      return {
        status: "connected",
        message: "WhatsApp login connected.",
      };
    }
  }

  for (const pattern of FAILURE_PATTERNS) {
    if (pattern.test(plainOutput)) {
      return {
        status: "failed",
        message: "WhatsApp login failed.",
      };
    }
  }

  return null;
};
