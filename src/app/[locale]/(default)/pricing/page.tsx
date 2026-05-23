import Pricing from "@/components/blocks/pricing";
import { getPricingPage } from "@/services/page";
import { getSiteUrl } from "@/lib/site-url";
import {
  buildAlternateLanguageUrls,
  getAbsoluteLocalizedUrl,
} from "@/i18n/url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const siteUrl = getSiteUrl();
  const canonicalUrl = getAbsoluteLocalizedUrl(siteUrl, locale, "/pricing");
  const languages = buildAlternateLanguageUrls(siteUrl, "/pricing");
  const page = await getPricingPage(locale);
  const title = page.pricing?.title ?? "Pricing";
  const description = page.pricing?.description;

  return {
    title: `${title} | EasyClaw`,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getPricingPage(locale);

  return <>{page.pricing && <Pricing pricing={page.pricing} isStandalone />}</>;
}
