import type { RekaBoostData } from "@/components/landing/reka-boost-section";
import type { RekaFaqData } from "@/components/landing/reka-faq-section";
import { LandingPage, PricingPage, ShowcasePage } from "@/types/pages/landing";
import { toFileLocale } from "@/i18n/locale";

export interface FeaturePageData {
  feature?: {
    title: string;
    description: string;
    image: { src: string; alt: string };
    items: string[];
    tracking: {
      title: string;
      description: string;
      video: { src: string; alt: string };
    };
  };
}

export interface BoostPageData {
  boost?: RekaBoostData;
}

export interface FaqPageData {
  faq?: RekaFaqData;
}

export async function getLandingPage(locale: string): Promise<LandingPage> {
  // Force cache invalidation
  return (await getPage("landing", locale)) as LandingPage;
}

export async function getFeaturePage(locale: string): Promise<FeaturePageData> {
  return (await getPage("feature", locale)) as FeaturePageData;
}

export async function getBoostPage(locale: string): Promise<BoostPageData> {
  return (await getPage("boost", locale)) as BoostPageData;
}

export async function getFaqPage(locale: string): Promise<FaqPageData> {
  return (await getPage("faq", locale)) as FaqPageData;
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
): Promise<LandingPage | PricingPage | ShowcasePage | FeaturePageData> {
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
