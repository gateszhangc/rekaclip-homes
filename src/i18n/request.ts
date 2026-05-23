import { getRequestConfig } from "next-intl/server";
import { normalizeLocale, toFileLocale } from "./locale";
import { routing } from "./routing";

const PAGE_NAMESPACES = [
  "landing",
  "pricing",
  "showcase",
  "font-recognizer",
  "image-flip-generator",
  "blog",
];

export default getRequestConfig(async ({ requestLocale }) => {
  const requestLocaleValue = await requestLocale;
  const locale = normalizeLocale(requestLocaleValue) ?? routing.defaultLocale;
  const fileLocale = toFileLocale(locale);

  try {
    const baseMessages = (await import(`./messages/${fileLocale}.json`)).default;

    // Merge in page-level namespaces so components can resolve translations.
    const pageMessages = await Promise.allSettled(
      PAGE_NAMESPACES.map((ns) =>
        import(`./pages/${ns}/${fileLocale}.json`)
      )
    );

    const mergedPageMessages = pageMessages.reduce((acc, result) => {
      if (result.status === "fulfilled") {
        return { ...acc, ...result.value.default };
      }
      return acc;
    }, {});

    const messages = { ...baseMessages, ...mergedPageMessages };

    return {
      locale,
      messages: messages,
    };
  } catch (e) {
    return {
      locale: "en",
      messages: {
        ...(await import(`./messages/en.json`)).default,
        ...(await import("./pages/landing/en.json")).default,
        ...(await import("./pages/pricing/en.json")).default,
        ...(await import("./pages/showcase/en.json")).default,
        ...(await import("./pages/font-recognizer/en.json")).default,
        ...(await import("./pages/image-flip-generator/en.json")).default,
        ...(await import("./pages/blog/en.json")).default,
      },
    };
  }
});
