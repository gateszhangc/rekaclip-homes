import dynamic from "next/dynamic";
import SimpleClawLanding from "@/components/landing/simpleclaw-landing";
import { getLandingPage } from "@/services/page";
import { getSiteUrl } from "@/lib/site-url";
import {
  buildAlternateLanguageUrls,
  getAbsoluteLocalizedUrl,
} from "@/i18n/url";

const UseCases = dynamic(() => import("@/components/blocks/use-cases"));
const Feature1 = dynamic(() => import("@/components/blocks/feature1"));
const Feature2 = dynamic(() => import("@/components/blocks/feature2"));
const Feature3 = dynamic(() => import("@/components/blocks/feature3"));
const BenefitShowcase = dynamic(
  () => import("@/components/blocks/benefit-showcase")
);
const Comparison = dynamic(() => import("@/components/blocks/comparison"));
const Feature = dynamic(() => import("@/components/blocks/feature"));
const Stats = dynamic(() => import("@/components/blocks/stats"));
const Testimonial = dynamic(() => import("@/components/blocks/testimonial"));
const FAQ = dynamic(() => import("@/components/blocks/faq"));
const CTA = dynamic(() => import("@/components/blocks/cta"));
const Branding = dynamic(() => import("@/components/blocks/branding"));

type ToggleableBlock = { disabled?: boolean | string };

const isEnabled = (
  block?: ToggleableBlock | null
): block is ToggleableBlock => {
  if (!block) {
    return false;
  }

  return block.disabled !== true && block.disabled !== "true";
};

const normalizeDisabled = <T extends ToggleableBlock>(block: T) => {
  if (block.disabled === "false") {
    return { ...block, disabled: false } as T & { disabled?: boolean };
  }
  if (block.disabled === "true") {
    return { ...block, disabled: true } as T & { disabled?: boolean };
  }
  return block as T & { disabled?: boolean };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const siteUrl = getSiteUrl();
  const canonicalUrl = getAbsoluteLocalizedUrl(siteUrl, locale, "/");
  const languages = buildAlternateLanguageUrls(siteUrl, "/");

  return {
    title: "EasyClaw - One-click OpenClaw Deployment | EasyClaw",
    description:
      "EasyClaw makes OpenClaw deployment one click. Connect Telegram, Discord, or WhatsApp, choose Claude, GPT, or Gemini, and go live in under 1 minute.",
    keywords:
      "easyclaw, deploy openclaw, openclaw deployment, openclaw hosting, telegram bot deployment, discord bot deployment, whatsapp bot deployment, ai assistant deployment",
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getLandingPage(locale);

  const useCases = isEnabled(page.use_cases)
    ? normalizeDisabled(page.use_cases)
    : null;
  const usage = isEnabled(page.usage) ? normalizeDisabled(page.usage) : null;
  const comparison = isEnabled(page.comparison)
    ? normalizeDisabled(page.comparison)
    : null;
  const introduce = isEnabled(page.introduce)
    ? normalizeDisabled(page.introduce)
    : null;
  const benefit = isEnabled(page.benefit)
    ? normalizeDisabled(page.benefit)
    : null;
  const benefitShowcase = isEnabled(page.benefit_showcase)
    ? normalizeDisabled(page.benefit_showcase)
    : null;
  const feature = isEnabled(page.feature) ? normalizeDisabled(page.feature) : null;
  const stats = isEnabled(page.stats) ? normalizeDisabled(page.stats) : null;
  const testimonial = isEnabled(page.testimonial)
    ? normalizeDisabled(page.testimonial)
    : null;
  const faq = isEnabled(page.faq) ? normalizeDisabled(page.faq) : null;
  const cta = isEnabled(page.cta) ? normalizeDisabled(page.cta) : null;
  const branding = isEnabled(page.branding)
    ? normalizeDisabled(page.branding)
    : null;

  return (
    <>
      <SimpleClawLanding />

      {useCases && (
        <div className="hidden md:block">
          <UseCases section={useCases} />
        </div>
      )}

      {usage && (
        <div className="hidden md:block">
          <Feature3 section={usage} />
        </div>
      )}

      {comparison && (
        <div className="hidden md:block">
          <Comparison section={comparison} />
        </div>
      )}

      {introduce && (
        <div className="hidden md:block">
          <Feature1 section={introduce} />
        </div>
      )}

      {benefit && (
        <div className="hidden md:block">
          <Feature2 section={benefit} />
        </div>
      )}

      {benefitShowcase && (
        <div className="hidden md:block">
          <BenefitShowcase section={benefitShowcase} />
        </div>
      )}

      {feature && (
        <div className="hidden md:block">
          <Feature section={feature} />
        </div>
      )}

      {stats && <Stats section={stats} />}
      {testimonial && <Testimonial section={testimonial} />}
      {faq && <FAQ section={faq} />}
      {cta && <CTA section={cta} />}
      {branding && (
        <div className="hidden md:block">
          <Branding section={branding} />
        </div>
      )}
    </>
  );
}
