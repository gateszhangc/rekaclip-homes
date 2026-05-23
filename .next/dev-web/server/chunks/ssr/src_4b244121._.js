module.exports = {

"[project]/src/i18n/locale.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
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
"[project]/src/i18n/routing.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "routing": (()=>routing)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$locale$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/i18n/locale.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$routing$2f$defineRouting$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__defineRouting$3e$__ = __turbopack_context__.i("[project]/node_modules/next-intl/dist/esm/development/routing/defineRouting.js [app-rsc] (ecmascript) <export default as defineRouting>");
;
;
const routing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$routing$2f$defineRouting$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__defineRouting$3e$__["defineRouting"])({
    locales: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$locale$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["locales"],
    defaultLocale: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$locale$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["defaultLocale"],
    localePrefix: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$locale$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["localePrefix"],
    localeDetection: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$locale$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["localeDetection"],
    localeCookie: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$locale$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["localeCookie"]
});
}}),
"[project]/src/i18n/request.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>__TURBOPACK__default__export__)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$server$2f$react$2d$server$2f$getRequestConfig$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__getRequestConfig$3e$__ = __turbopack_context__.i("[project]/node_modules/next-intl/dist/esm/development/server/react-server/getRequestConfig.js [app-rsc] (ecmascript) <export default as getRequestConfig>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$locale$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/i18n/locale.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$routing$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/i18n/routing.ts [app-rsc] (ecmascript)");
;
;
;
const PAGE_NAMESPACES = [
    "landing",
    "pricing",
    "showcase",
    "font-recognizer",
    "image-flip-generator",
    "blog"
];
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$server$2f$react$2d$server$2f$getRequestConfig$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__getRequestConfig$3e$__["getRequestConfig"])(async ({ requestLocale })=>{
    const requestLocaleValue = await requestLocale;
    const locale = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$locale$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["normalizeLocale"])(requestLocaleValue) ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$routing$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["routing"].defaultLocale;
    const fileLocale = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$i18n$2f$locale$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toFileLocale"])(locale);
    try {
        const baseMessages = (await __turbopack_context__.f({
            "./messages/ar.json": {
                id: ()=>"[project]/src/i18n/messages/ar.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/ar.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/bn.json": {
                id: ()=>"[project]/src/i18n/messages/bn.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/bn.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/da.json": {
                id: ()=>"[project]/src/i18n/messages/da.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/da.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/de.json": {
                id: ()=>"[project]/src/i18n/messages/de.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/de.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/en.json": {
                id: ()=>"[project]/src/i18n/messages/en.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/en.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/es.json": {
                id: ()=>"[project]/src/i18n/messages/es.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/es.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/fa.json": {
                id: ()=>"[project]/src/i18n/messages/fa.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/fa.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/fi.json": {
                id: ()=>"[project]/src/i18n/messages/fi.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/fi.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/fr.json": {
                id: ()=>"[project]/src/i18n/messages/fr.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/fr.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/he.json": {
                id: ()=>"[project]/src/i18n/messages/he.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/he.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/hi.json": {
                id: ()=>"[project]/src/i18n/messages/hi.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/hi.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/id.json": {
                id: ()=>"[project]/src/i18n/messages/id.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/id.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/it.json": {
                id: ()=>"[project]/src/i18n/messages/it.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/it.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/ja.json": {
                id: ()=>"[project]/src/i18n/messages/ja.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/ja.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/ko.json": {
                id: ()=>"[project]/src/i18n/messages/ko.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/ko.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/mr.json": {
                id: ()=>"[project]/src/i18n/messages/mr.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/mr.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/ms.json": {
                id: ()=>"[project]/src/i18n/messages/ms.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/ms.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/ne.json": {
                id: ()=>"[project]/src/i18n/messages/ne.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/ne.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/nl.json": {
                id: ()=>"[project]/src/i18n/messages/nl.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/nl.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/no.json": {
                id: ()=>"[project]/src/i18n/messages/no.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/no.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/pl.json": {
                id: ()=>"[project]/src/i18n/messages/pl.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/pl.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/pt.json": {
                id: ()=>"[project]/src/i18n/messages/pt.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/pt.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/ru.json": {
                id: ()=>"[project]/src/i18n/messages/ru.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/ru.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/sv.json": {
                id: ()=>"[project]/src/i18n/messages/sv.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/sv.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/ta.json": {
                id: ()=>"[project]/src/i18n/messages/ta.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/ta.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/te.json": {
                id: ()=>"[project]/src/i18n/messages/te.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/te.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/th.json": {
                id: ()=>"[project]/src/i18n/messages/th.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/th.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/tr.json": {
                id: ()=>"[project]/src/i18n/messages/tr.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/tr.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/ur.json": {
                id: ()=>"[project]/src/i18n/messages/ur.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/ur.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/vi.json": {
                id: ()=>"[project]/src/i18n/messages/vi.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/vi.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/zh-cn.json": {
                id: ()=>"[project]/src/i18n/messages/zh-cn.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/zh-cn.json (json, async loader)")(__turbopack_context__.i)
            },
            "./messages/zh-tw.json": {
                id: ()=>"[project]/src/i18n/messages/zh-tw.json (json, async loader)",
                module: ()=>__turbopack_context__.r("[project]/src/i18n/messages/zh-tw.json (json, async loader)")(__turbopack_context__.i)
            }
        }).import(`./messages/${fileLocale}.json`)).default;
        // Merge in page-level namespaces so components can resolve translations.
        const pageMessages = await Promise.allSettled(PAGE_NAMESPACES.map((ns)=>__turbopack_context__.f({
                "./pages/landing/ar.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ar.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ar.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/bn.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/bn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/bn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/da.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/da.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/da.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/de.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/de.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/de.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/en.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/en.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/en.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/es.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/es.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/es.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/fa.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/fa.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/fa.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/fi.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/fi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/fi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/fr.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/fr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/fr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/he.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/he.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/he.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/hi.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/hi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/hi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/id.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/id.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/id.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/it.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/it.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/it.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/ja.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ja.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ja.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/ko.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ko.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ko.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/mr.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/mr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/mr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/ms.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ms.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ms.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/ne.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ne.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ne.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/nl.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/nl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/nl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/no.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/no.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/no.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/pl.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/pl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/pl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/pt.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/pt.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/pt.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/ru.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ru.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ru.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/sv.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/sv.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/sv.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/ta.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ta.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ta.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/te.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/te.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/te.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/th.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/th.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/th.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/tr.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/tr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/tr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/ur.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ur.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ur.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/vi.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/vi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/vi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/zh-cn.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/zh-cn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/zh-cn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/zh-tw.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/zh-tw.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/zh-tw.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/landing/zh.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/zh.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/zh.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/ar.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ar.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ar.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/bn.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/bn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/bn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/da.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/da.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/da.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/de.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/de.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/de.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/en.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/en.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/en.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/es.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/es.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/es.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/fa.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/fa.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/fa.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/fi.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/fi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/fi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/fr.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/fr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/fr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/he.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/he.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/he.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/hi.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/hi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/hi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/id.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/id.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/id.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/it.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/it.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/it.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/ja.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ja.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ja.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/ko.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ko.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ko.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/mr.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/mr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/mr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/ms.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ms.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ms.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/ne.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ne.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ne.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/nl.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/nl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/nl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/no.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/no.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/no.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/pl.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/pl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/pl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/pt.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/pt.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/pt.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/ru.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ru.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ru.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/sv.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/sv.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/sv.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/ta.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ta.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ta.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/te.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/te.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/te.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/th.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/th.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/th.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/tr.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/tr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/tr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/ur.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ur.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ur.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/vi.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/vi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/vi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/zh-cn.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/zh-cn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/zh-cn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/zh-tw.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/zh-tw.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/zh-tw.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/pricing/zh.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/zh.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/zh.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/ar.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ar.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ar.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/bn.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/bn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/bn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/da.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/da.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/da.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/de.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/de.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/de.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/en.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/en.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/en.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/es.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/es.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/es.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/fa.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/fa.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/fa.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/fi.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/fi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/fi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/fr.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/fr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/fr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/he.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/he.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/he.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/hi.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/hi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/hi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/id.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/id.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/id.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/it.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/it.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/it.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/ja.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ja.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ja.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/ko.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ko.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ko.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/mr.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/mr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/mr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/ms.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ms.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ms.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/ne.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ne.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ne.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/nl.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/nl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/nl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/no.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/no.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/no.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/pl.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/pl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/pl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/pt.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/pt.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/pt.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/ru.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ru.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ru.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/sv.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/sv.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/sv.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/ta.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ta.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ta.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/te.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/te.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/te.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/th.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/th.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/th.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/tr.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/tr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/tr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/ur.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ur.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ur.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/vi.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/vi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/vi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/zh-cn.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/zh-cn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/zh-cn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/zh-tw.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/zh-tw.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/zh-tw.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/showcase/zh.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/zh.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/zh.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/ar.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ar.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ar.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/bn.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/bn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/bn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/da.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/da.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/da.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/de.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/de.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/de.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/en.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/en.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/en.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/es.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/es.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/es.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/fa.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/fa.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/fa.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/fi.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/fi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/fi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/fr.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/fr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/fr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/he.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/he.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/he.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/hi.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/hi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/hi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/id.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/id.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/id.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/it.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/it.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/it.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/ja.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ja.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ja.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/ko.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ko.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ko.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/mr.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/mr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/mr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/ms.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ms.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ms.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/ne.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ne.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ne.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/nl.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/nl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/nl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/no.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/no.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/no.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/pl.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/pl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/pl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/pt.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/pt.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/pt.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/ru.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ru.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ru.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/sv.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/sv.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/sv.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/ta.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ta.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ta.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/te.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/te.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/te.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/th.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/th.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/th.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/tr.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/tr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/tr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/ur.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ur.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ur.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/vi.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/vi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/vi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/zh-cn.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/zh-cn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/zh-cn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/zh-tw.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/zh-tw.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/zh-tw.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/font-recognizer/zh.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/zh.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/zh.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/ar.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ar.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ar.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/bn.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/bn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/bn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/da.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/da.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/da.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/de.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/de.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/de.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/en.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/en.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/en.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/es.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/es.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/es.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/fa.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/fa.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/fa.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/fi.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/fi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/fi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/fr.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/fr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/fr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/he.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/he.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/he.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/hi.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/hi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/hi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/id.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/id.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/id.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/it.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/it.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/it.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/ja.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ja.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ja.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/ko.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ko.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ko.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/mr.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/mr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/mr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/ms.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ms.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ms.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/ne.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ne.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ne.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/nl.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/nl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/nl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/no.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/no.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/no.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/pl.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/pl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/pl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/pt.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/pt.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/pt.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/ru.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ru.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ru.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/sv.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/sv.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/sv.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/ta.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ta.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ta.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/te.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/te.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/te.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/th.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/th.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/th.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/tr.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/tr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/tr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/ur.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ur.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ur.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/vi.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/vi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/vi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/zh-cn.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/zh-cn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/zh-cn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/zh-tw.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/zh-tw.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/zh-tw.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/image-flip-generator/zh.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/zh.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/zh.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/ar.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ar.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ar.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/bn.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/bn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/bn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/da.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/da.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/da.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/de.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/de.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/de.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/en.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/en.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/en.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/es.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/es.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/es.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/fa.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/fa.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/fa.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/fi.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/fi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/fi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/fr.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/fr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/fr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/he.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/he.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/he.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/hi.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/hi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/hi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/id.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/id.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/id.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/it.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/it.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/it.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/ja.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ja.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ja.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/ko.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ko.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ko.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/mr.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/mr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/mr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/ms.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ms.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ms.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/ne.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ne.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ne.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/nl.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/nl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/nl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/no.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/no.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/no.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/pl.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/pl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/pl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/pt.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/pt.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/pt.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/ru.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ru.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ru.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/sv.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/sv.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/sv.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/ta.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ta.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ta.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/te.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/te.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/te.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/th.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/th.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/th.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/tr.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/tr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/tr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/ur.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ur.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ur.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/vi.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/vi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/vi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/zh-cn.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/zh-cn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/zh-cn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/zh-tw.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/zh-tw.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/zh-tw.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages/blog/zh.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/zh.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/zh.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/ar.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ar.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ar.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/bn.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/bn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/bn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/da.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/da.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/da.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/de.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/de.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/de.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/en.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/en.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/en.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/es.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/es.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/es.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/fa.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/fa.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/fa.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/fi.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/fi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/fi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/fr.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/fr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/fr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/he.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/he.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/he.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/hi.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/hi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/hi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/id.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/id.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/id.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/it.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/it.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/it.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/ja.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ja.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ja.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/ko.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ko.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ko.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/mr.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/mr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/mr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/ms.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ms.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ms.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/ne.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ne.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ne.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/nl.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/nl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/nl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/no.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/no.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/no.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/pl.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/pl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/pl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/pt.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/pt.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/pt.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/ru.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ru.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ru.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/sv.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/sv.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/sv.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/ta.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ta.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ta.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/te.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/te.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/te.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/th.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/th.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/th.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/tr.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/tr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/tr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/ur.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/ur.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/ur.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/vi.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/vi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/vi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/zh-cn.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/zh-cn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/zh-cn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/zh-tw.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/zh-tw.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/zh-tw.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//blog/zh.json": {
                    id: ()=>"[project]/src/i18n/pages/blog/zh.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/blog/zh.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/ar.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ar.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ar.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/bn.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/bn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/bn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/da.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/da.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/da.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/de.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/de.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/de.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/en.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/en.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/en.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/es.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/es.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/es.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/fa.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/fa.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/fa.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/fi.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/fi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/fi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/fr.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/fr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/fr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/he.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/he.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/he.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/hi.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/hi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/hi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/id.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/id.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/id.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/it.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/it.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/it.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/ja.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ja.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ja.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/ko.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ko.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ko.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/mr.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/mr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/mr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/ms.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ms.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ms.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/ne.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ne.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ne.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/nl.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/nl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/nl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/no.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/no.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/no.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/pl.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/pl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/pl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/pt.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/pt.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/pt.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/ru.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ru.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ru.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/sv.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/sv.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/sv.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/ta.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ta.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ta.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/te.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/te.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/te.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/th.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/th.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/th.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/tr.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/tr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/tr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/ur.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/ur.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/ur.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/vi.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/vi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/vi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/zh-cn.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/zh-cn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/zh-cn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/zh-tw.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/zh-tw.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/zh-tw.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//font-recognizer/zh.json": {
                    id: ()=>"[project]/src/i18n/pages/font-recognizer/zh.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/zh.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/ar.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ar.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ar.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/bn.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/bn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/bn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/da.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/da.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/da.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/de.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/de.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/de.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/en.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/en.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/en.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/es.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/es.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/es.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/fa.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/fa.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/fa.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/fi.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/fi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/fi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/fr.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/fr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/fr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/he.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/he.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/he.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/hi.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/hi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/hi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/id.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/id.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/id.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/it.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/it.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/it.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/ja.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ja.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ja.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/ko.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ko.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ko.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/mr.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/mr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/mr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/ms.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ms.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ms.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/ne.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ne.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ne.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/nl.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/nl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/nl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/no.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/no.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/no.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/pl.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/pl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/pl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/pt.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/pt.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/pt.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/ru.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ru.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ru.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/sv.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/sv.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/sv.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/ta.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ta.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ta.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/te.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/te.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/te.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/th.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/th.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/th.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/tr.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/tr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/tr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/ur.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/ur.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/ur.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/vi.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/vi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/vi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/zh-cn.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/zh-cn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/zh-cn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/zh-tw.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/zh-tw.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/zh-tw.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//image-flip-generator/zh.json": {
                    id: ()=>"[project]/src/i18n/pages/image-flip-generator/zh.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/zh.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/ar.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ar.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ar.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/bn.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/bn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/bn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/da.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/da.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/da.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/de.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/de.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/de.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/en.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/en.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/en.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/es.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/es.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/es.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/fa.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/fa.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/fa.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/fi.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/fi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/fi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/fr.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/fr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/fr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/he.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/he.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/he.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/hi.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/hi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/hi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/id.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/id.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/id.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/it.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/it.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/it.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/ja.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ja.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ja.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/ko.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ko.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ko.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/mr.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/mr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/mr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/ms.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ms.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ms.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/ne.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ne.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ne.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/nl.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/nl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/nl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/no.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/no.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/no.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/pl.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/pl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/pl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/pt.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/pt.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/pt.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/ru.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ru.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ru.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/sv.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/sv.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/sv.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/ta.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ta.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ta.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/te.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/te.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/te.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/th.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/th.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/th.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/tr.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/tr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/tr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/ur.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/ur.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/ur.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/vi.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/vi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/vi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/zh-cn.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/zh-cn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/zh-cn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/zh-tw.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/zh-tw.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/zh-tw.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//landing/zh.json": {
                    id: ()=>"[project]/src/i18n/pages/landing/zh.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/landing/zh.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/ar.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ar.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ar.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/bn.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/bn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/bn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/da.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/da.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/da.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/de.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/de.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/de.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/en.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/en.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/en.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/es.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/es.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/es.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/fa.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/fa.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/fa.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/fi.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/fi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/fi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/fr.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/fr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/fr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/he.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/he.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/he.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/hi.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/hi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/hi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/id.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/id.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/id.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/it.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/it.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/it.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/ja.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ja.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ja.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/ko.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ko.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ko.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/mr.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/mr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/mr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/ms.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ms.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ms.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/ne.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ne.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ne.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/nl.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/nl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/nl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/no.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/no.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/no.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/pl.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/pl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/pl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/pt.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/pt.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/pt.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/ru.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ru.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ru.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/sv.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/sv.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/sv.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/ta.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ta.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ta.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/te.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/te.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/te.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/th.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/th.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/th.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/tr.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/tr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/tr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/ur.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/ur.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/ur.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/vi.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/vi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/vi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/zh-cn.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/zh-cn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/zh-cn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/zh-tw.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/zh-tw.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/zh-tw.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//pricing/zh.json": {
                    id: ()=>"[project]/src/i18n/pages/pricing/zh.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/pricing/zh.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/ar.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ar.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ar.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/bn.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/bn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/bn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/da.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/da.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/da.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/de.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/de.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/de.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/en.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/en.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/en.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/es.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/es.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/es.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/fa.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/fa.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/fa.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/fi.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/fi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/fi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/fr.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/fr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/fr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/he.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/he.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/he.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/hi.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/hi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/hi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/id.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/id.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/id.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/it.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/it.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/it.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/ja.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ja.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ja.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/ko.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ko.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ko.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/mr.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/mr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/mr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/ms.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ms.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ms.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/ne.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ne.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ne.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/nl.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/nl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/nl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/no.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/no.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/no.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/pl.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/pl.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/pl.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/pt.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/pt.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/pt.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/ru.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ru.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ru.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/sv.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/sv.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/sv.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/ta.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ta.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ta.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/te.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/te.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/te.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/th.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/th.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/th.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/tr.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/tr.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/tr.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/ur.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/ur.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/ur.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/vi.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/vi.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/vi.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/zh-cn.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/zh-cn.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/zh-cn.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/zh-tw.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/zh-tw.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/zh-tw.json (json, async loader)")(__turbopack_context__.i)
                },
                "./pages//showcase/zh.json": {
                    id: ()=>"[project]/src/i18n/pages/showcase/zh.json (json, async loader)",
                    module: ()=>__turbopack_context__.r("[project]/src/i18n/pages/showcase/zh.json (json, async loader)")(__turbopack_context__.i)
                }
            }).import(`./pages/${ns}/${fileLocale}.json`)));
        const mergedPageMessages = pageMessages.reduce((acc, result)=>{
            if (result.status === "fulfilled") {
                return {
                    ...acc,
                    ...result.value.default
                };
            }
            return acc;
        }, {});
        const messages = {
            ...baseMessages,
            ...mergedPageMessages
        };
        return {
            locale,
            messages: messages
        };
    } catch (e) {
        return {
            locale: "en",
            messages: {
                ...(await __turbopack_context__.r("[project]/src/i18n/messages/en.json (json, async loader)")(__turbopack_context__.i)).default,
                ...(await __turbopack_context__.r("[project]/src/i18n/pages/landing/en.json (json, async loader)")(__turbopack_context__.i)).default,
                ...(await __turbopack_context__.r("[project]/src/i18n/pages/pricing/en.json (json, async loader)")(__turbopack_context__.i)).default,
                ...(await __turbopack_context__.r("[project]/src/i18n/pages/showcase/en.json (json, async loader)")(__turbopack_context__.i)).default,
                ...(await __turbopack_context__.r("[project]/src/i18n/pages/font-recognizer/en.json (json, async loader)")(__turbopack_context__.i)).default,
                ...(await __turbopack_context__.r("[project]/src/i18n/pages/image-flip-generator/en.json (json, async loader)")(__turbopack_context__.i)).default,
                ...(await __turbopack_context__.r("[project]/src/i18n/pages/blog/en.json (json, async loader)")(__turbopack_context__.i)).default
            }
        };
    }
});
}}),
"[project]/src/app/layout.tsx [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>RootLayout)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$server$2f$react$2d$server$2f$getLocale$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__getLocale$3e$__ = __turbopack_context__.i("[project]/node_modules/next-intl/dist/esm/development/server/react-server/getLocale.js [app-rsc] (ecmascript) <export default as getLocale>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$server$2f$react$2d$server$2f$RequestLocaleCache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__setCachedRequestLocale__as__setRequestLocale$3e$__ = __turbopack_context__.i("[project]/node_modules/next-intl/dist/esm/development/server/react-server/RequestLocaleCache.js [app-rsc] (ecmascript) <export setCachedRequestLocale as setRequestLocale>");
;
;
;
async function RootLayout({ children }) {
    const locale = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$server$2f$react$2d$server$2f$getLocale$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__getLocale$3e$__["getLocale"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$intl$2f$dist$2f$esm$2f$development$2f$server$2f$react$2d$server$2f$RequestLocaleCache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__setCachedRequestLocale__as__setRequestLocale$3e$__["setRequestLocale"])(locale);
    const googleAdsenseCode = ("TURBOPACK compile-time value", "") || "";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("html", {
        lang: locale,
        suppressHydrationWarning: true,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("head", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("meta", {
                        name: "viewport",
                        content: "width=device-width, initial-scale=1.0"
                    }, void 0, false, {
                        fileName: "[project]/src/app/layout.tsx",
                        lineNumber: 18,
                        columnNumber: 9
                    }, this),
                    googleAdsenseCode && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("meta", {
                        name: "google-adsense-account",
                        content: googleAdsenseCode
                    }, void 0, false, {
                        fileName: "[project]/src/app/layout.tsx",
                        lineNumber: 20,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "dns-prefetch",
                        href: "https://fonts.googleapis.com"
                    }, void 0, false, {
                        fileName: "[project]/src/app/layout.tsx",
                        lineNumber: 24,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "dns-prefetch",
                        href: "https://fonts.gstatic.com"
                    }, void 0, false, {
                        fileName: "[project]/src/app/layout.tsx",
                        lineNumber: 25,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "dns-prefetch",
                        href: "https://www.googletagmanager.com"
                    }, void 0, false, {
                        fileName: "[project]/src/app/layout.tsx",
                        lineNumber: 26,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "dns-prefetch",
                        href: "https://clarity.ms"
                    }, void 0, false, {
                        fileName: "[project]/src/app/layout.tsx",
                        lineNumber: 27,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "preconnect",
                        href: "https://fonts.googleapis.com"
                    }, void 0, false, {
                        fileName: "[project]/src/app/layout.tsx",
                        lineNumber: 29,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "preconnect",
                        href: "https://fonts.gstatic.com",
                        crossOrigin: "anonymous"
                    }, void 0, false, {
                        fileName: "[project]/src/app/layout.tsx",
                        lineNumber: 30,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "icon",
                        href: "/favicon.svg",
                        type: "image/svg+xml"
                    }, void 0, false, {
                        fileName: "[project]/src/app/layout.tsx",
                        lineNumber: 32,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/layout.tsx",
                lineNumber: 17,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("body", {
                className: "font-sans antialiased",
                children: children
            }, void 0, false, {
                fileName: "[project]/src/app/layout.tsx",
                lineNumber: 34,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/layout.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
}}),

};

//# sourceMappingURL=src_4b244121._.js.map