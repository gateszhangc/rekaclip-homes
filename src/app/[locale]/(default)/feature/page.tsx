import RekaFeatureSection from "@/components/landing/reka-feature-section";
import RekaFeatureShell from "@/components/landing/reka-feature-shell";
import { getFeaturePage } from "@/services/page";
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
  const canonicalUrl = getAbsoluteLocalizedUrl(siteUrl, locale, "/feature");
  const languages = buildAlternateLanguageUrls(siteUrl, "/feature");
  const page = await getFeaturePage(locale);
  const title = page.feature?.title ?? "Feature";

  return {
    title: `${title} | Reka Clip`,
    description: page.feature?.description,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
  };
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getFeaturePage(locale);

  if (!page.feature) return null;

  return (
    <RekaFeatureShell>
      <RekaFeatureSection data={page.feature} />
    </RekaFeatureShell>
  );
}
