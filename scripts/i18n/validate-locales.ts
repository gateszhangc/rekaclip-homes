import fs from "node:fs/promises";
import { isEnglishOnlyMessageKey } from "./english-only-message-keys";

const PAGE_NAMESPACES = [
  "landing",
  "pricing",
  "showcase",
  "font-recognizer",
  "image-flip-generator",
  "blog",
] as const;

const PLACEHOLDER_REGEX = /\{[a-zA-Z0-9_]+\}/g;
const FORBIDDEN_TERMS = ["Qwen Image Layered", "qwen-image-layered"];

const flatten = (obj: unknown, prefix = "", out: Record<string, string> = {}) => {
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => flatten(item, `${prefix}[${idx}]`, out));
    return out;
  }

  if (obj && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      flatten(value, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }

  out[prefix] = Array.isArray(obj) ? "array" : typeof obj;
  return out;
};

const extractPlaceholders = (value: string): string[] =>
  [...new Set(value.match(PLACEHOLDER_REGEX) ?? [])].sort();

const checkFile = async (baselinePath: string, targetPath: string) => {
  const [baselineRaw, targetRaw] = await Promise.all([
    fs.readFile(baselinePath, "utf8"),
    fs.readFile(targetPath, "utf8"),
  ]);

  const baselineJson = JSON.parse(baselineRaw);
  const targetJson = JSON.parse(targetRaw);

  const baselineFlat = flatten(baselineJson);
  const targetFlat = flatten(targetJson);

  const missing: string[] = [];
  const extra: string[] = [];
  const typeMismatches: string[] = [];
  const placeholderMismatches: string[] = [];

  for (const [key, type] of Object.entries(baselineFlat)) {
    if (!(key in targetFlat)) {
      if (isEnglishOnlyMessageKey(key)) {
        continue;
      }
      missing.push(key);
      continue;
    }

    if (targetFlat[key] !== type) {
      typeMismatches.push(key);
      continue;
    }

    const baselineValue = key
      .split(/\.(?![^\[]*\])/)
      .reduce<any>((acc, part) => {
        if (!part) return acc;
        const match = part.match(/(.+)\[(\d+)\]$/);
        if (match) return acc?.[match[1]]?.[Number(match[2])];
        return acc?.[part];
      }, baselineJson);

    const targetValue = key
      .split(/\.(?![^\[]*\])/)
      .reduce<any>((acc, part) => {
        if (!part) return acc;
        const match = part.match(/(.+)\[(\d+)\]$/);
        if (match) return acc?.[match[1]]?.[Number(match[2])];
        return acc?.[part];
      }, targetJson);

    if (typeof baselineValue === "string" && typeof targetValue === "string") {
      const a = extractPlaceholders(baselineValue).join("|");
      const b = extractPlaceholders(targetValue).join("|");
      if (a !== b) {
        placeholderMismatches.push(key);
      }
    }
  }

  for (const key of Object.keys(targetFlat)) {
    if (!(key in baselineFlat)) {
      extra.push(key);
    }
  }

  const forbiddenHits = FORBIDDEN_TERMS.filter((term) => targetRaw.includes(term));

  return {
    missing,
    extra,
    typeMismatches,
    placeholderMismatches,
    forbiddenHits,
  };
};

async function main() {
  const problems: string[] = [];

  const messageDir = "src/i18n/messages";
  const messageFiles = (await fs.readdir(messageDir)).filter(
    (f) => f.endsWith(".json") && f !== "en.json"
  );

  for (const file of messageFiles) {
    const result = await checkFile(`${messageDir}/en.json`, `${messageDir}/${file}`);
    if (
      result.missing.length ||
      result.extra.length ||
      result.typeMismatches.length ||
      result.placeholderMismatches.length ||
      result.forbiddenHits.length
    ) {
      problems.push(
        `[messages/${file}] missing=${result.missing.length} extra=${result.extra.length} type=${result.typeMismatches.length} placeholders=${result.placeholderMismatches.length} forbidden=${result.forbiddenHits.join(",") || "0"}`
      );
    }
  }

  for (const ns of PAGE_NAMESPACES) {
    const dir = `src/i18n/pages/${ns}`;
    const files = (await fs.readdir(dir)).filter(
      (f) => f.endsWith(".json") && f !== "en.json"
    );

    for (const file of files) {
      const result = await checkFile(`${dir}/en.json`, `${dir}/${file}`);
      if (
        result.missing.length ||
        result.extra.length ||
        result.typeMismatches.length ||
        result.placeholderMismatches.length ||
        result.forbiddenHits.length
      ) {
        problems.push(
          `[pages/${ns}/${file}] missing=${result.missing.length} extra=${result.extra.length} type=${result.typeMismatches.length} placeholders=${result.placeholderMismatches.length} forbidden=${result.forbiddenHits.join(",") || "0"}`
        );
      }
    }
  }

  if (problems.length > 0) {
    console.error("Locale validation failed:\n" + problems.join("\n"));
    process.exit(1);
  }

  console.log("Locale validation passed.");
}

main().catch((error) => {
  console.error("validate-locales failed:", error);
  process.exit(1);
});
