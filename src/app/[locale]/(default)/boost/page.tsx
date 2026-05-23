import RekaBoostSection from "@/components/landing/reka-boost-section";
import RekaBoostShell from "@/components/landing/reka-boost-shell";
import { getBoostPage } from "@/services/page";
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
  const canonicalUrl = getAbsoluteLocalizedUrl(siteUrl, locale, "/boost");
  const languages = buildAlternateLanguageUrls(siteUrl, "/boost");
  const page = await getBoostPage(locale);
  const title = page.boost?.hero?.label ?? "Boost";

  return {
    title: `${title} | Reka Clip`,
    description: page.boost?.hero?.description,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
  };
}

export default async function BoostPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getBoostPage(locale);

  if (!page.boost) return null;

  return (
    <RekaBoostShell>
      <RekaBoostSection data={page.boost} />
    </RekaBoostShell>
  );
}
