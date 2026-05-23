"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import RekaSidebar from "@/components/landing/reka-sidebar";
import { Link as LinkIcon, Upload, MonitorPlay, Lock } from "lucide-react";

const HERO_VIDEO_SRC = "/videos/hero-visual-new.mp4";

interface RekaClipData {
  clip: {
    title_prefix: string;
    title_highlight: string;
    title_suffix: string;
    description: string;
    platforms: Array<{ name: string; icon: string; selected?: boolean; locked?: boolean }>;
    or_label: string;
    placeholder: string;
    generate_text: string;
    upload_text: string;
    templates: { moments: string; compilation: string };
    quick_options: { aspect_ratio: string; split: string; captions: string; resolution: string };
    metrics: { clips_per_stream: string; clips_label: string; turnaround: string; turnaround_label: string; engagement: string; engagement_label: string };
    features: string[];
  };
  footer: {
    copyright: string;
  };
}

function PlatformIcon({ icon }: { icon: string }) {
  if (icon === "youtube") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .6 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.3.6 9.3.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
      </svg>
    );
  }
  if (icon === "twitch") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M2.15 0 0 4.8v16.8h5.4V24h3.2l3-3h4.8l6.2-6.2V0H2.15zm18.9 13.8-3.6 3.6h-5.4l-3 3v-3H4.5V2.4h16.55v11.4zM14.1 6v6.6h2.4V6h-2.4zm-6 0v6.6h2.4V6H8.1z" />
      </svg>
    );
  }
  return <MonitorPlay size={18} strokeWidth={2} />;
}

function ClipSection({ data }: { data: RekaClipData["clip"] }) {
  return (
    <section id="clip" className="reka-clip-hero">
      <div className="reka-clip-hero-grid">
        <div className="reka-clip-hero-copy landing-reveal landing-reveal--1">
          <h1 className="reka-clip-hero-title">
            {data.title_prefix}
            <span className="gradient-text">{data.title_highlight}</span>
            {data.title_suffix}
          </h1>
          <p className="reka-clip-hero-desc">{data.description}</p>

          <div className="reka-clip-platforms">
            {data.platforms.map((platform) => (
              <button
                key={platform.name}
                type="button"
                className={`reka-clip-platform ${platform.selected ? "reka-clip-platform--selected" : ""} ${platform.locked ? "reka-clip-platform--locked" : ""}`}
                disabled={platform.locked}
                aria-pressed={platform.selected}
                aria-disabled={platform.locked}
              >
                <PlatformIcon icon={platform.icon} />
                <span>{platform.name}</span>
                {platform.locked && <Lock size={14} className="reka-clip-platform-lock" aria-hidden />}
              </button>
            ))}
          </div>

          <div className="landing-reveal landing-reveal--2">
            <div className="reka-clip-input-row">
              <div className="reka-clip-input-wrap">
                <div className="reka-clip-input-inner">
                  <LinkIcon size={18} className="text-[var(--text-secondary)] shrink-0" />
                  <input type="text" placeholder={data.placeholder} aria-label={data.placeholder} />
                </div>
              </div>
              <button type="button" className="reka-clip-cta-primary reka-clip-cta-inline">
                {data.generate_text}
              </button>
            </div>
            <div className="reka-clip-upload-row">
              <span className="reka-clip-or">{data.or_label}</span>
              <button type="button" className="reka-clip-upload-btn">
                <Upload size={16} />
                {data.upload_text}
              </button>
            </div>
          </div>
        </div>

        <div className="reka-clip-visual landing-reveal landing-reveal--3">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            src={HERO_VIDEO_SRC}
            aria-label="Reka Clip demo: long video to viral shorts"
          />
        </div>
      </div>
    </section>
  );
}

export default function RekaClipLanding({ data }: { data: RekaClipData }) {
  const [activeSection, setActiveSection] = useState("clip");

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="landing-reka">
      <RekaSidebar activeSection={activeSection} onNavigate={scrollToSection} />
      <main className="reka-main">
        <ClipSection data={data.clip} />

        <footer className="border-t border-[var(--glass-border)] py-8 px-4">
          <div className="max-w-5xl mx-auto text-center text-sm text-[var(--text-secondary)]">
            <p>{data.footer.copyright}</p>
            <div className="flex justify-center gap-4 mt-4">
              <Link href="/privacy-policy" className="hover:text-[var(--text)] transition">Privacy Policy</Link>
              <Link href="/terms-of-service" className="hover:text-[var(--text)] transition">Terms of Service</Link>
              <Link href="/refund-policy" className="hover:text-[var(--text)] transition">Refund Policy</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
