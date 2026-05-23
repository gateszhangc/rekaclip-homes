import RekaFaqSection from "@/components/landing/reka-faq-section";
import RekaFaqShell from "@/components/landing/reka-faq-shell";
import { getFaqPage } from "@/services/page";
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
  const canonicalUrl = getAbsoluteLocalizedUrl(siteUrl, locale, "/faq");
  const languages = buildAlternateLanguageUrls(siteUrl, "/faq");
  const page = await getFaqPage(locale);
  const title = page.faq?.title ?? "FAQ";

  return {
    title: `${title} | Reka Clip`,
    description: page.faq?.description,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
  };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getFaqPage(locale);

  if (!page.faq || page.faq.disabled) return null;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.items.map((item) => ({
      "@type": "Question",
      name: item.title,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.description,
      },
    })),
  };

  return (
    <RekaFaqShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <RekaFaqSection data={page.faq} />
    </RekaFaqShell>
  );
}
