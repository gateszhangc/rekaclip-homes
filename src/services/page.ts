import { LandingPage, PricingPage, ShowcasePage } from "@/types/pages/landing";
import { toFileLocale } from "@/i18n/locale";

export async function getLandingPage(locale: string): Promise<LandingPage> {
  // Force cache invalidation
  return (await getPage("landing", locale)) as LandingPage;
}

export async function getPricingPage(locale: string): Promise<PricingPage> {
  return (await getPage("pricing", locale)) as PricingPage;
}

export async function getShowcasePage(locale: string): Promise<ShowcasePage> {
  return (await getPage("showcase", locale)) as ShowcasePage;
}

export async function getPage(
  name: string,
  locale: string
): Promise<LandingPage | PricingPage | ShowcasePage> {
  try {
    const fileLocale = toFileLocale(locale);

    return await import(
      `@/i18n/pages/${name}/${fileLocale}.json`
    ).then((module) => module.default);
  } catch (error) {
    console.warn(`Failed to load ${locale}.json, falling back to en.json`);

    return await import(`@/i18n/pages/${name}/en.json`).then(
      (module) => module.default
    );
  }
}
