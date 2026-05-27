const DEFAULT_SITE_URL = "https://rekaclip.homes";

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeSiteUrl = (value: string) => {
  const normalized = value.startsWith("http") ? value : `https://${value}`;
  const url = new URL(normalized);

  if (url.hostname === "rekaclip.homes") {
    url.hostname = "www.rekaclip.homes";
  }

  return stripTrailingSlash(url.toString());
};

export const getSiteUrl = () => {
  const envUrl =
    process.env.NEXT_PUBLIC_WEB_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL ||
    DEFAULT_SITE_URL;

  return normalizeSiteUrl(envUrl);
};
