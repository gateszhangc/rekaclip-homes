import RekaPricingSection from "@/components/landing/reka-pricing-section";
import RekaPricingShell from "@/components/landing/reka-pricing-shell";
import RekaSiteFooter from "@/components/landing/reka-site-footer";
import { getLandingPage, getPricingPage } from "@/services/page";
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

  return {
    title: `${title} | Reka Clip`,
    description: page.pricing?.description,
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
  const [page, landing] = await Promise.all([
    getPricingPage(locale),
    getLandingPage(locale),
  ]);

  if (!page.pricing) return null;

  return (
    <RekaPricingShell>
      <RekaPricingSection pricing={page.pricing} />
      {landing.footer && <RekaSiteFooter footer={landing.footer} />}
    </RekaPricingShell>
  );
}
