(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push(["chunks/[root of the server]__7892a770._.js", {

"[externals]/node:async_hooks [external] (node:async_hooks, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}}),
"[externals]/node:buffer [external] (node:buffer, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}}),
"[project]/src/i18n/locale.ts [middleware-edge] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "countryToLocaleMap": (()=>countryToLocaleMap),
    "defaultLocale": (()=>defaultLocale),
    "isSupportedLocale": (()=>isSupportedLocale),
    "localeCookie": (()=>localeCookie),
    "localeCookieName": (()=>localeCookieName),
    "localeDetection": (()=>localeDetection),
    "localeNames": (()=>localeNames),
    "localePrefix": (()=>localePrefix),
    "localeSwitcherEnabled": (()=>localeSwitcherEnabled),
    "localeToFileLocale": (()=>localeToFileLocale),
    "locales": (()=>locales),
    "normalizeLocale": (()=>normalizeLocale),
    "resolveLocaleFromCountry": (()=>resolveLocaleFromCountry),
    "rtlLocales": (()=>rtlLocales),
    "toFileLocale": (()=>toFileLocale)
});
const locales = [
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
    "sv"
];
const defaultLocale = "en";
const localePrefix = "always";
const localeDetection = false;
const localeSwitcherEnabled = false;
const localeCookieName = "NEXT_LOCALE";
const localeCookie = {
    name: localeCookieName,
    maxAge: 60 * 60 * 24 * 365
};
const localeNames = {
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
    sv: "Svenska"
};
const rtlLocales = [
    "ar",
    "he",
    "ur",
    "fa"
];
const localeToFileLocale = {
    zh: "zh-cn",
    "zh-Hant": "zh-tw"
};
const localeAliases = {
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
    "zh-mo": "zh-Hant"
};
const countryToLocaleMap = {
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
    SE: "sv"
};
const isSupportedLocale = (value)=>locales.includes(value);
const normalizeLocale = (value)=>{
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
    for (const locale of locales){
        if (locale.toLowerCase() === lower) {
            return locale;
        }
    }
    const base = lower.split("-")[0];
    for (const locale of locales){
        if (locale.toLowerCase() === base) {
            return locale;
        }
    }
    return null;
};
const toFileLocale = (locale)=>{
    const normalized = normalizeLocale(locale) ?? defaultLocale;
    return localeToFileLocale[normalized] ?? normalized.toLowerCase();
};
const resolveLocaleFromCountry = (country)=>{
    const key = (country || "").trim().toUpperCase();
    if (!key) {
        return defaultLocale;
    }
    return countryToLocaleMap[key] ?? defaultLocale;
};
}}),
"[project]/src/i18n/routing.ts [middleware-edge] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "routing": (()=>routing)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$locale$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/i18n/locale.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$routing$2f$defineRouting$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__default__as__defineRouting$3e$__ = __turbopack_context__.i("[project]/node_modules/next-intl/dist/esm/development/routing/defineRouting.js [middleware-edge] (ecmascript) <export default as defineRouting>");
;
;
const routing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$routing$2f$defineRouting$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__default__as__defineRouting$3e$__["defineRouting"])({
    locales: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$locale$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["locales"],
    defaultLocale: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$locale$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["defaultLocale"],
    localePrefix: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$locale$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["localePrefix"],
    localeDetection: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$locale$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["localeDetection"],
    localeCookie: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$locale$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["localeCookie"]
});
}}),
"[project]/src/lib/db-write-freeze.ts [middleware-edge] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "DB_WRITE_FREEZE_ERROR_CODE": (()=>DB_WRITE_FREEZE_ERROR_CODE),
    "DB_WRITE_FREEZE_MESSAGE": (()=>DB_WRITE_FREEZE_MESSAGE),
    "DbWriteFreezeError": (()=>DbWriteFreezeError),
    "assertDbWriteAllowed": (()=>assertDbWriteAllowed),
    "createDbWriteFreezeResponse": (()=>createDbWriteFreezeResponse),
    "getDbWriteFreezePayload": (()=>getDbWriteFreezePayload),
    "isDbWriteFreezeEnabled": (()=>isDbWriteFreezeEnabled),
    "isDbWriteFreezeError": (()=>isDbWriteFreezeError),
    "isWriteMethod": (()=>isWriteMethod)
});
const DB_WRITE_FREEZE_ERROR_CODE = "DB_WRITE_FREEZE";
const DB_WRITE_FREEZE_MESSAGE = "Database writes are temporarily paused for maintenance. Please retry in a few minutes.";
const WRITE_METHODS = new Set([
    "POST",
    "PUT",
    "PATCH",
    "DELETE"
]);
class DbWriteFreezeError extends Error {
    code = DB_WRITE_FREEZE_ERROR_CODE;
    statusCode = 503;
    scope;
    constructor(scope){
        super(DB_WRITE_FREEZE_MESSAGE);
        this.name = "DbWriteFreezeError";
        this.scope = scope;
    }
}
function isDbWriteFreezeEnabled() {
    return (process.env.DB_WRITE_FREEZE || "").trim().toLowerCase() === "true";
}
function isWriteMethod(method) {
    return WRITE_METHODS.has((method || "").toUpperCase());
}
function getDbWriteFreezePayload() {
    return {
        code: -1,
        message: DB_WRITE_FREEZE_MESSAGE,
        error: DB_WRITE_FREEZE_MESSAGE,
        error_code: DB_WRITE_FREEZE_ERROR_CODE,
        errorCode: DB_WRITE_FREEZE_ERROR_CODE
    };
}
function createDbWriteFreezeResponse() {
    return Response.json(getDbWriteFreezePayload(), {
        status: 503
    });
}
function assertDbWriteAllowed(scope) {
    if (isDbWriteFreezeEnabled()) {
        throw new DbWriteFreezeError(scope);
    }
}
function isDbWriteFreezeError(error) {
    return error instanceof DbWriteFreezeError;
}
}}),
"[project]/src/middleware.ts [middleware-edge] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "config": (()=>config),
    "default": (()=>middleware)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/spec-extension/response.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$middleware$2f$middleware$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-intl/dist/esm/development/middleware/middleware.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$routing$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/i18n/routing.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2d$write$2d$freeze$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db-write-freeze.ts [middleware-edge] (ecmascript)");
;
;
;
;
const intlMiddleware = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$middleware$2f$middleware$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["default"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$routing$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["routing"]);
function middleware(req) {
    if (req.nextUrl.pathname.startsWith("/api")) {
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2d$write$2d$freeze$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isDbWriteFreezeEnabled"])() && (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2d$write$2d$freeze$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isWriteMethod"])(req.method)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2d$write$2d$freeze$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["getDbWriteFreezePayload"])(), {
                status: 503
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    return intlMiddleware(req);
}
const config = {
    matcher: [
        "/api/:path*",
        "/((?!api|_next|_vercel|.*\\..*).*)"
    ]
};
}}),
}]);

//# sourceMappingURL=%5Broot%20of%20the%20server%5D__7892a770._.js.map