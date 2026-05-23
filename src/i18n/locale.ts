export const locales = [
  "en",
  "zh",
  "zh-Hant",
  "ja",
  "ko",
  "de",
  "fr",
  "it",
  "es",
  "pt",
  "hi",
  "ar",
  "bn",
  "id",
  "ms",
  "th",
  "he",
  "ru",
  "ur",
  "tr",
  "vi",
  "fa",
  "mr",
  "ta",
  "pl",
  "te",
  "ne",
  "da",
  "fi",
  "nl",
  "no",
  "sv",
] as string[];

export const defaultLocale = "en";
// All app pages live under the [locale] segment, so the default locale must
// stay prefixed as well. Using "as-needed" caused / -> /en rewrites to fight
// with /en -> / canonical redirects and produced a 404 homepage.
export const localePrefix = "always";
export const localeDetection = false;
export const localeSwitcherEnabled = false;

export const localeCookieName = "NEXT_LOCALE";
export const localeCookie = {
  name: localeCookieName,
  maxAge: 60 * 60 * 24 * 365, // 1 year
};

export const localeNames: Record<string, string> = {
  en: "English",
  zh: "简体中文",
  "zh-Hant": "繁體中文",
  ja: "日本語",
  ko: "한국어",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  es: "Español",
  pt: "Português",
  hi: "हिन्दी",
  ar: "العربية",
  bn: "বাংলা",
  id: "Bahasa Indonesia",
  ms: "Bahasa Melayu",
  th: "ภาษาไทย",
  he: "עברית",
  ru: "Русский",
  ur: "اردو",
  tr: "Türkçe",
  vi: "Tiếng Việt",
  fa: "فارسی",
  mr: "मराठी",
  ta: "தமிழ்",
  pl: "Polski",
  te: "తెలుగు",
  ne: "नेपाली",
  da: "Dansk",
  fi: "Suomi",
  nl: "Nederlands",
  no: "Norsk",
  sv: "Svenska",
};

export const rtlLocales = ["ar", "he", "ur", "fa"];

export const localeToFileLocale: Record<string, string> = {
  zh: "zh-cn",
  "zh-Hant": "zh-tw",
};

const localeAliases: Record<string, string> = {
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  zh: "zh",
  "zh-cn": "zh",
  "zh-sg": "zh",
  "zh-hans": "zh",
  "zh-hant": "zh-Hant",
  "zh-tw": "zh-Hant",
  "zh-hk": "zh-Hant",
  "zh-mo": "zh-Hant",
};

export const countryToLocaleMap: Record<string, string> = {
  CN: "zh",
  SG: "zh",
  TW: "zh-Hant",
  HK: "zh-Hant",
  MO: "zh-Hant",
  JP: "ja",
  KR: "ko",
  DE: "de",
  AT: "de",
  CH: "de",
  FR: "fr",
  BE: "fr",
  LU: "fr",
  IT: "it",
  ES: "es",
  MX: "es",
  AR: "es",
  CL: "es",
  CO: "es",
  PE: "es",
  VE: "es",
  EC: "es",
  GT: "es",
  CU: "es",
  BO: "es",
  DO: "es",
  HN: "es",
  PY: "es",
  SV: "es",
  NI: "es",
  CR: "es",
  PA: "es",
  UY: "es",
  BR: "pt",
  PT: "pt",
  IN: "hi",
  SA: "ar",
  AE: "ar",
  EG: "ar",
  QA: "ar",
  KW: "ar",
  OM: "ar",
  BH: "ar",
  JO: "ar",
  MA: "ar",
  DZ: "ar",
  TN: "ar",
  BD: "bn",
  ID: "id",
  MY: "ms",
  TH: "th",
  IL: "he",
  RU: "ru",
  PK: "ur",
  TR: "tr",
  VN: "vi",
  IR: "fa",
  PL: "pl",
  NP: "ne",
  DK: "da",
  FI: "fi",
  NL: "nl",
  NO: "no",
  SE: "sv",
};

export const isSupportedLocale = (value: string): boolean =>
  (locales as readonly string[]).includes(value);

export const normalizeLocale = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/_/g, "-").trim();
  if (!normalized) {
    return null;
  }

  if (isSupportedLocale(normalized)) {
    return normalized;
  }

  const lower = normalized.toLowerCase();
  if (localeAliases[lower]) {
    return localeAliases[lower];
  }

  for (const locale of locales) {
    if (locale.toLowerCase() === lower) {
      return locale;
    }
  }

  const base = lower.split("-")[0];
  for (const locale of locales) {
    if (locale.toLowerCase() === base) {
      return locale;
    }
  }

  return null;
};

export const toFileLocale = (locale?: string | null): string => {
  const normalized = normalizeLocale(locale) ?? defaultLocale;
  return localeToFileLocale[normalized] ?? normalized.toLowerCase();
};

export const resolveLocaleFromCountry = (country?: string | null): string => {
  const key = (country || "").trim().toUpperCase();
  if (!key) {
    return defaultLocale;
  }
  return countryToLocaleMap[key] ?? defaultLocale;
};
