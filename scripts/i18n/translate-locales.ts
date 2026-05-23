import fs from "node:fs/promises";
import path from "node:path";
import { isEnglishOnlyMessageKey } from "./english-only-message-keys";

const PAGE_NAMESPACES = [
  "landing",
  "pricing",
  "showcase",
  "font-recognizer",
  "image-flip-generator",
  "blog",
] as const;

const BASE_MESSAGE_FILE = "src/i18n/messages/en.json";

const PAGE_BASE_FILES = PAGE_NAMESPACES.map((ns) => ({
  namespace: ns,
  file: `src/i18n/pages/${ns}/en.json`,
}));

const SKIP_TRANSLATE_KEYS = new Set([
  "url",
  "src",
  "icon",
  "target",
  "product_id",
  "template",
  "theme",
]);

const GLOSSARY_TERMS = [
  "EasyClaw",
  "OpenClaw",
  "Claude",
  "GPT",
  "Gemini",
  "Telegram",
  "Discord",
  "WhatsApp",
  "Figma",
  "Photoshop",
  "Next.js",
  "React",
  "TailwindCSS",
  "Shadcn/UI",
  "Vercel",
  "PNG",
  "WebP",
  "JPG",
  "JPEG",
  "API",
  "OpenRouter",
];

const PLACEHOLDER_REGEX = /\{[a-zA-Z0-9_]+\}/g;

const localeToGoogleLang = (localeFile: string): string => {
  switch (localeFile.toLowerCase()) {
    case "zh":
    case "zh-cn":
      return "zh-CN";
    case "zh-tw":
      return "zh-TW";
    default:
      return localeFile;
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const shouldTranslate = (pathKey: string, value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const key = pathKey.split(".").pop() || "";
  if (SKIP_TRANSLATE_KEYS.has(key)) return false;

  if (/^https?:\/\//i.test(trimmed)) return false;
  if (trimmed.startsWith("/")) return false;
  if (/^Ri[A-Za-z0-9]+$/.test(trimmed)) return false;

  // Keep technical identifiers stable.
  if (
    ["name", "group", "interval", "currency", "product_name"].includes(key) &&
    /^[a-z0-9_\-/]+$/i.test(trimmed)
  ) {
    return false;
  }

  return true;
};

const collectStrings = (
  input: unknown,
  pathKey: string,
  out: Set<string>
): void => {
  if (Array.isArray(input)) {
    input.forEach((item, idx) => collectStrings(item, `${pathKey}[${idx}]`, out));
    return;
  }

  if (input && typeof input === "object") {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      collectStrings(value, pathKey ? `${pathKey}.${key}` : key, out);
    }
    return;
  }

  if (typeof input === "string" && shouldTranslate(pathKey, input)) {
    out.add(input);
  }
};

const replaceByMap = (
  source: unknown,
  pathKey: string,
  translated: Map<string, string>
): unknown => {
  if (Array.isArray(source)) {
    return source.map((item, idx) =>
      replaceByMap(item, `${pathKey}[${idx}]`, translated)
    );
  }

  if (source && typeof source === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      const nextPath = pathKey ? `${pathKey}.${key}` : key;
      next[key] = replaceByMap(value, nextPath, translated);
    }
    return next;
  }

  if (typeof source === "string" && shouldTranslate(pathKey, source)) {
    return translated.get(source) ?? source;
  }

  return source;
};

const protectTokens = (input: string): { text: string; restore: Map<string, string> } => {
  let text = input;
  const restore = new Map<string, string>();
  let idx = 0;

  const placeholders = input.match(PLACEHOLDER_REGEX) ?? [];
  for (const ph of placeholders) {
    const token = `ZZPH${idx++}ZZ`;
    text = text.replace(ph, token);
    restore.set(token, ph);
  }

  for (const term of GLOSSARY_TERMS) {
    const token = `ZZGL${idx++}ZZ`;
    const pattern = new RegExp(escapeRegExp(term), "g");
    if (pattern.test(text)) {
      text = text.replace(pattern, token);
      restore.set(token, term);
    }
  }

  return { text, restore };
};

const unprotectTokens = (input: string, restore: Map<string, string>): string => {
  let output = input;
  for (const [token, value] of restore.entries()) {
    output = output.replace(new RegExp(escapeRegExp(token), "g"), value);
  }
  return output;
};

const translateChunk = async (
  locale: string,
  chunk: string[]
): Promise<string[]> => {
  const protectedItems = chunk.map((item) => protectTokens(item));
  const payload = protectedItems
    .map((item, index) => `ZZSEG${index}ZZ\n${item.text}\n`)
    .join("\n");

  const params = new URLSearchParams({
    client: "gtx",
    sl: "en",
    tl: locale,
    dt: "t",
    q: payload,
  });

  const url = `https://translate.googleapis.com/translate_a/single?${params.toString()}`;

  let attempts = 0;
  let translatedText = "";
  while (attempts < 4) {
    attempts += 1;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const raw = (await response.json()) as unknown[];
      translatedText = ((raw?.[0] as unknown[]) || [])
        .map((entry) => ((entry as unknown[])?.[0] as string) || "")
        .join("");
      if (!translatedText.trim()) {
        throw new Error("Empty translation payload");
      }
      break;
    } catch (error) {
      if (attempts >= 4) {
        throw error;
      }
      await sleep(250 * attempts);
    }
  }

  const results: string[] = new Array(chunk.length).fill("");
  const regex = /ZZSEG(\d+)ZZ\s*([\s\S]*?)(?=ZZSEG\d+ZZ|$)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(translatedText)) !== null) {
    const index = Number(match[1]);
    const body = match[2]?.trim() ?? "";
    if (Number.isInteger(index) && index >= 0 && index < results.length) {
      results[index] = unprotectTokens(body, protectedItems[index].restore);
    }
  }

  // Fallback: if parsing failed for any segment, keep source for stability.
  for (let i = 0; i < results.length; i += 1) {
    if (!results[i]) {
      results[i] = chunk[i];
    }
  }

  return results;
};

const chunkBySize = (strings: string[]): string[][] => {
  const groups: string[][] = [];
  let current: string[] = [];
  let currentSize = 0;

  for (const text of strings) {
    const nextSize = currentSize + text.length + 32;
    if (current.length >= 18 || nextSize > 2200) {
      groups.push(current);
      current = [];
      currentSize = 0;
    }

    current.push(text);
    currentSize += text.length + 32;
  }

  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
};

const loadJson = async (file: string): Promise<unknown> => {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
};

const writeJson = async (file: string, data: unknown): Promise<void> => {
  const content = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(file, content, "utf8");
};

const stripEnglishOnlyMessageKeys = (
  input: unknown,
  pathKey = ""
): unknown => {
  if (Array.isArray(input)) {
    return input.map((item, idx) =>
      stripEnglishOnlyMessageKeys(item, `${pathKey}[${idx}]`)
    );
  }

  if (input && typeof input === "object") {
    const next: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const nextPath = pathKey ? `${pathKey}.${key}` : key;
      if (isEnglishOnlyMessageKey(nextPath)) {
        continue;
      }

      next[key] = stripEnglishOnlyMessageKeys(value, nextPath);
    }

    return next;
  }

  return input;
};

const getTargetLocaleFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir);
  return entries
    .filter((entry) => entry.endsWith(".json") && entry !== "en.json")
    .map((entry) => entry.replace(/\.json$/, ""))
    .sort();
};

async function main() {
  const baselineFiles = [BASE_MESSAGE_FILE, ...PAGE_BASE_FILES.map((item) => item.file)];
  const baselineData = new Map<string, unknown>();

  for (const file of baselineFiles) {
    baselineData.set(file, await loadJson(file));
  }

  const targetLocales = new Set<string>();

  const messageLocales = await getTargetLocaleFiles("src/i18n/messages");
  messageLocales.forEach((locale) => targetLocales.add(locale));

  for (const ns of PAGE_NAMESPACES) {
    const locales = await getTargetLocaleFiles(`src/i18n/pages/${ns}`);
    locales.forEach((locale) => targetLocales.add(locale));
  }

  const uniqueStrings = new Set<string>();
  for (const [file, data] of baselineData.entries()) {
    collectStrings(data, path.basename(file), uniqueStrings);
  }

  const sourceStrings = [...uniqueStrings];
  console.log(`Locales: ${[...targetLocales].sort().join(", ")}`);
  console.log(`Unique source strings: ${sourceStrings.length}`);

  const translatedByLocale = new Map<string, Map<string, string>>();

  for (const localeFile of [...targetLocales].sort()) {
    const googleLocale = localeToGoogleLang(localeFile);
    const chunks = chunkBySize(sourceStrings);
    const map = new Map<string, string>();

    console.log(`Translating locale ${localeFile} (${googleLocale}) in ${chunks.length} chunks...`);

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      const translated = await translateChunk(googleLocale, chunk);

      for (let j = 0; j < chunk.length; j += 1) {
        map.set(chunk[j], translated[j]);
      }

      if ((i + 1) % 8 === 0 || i === chunks.length - 1) {
        console.log(`  ${localeFile}: ${i + 1}/${chunks.length}`);
      }

      await sleep(80);
    }

    translatedByLocale.set(localeFile, map);
  }

  // Write messages
  const messageBaseline = baselineData.get(BASE_MESSAGE_FILE)!;
  for (const locale of messageLocales) {
    const translated = stripEnglishOnlyMessageKeys(
      replaceByMap(
        messageBaseline,
        path.basename(BASE_MESSAGE_FILE),
        translatedByLocale.get(locale)!
      )
    );
    await writeJson(`src/i18n/messages/${locale}.json`, translated);
  }

  // Write page namespaces
  for (const page of PAGE_BASE_FILES) {
    const baseline = baselineData.get(page.file)!;
    const locales = await getTargetLocaleFiles(`src/i18n/pages/${page.namespace}`);

    for (const locale of locales) {
      const translated = replaceByMap(
        baseline,
        path.basename(page.file),
        translatedByLocale.get(locale)!
      );
      await writeJson(`src/i18n/pages/${page.namespace}/${locale}.json`, translated);
    }
  }

  console.log("Translation complete.");
}

main().catch((error) => {
  console.error("translate-locales failed:", error);
  process.exit(1);
});
