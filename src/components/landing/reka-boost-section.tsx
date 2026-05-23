"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Check, Flame } from "lucide-react";
import { useRekaClipGate } from "@/hooks/use-reka-clip-gate";

export interface BoostTier {
  name: string;
  icon?: "ribbon" | "trophy" | "medal";
  views: string;
  views_label: string;
  price: string;
  featured: boolean;
  free_label: string | null;
}

export interface BoostStep {
  number: string;
  title?: string;
  title_prefix?: string;
  title_highlight?: string;
  description: string;
  platforms?: string[];
  tiers?: BoostTier[];
  bullets?: string[];
  preview?: {
    account: string;
    hashtag: string;
    caption_label: string;
    caption: string;
    caption_tags: string;
  };
  image?: { src: string; alt: string };
  reverse?: boolean;
}

export interface RekaBoostData {
  hero: {
    label: string;
    title_prefix: string;
    title_highlight: string;
    description: string;
    cta: string;
    image: { src: string; alt: string };
  };
  steps: BoostStep[];
  cta: {
    label: string;
    title_prefix: string;
    title_highlight: string;
    description: string;
    primary: string;
    secondary: string;
    secondary_href: string;
  };
}

function BoostTitle({
  title,
  title_prefix,
  title_highlight,
}: Pick<BoostStep, "title" | "title_prefix" | "title_highlight">) {
  if (title) {
    return <h2 className="reka-boost-title">{title}</h2>;
  }
  return (
    <h2 className="reka-boost-title">
      {title_prefix}
      {title_highlight && <span className="gradient-text">{title_highlight}</span>}
    </h2>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const key = platform.toLowerCase();
  if (key === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="reka-boost-platform-icon">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
      </svg>
    );
  }
  if (key === "instagram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="reka-boost-platform-icon">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (key === "youtube") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="reka-boost-platform-icon">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .6 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.3.6 9.3.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
      </svg>
    );
  }
  return null;
}

function BoostPlatformsList({ platforms }: { platforms: string[] }) {
  return (
    <ul className="reka-boost-platforms">
      {platforms.map((platform) => (
        <li key={platform}>
          <button type="button" className="reka-boost-platform-btn">
            <PlatformIcon platform={platform} />
            <span>{platform}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function TierIcon({ icon }: { icon?: BoostTier["icon"] }) {
  if (icon === "trophy") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
        <path d="M7 4H4.5a2.5 2.5 0 0 0 0 5H7M17 4h2.5a2.5 2.5 0 0 1 0 5H17" />
      </svg>
    );
  }
  if (icon === "medal") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="9" r="5" />
        <path d="M8.5 14 6 21l6-3 6 3-2.5-7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="8" r="5" />
      <path d="M8 13 6 21h12l-2-8" />
    </svg>
  );
}

function BoostTiersVisual({ tiers }: { tiers: BoostTier[] }) {
  return (
    <ul className="reka-boost-tiers reka-boost-tiers--visual">
      {tiers.map((tier) => (
        <li
          key={tier.name}
          className={`reka-boost-tier ${tier.featured ? "reka-boost-tier--featured" : ""}`}
        >
          <span className={`reka-boost-tier-icon ${tier.featured ? "reka-boost-tier-icon--featured" : ""}`}>
            <TierIcon icon={tier.icon} />
          </span>
          <div className="reka-boost-tier-body">
            <strong className="reka-boost-tier-views-range">{tier.views}</strong>
            <span className="reka-boost-tier-views-label">{tier.views_label}</span>
          </div>
          <div className="reka-boost-tier-price">
            {tier.free_label ? (
              <>
                <span className="reka-boost-tier-free">{tier.free_label}</span>
                <span className="reka-boost-tier-strike">{tier.price}</span>
              </>
            ) : (
              <span>{tier.price}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function BoostTagsVisual({ preview }: { preview: NonNullable<BoostStep["preview"]> }) {
  return (
    <div className="reka-boost-tags" aria-hidden>
      <div className="reka-boost-tags-field reka-boost-tags-field--gradient">{preview.account}</div>
      <div className="reka-boost-tags-field reka-boost-tags-field--gradient">{preview.hashtag}</div>
      <div className="reka-boost-tags-preview">
        <span className="reka-boost-tags-preview-label">{preview.caption_label}</span>
        <p className="reka-boost-tags-preview-caption">{preview.caption}</p>
        <p className="reka-boost-tags-preview-tags">{preview.caption_tags}</p>
      </div>
    </div>
  );
}

function BoostStepVisual({ step }: { step: BoostStep }) {
  if (step.tiers) {
    return <BoostTiersVisual tiers={step.tiers} />;
  }
  if (step.preview) {
    return <BoostTagsVisual preview={step.preview} />;
  }
  if (step.image) {
    return (
      <Image
        src={step.image.src}
        alt={step.image.alt}
        width={960}
        height={720}
        sizes="(max-width: 1023px) 100vw, 50vw"
        className="reka-boost-image"
      />
    );
  }
  return null;
}

function BoostStepSection({ step }: { step: BoostStep }) {
  const reverse = step.reverse ?? false;

  return (
    <section className="reka-boost-page">
      <div className={`reka-boost-grid ${reverse ? "reka-boost-grid--reverse" : ""}`}>
        <div className="reka-boost-copy landing-reveal landing-reveal--1">
          <span className="reka-boost-step-label">Step {step.number}</span>
          <BoostTitle
            title={step.title}
            title_prefix={step.title_prefix}
            title_highlight={step.title_highlight}
          />
          <p className="reka-boost-desc">{step.description}</p>

          {step.platforms && <BoostPlatformsList platforms={step.platforms} />}

          {step.bullets && (
            <ul className="reka-boost-bullets">
              {step.bullets.map((item) => (
                <li key={item}>
                  <span className="reka-boost-bullet-icon" aria-hidden>
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="reka-boost-visual landing-reveal landing-reveal--2">
          <BoostStepVisual step={step} />
        </div>
      </div>
    </section>
  );
}

export default function RekaBoostSection({ data }: { data: RekaBoostData }) {
  const { requireAuthAndPayment } = useRekaClipGate();

  const handleBoostCta = () => {
    void requireAuthAndPayment("boost_cta");
  };

  return (
    <>
      <section className="reka-boost-page reka-boost-page--hero">
        <div className="reka-boost-grid">
          <div className="reka-boost-copy landing-reveal landing-reveal--1">
            <span className="reka-boost-hero-label">{data.hero.label}</span>
            <h1 className="reka-boost-hero-title">
              {data.hero.title_prefix}
              <span className="gradient-text">{data.hero.title_highlight}</span>
            </h1>
            <p className="reka-boost-desc">{data.hero.description}</p>
            <button type="button" className="reka-boost-cta-btn" onClick={handleBoostCta}>
              <Flame size={18} aria-hidden />
              {data.hero.cta}
            </button>
          </div>
          <div className="reka-boost-visual landing-reveal landing-reveal--2">
            <Image
              src={data.hero.image.src}
              alt={data.hero.image.alt}
              width={960}
              height={720}
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="reka-boost-image"
              priority
            />
          </div>
        </div>
      </section>

      {data.steps.map((step) => (
        <BoostStepSection key={step.number} step={step} />
      ))}

      <section className="reka-boost-page reka-boost-page--cta">
        <div className="reka-boost-cta-inner landing-reveal landing-reveal--1">
          <span className="reka-boost-cta-label">{data.cta.label}</span>
          <h2 className="reka-boost-cta-title">
            {data.cta.title_prefix}
            <span className="gradient-text">{data.cta.title_highlight}</span>
          </h2>
          <p className="reka-boost-cta-desc">{data.cta.description}</p>
          <div className="reka-boost-cta-actions">
            <button type="button" className="reka-boost-cta-btn" onClick={handleBoostCta}>
              <Flame size={18} aria-hidden />
              {data.cta.primary}
            </button>
            <Link href={data.cta.secondary_href} className="reka-boost-cta-secondary">
              {data.cta.secondary}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
