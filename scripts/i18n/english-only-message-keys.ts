export const ENGLISH_ONLY_MESSAGE_KEY_PREFIXES = [
  "simpleclaw_landing.errors.whatsapp_",
  "simpleclaw_landing.deploy.hint_prefix_whatsapp",
  "simpleclaw_landing.whatsapp.",
] as const;

export const isEnglishOnlyMessageKey = (key: string): boolean =>
  ENGLISH_ONLY_MESSAGE_KEY_PREFIXES.some(
    (prefix) => key === prefix || key.startsWith(prefix)
  );
