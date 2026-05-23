import { Metadata } from "next";
import { notFound } from "next/navigation";
import StyleLandingTemplate from "@/components/styles/style-landing-template";
import { getStyleData } from "@/data/styles";
import { getSiteUrl } from "@/lib/site-url";
import {
  buildAlternateLanguageUrls,
  getAbsoluteLocalizedUrl,
} from "@/i18n/url";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    locale: string;
    style: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const data = getStyleData(resolvedParams.style);
  const siteUrl = getSiteUrl();
  const pathname = `/styles/${resolvedParams.style}`;
  const canonicalUrl = getAbsoluteLocalizedUrl(
    siteUrl,
    resolvedParams.locale,
    pathname
  );
  return {
    ...(data?.metadata ?? {}),
    alternates: {
      canonical: canonicalUrl,
      languages: buildAlternateLanguageUrls(siteUrl, pathname),
    },
  };
}

export default async function StylePage({ params }: PageProps) {
  const resolvedParams = await params;
  const data = getStyleData(resolvedParams.style);

  if (!data) {
    notFound();
  }

  const faqItems = data.faq?.items ?? [];
  const faqJsonLd =
    faqItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null;

  return (
    <>
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
      <StyleLandingTemplate data={data} />
    </>
  );
}
