import RekaLandingPage, {
  type RekaLandingPageData,
} from "@/components/landing/reka-landing-page";
import {
  getBoostPage,
  getFaqPage,
  getFeaturePage,
  getLandingPage,
  getTestimonialsPage,
} from "@/services/page";

export async function generateMetadata() {
  return {
    title: "Reka Clip - AI Video Clipping Platform | Turn Long Videos into Viral Shorts",
    description:
      "Reka Clip uses AI to turn long videos into shorts in one click. Paste a YouTube or Twitch link, or upload a video to generate viral clips with auto-captions.",
    keywords:
      "reka clip, ai video clipping, viral clips, video to shorts, youtube clipper, twitch clipper, ai captions, video editing",
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [landing, boostPage, featurePage, faqPage, testimonialsPage] = await Promise.all([
    getLandingPage(locale),
    getBoostPage(locale),
    getFeaturePage(locale),
    getFaqPage(locale),
    getTestimonialsPage(locale),
  ]);

  const faq = faqPage.faq;
  const faqSchema =
    faq && !faq.disabled
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.items.map((item) => ({
            "@type": "Question",
            name: item.title,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.description,
            },
          })),
        }
      : null;

  return (
    <>
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <RekaLandingPage
        data={
          {
            ...landing,
            boost: boostPage.boost,
            feature: featurePage.feature,
            faq,
            testimonials: testimonialsPage.testimonials,
          } as RekaLandingPageData
        }
      />
    </>
  );
}
