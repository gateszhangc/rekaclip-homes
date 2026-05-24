import RekaLandingPage, {
  type RekaLandingPageData,
} from "@/components/landing/reka-landing-page";
import {
  getBlogPage,
  getBoostPage,
  getFaqPage,
  getFeaturePage,
  getLandingPage,
  getTestimonialsPage,
} from "@/services/page";
import { getPublishedRekaBlogPosts } from "@/services/reka-blog";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata() {
  const siteUrl = getSiteUrl();
  const title = "Reka Clip — AI-Powered Video Clipping & Content Creation Platform";
  const description =
    "Reka Clip is an AI-powered video clipping platform for creators. Automatically extract highlights, generate captions, repurpose long-form content, and create shareable clips with multimodal AI. Built by Reka.";
  const ogDescription =
    "Reka Clip is an AI-powered video clipping platform for creators. Automatically extract highlights, generate captions, repurpose long-form content, and create shareable clips with multimodal AI.";
  const ogImage = `${siteUrl}/assets/og-image.png`;

  return {
    title,
    description,
    keywords:
      "Reka Clip, AI video clipping, video highlights, content creation, multimodal AI, video repurposing, AI captioning, clip generator, creator tools, Reka AI",
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      type: "website",
      url: siteUrl,
      title,
      description: ogDescription,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: ogDescription,
      images: [ogImage],
    },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [landing, boostPage, featurePage, faqPage, testimonialsPage, blogPage, blogPosts] =
    await Promise.all([
      getLandingPage(locale),
      getBoostPage(locale),
      getFeaturePage(locale),
      getFaqPage(locale),
      getTestimonialsPage(locale),
      getBlogPage(locale),
      getPublishedRekaBlogPosts(locale),
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
            blog: blogPage.blog,
            blogPosts,
          } as RekaLandingPageData
        }
      />
    </>
  );
}
