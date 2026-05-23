import { defaultLocale, locales, normalizeLocale } from "./locale";

const normalizePathname = (pathname: string): string => {
  if (!pathname) {
    return "/";
  }

  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (withLeadingSlash !== "/" && withLeadingSlash.endsWith("/")) {
    return withLeadingSlash.slice(0, -1);
  }
  return withLeadingSlash;
};

const normalizeSiteUrl = (siteUrl: string): string =>
  siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;

export const localizePathname = (locale: string, pathname: string): string => {
  const normalizedPath = normalizePathname(pathname);
  const resolvedLocale = normalizeLocale(locale) ?? defaultLocale;

  if (resolvedLocale === defaultLocale) {
    return normalizedPath;
  }

  if (normalizedPath === "/") {
    return `/${resolvedLocale}`;
  }

  return `/${resolvedLocale}${normalizedPath}`;
};

export const getAbsoluteLocalizedUrl = (
  siteUrl: string,
  locale: string,
  pathname: string
): string => `${normalizeSiteUrl(siteUrl)}${localizePathname(locale, pathname)}`;

export const buildAlternateLanguageUrls = (
  siteUrl: string,
  pathname: string
): Record<string, string> => {
  const languages: Record<string, string> = {};

  for (const locale of locales) {
    languages[locale] = getAbsoluteLocalizedUrl(siteUrl, locale, pathname);
  }

  languages["x-default"] = getAbsoluteLocalizedUrl(siteUrl, defaultLocale, pathname);

  return languages;
};
