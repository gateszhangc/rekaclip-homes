"use client";

import React, { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

interface QwenImageLayeredHeroProps {
  onStartClick?: () => void;
}

const QwenImageLayeredHero: React.FC<QwenImageLayeredHeroProps> = ({
  onStartClick,
}) => {
  const t = useTranslations("qwen_image_layered");
  const introFeatures = useMemo(() => {
    const features = (t as any).raw?.("intro.features");
    return Array.isArray(features) ? (features as string[]) : [];
  }, [t]);

  const handleStartClick = () => {
    if (onStartClick) {
      onStartClick();
      return;
    }

    const target = document.getElementById("qwen-image-layered");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="relative overflow-hidden border-b border-border bg-[#0e0a07] text-white">
      <div className="absolute -top-40 right-0 h-72 w-72 rounded-full bg-amber-500/25 blur-3xl" />
      <div className="absolute -bottom-48 left-0 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="container relative py-16 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-8 animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-white/70">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              {t("intro.kicker")}
            </span>

            <div className="space-y-4">
              <h1 className="text-4xl font-serif font-semibold leading-tight sm:text-5xl lg:text-6xl">
                <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                  {t("intro.title")}
                </span>
              </h1>
              <p className="max-w-xl text-base text-white/70 sm:text-lg">
                {t("intro.description")}
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleStartClick}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
              >
                <Sparkles className="size-4" />
                {t("intro.cta")}
              </button>
              <p className="text-xs text-white/50">{t("intro.cta_hint")}</p>
            </div>

            {introFeatures.length > 0 && (
              <div className="grid gap-3 text-sm text-white/70 sm:grid-cols-2">
                {introFeatures.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="inline-flex size-5 items-center justify-center rounded-full border border-white/20 text-amber-300">
                      <Sparkles className="size-3" />
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative animate-fade-in">
            <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-amber-400/20 via-white/5 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/5 p-4 shadow-[0_30px_70px_rgba(0,0,0,0.45)]">
              <img
                src="https://pub-e1eb76428e24457ebfc067c635cb4fc4.r2.dev/imgs/qwen-image-layered/hero.png"
                alt={t("intro.title")}
                className="w-full rounded-2xl object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default QwenImageLayeredHero;
