"use client";

import React from 'react';
import { Sparkles, ArrowRight, Image as ImageIcon, Type as TypeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface NanoBananaProHeroProps {
  onStartClick: () => void;
}

const NanoBananaProHero: React.FC<NanoBananaProHeroProps> = ({ onStartClick }) => {
  const t = useTranslations('nano_banana_pro');
  
  return (
    <section className="relative py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto text-center">
        {/* Hero Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <Sparkles size={16} className="animate-pulse" />
          {t('hero.badge')}
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          {t('hero.title')}
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          {t('hero.subtitle')}
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
            <TypeIcon size={16} className="text-primary" />
            <span className="text-sm font-medium">{t('hero.features.text_to_image')}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
            <ImageIcon size={16} className="text-primary" />
            <span className="text-sm font-medium">{t('hero.features.image_to_image')}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
            <Sparkles size={16} className="text-primary" />
            <span className="text-sm font-medium">{t('hero.features.high_quality')}</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg" 
            onClick={onStartClick}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 text-lg font-semibold"
          >
            <Sparkles className="mr-2" size={20} />
            {t('hero.buttons.start_creating')}
            <ArrowRight className="ml-2" size={20} />
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => window.open('/#caricature-maker', '_self')}
            className="px-8 py-3 text-lg font-semibold"
          >
            {t('hero.buttons.view_gallery')}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">2K+</div>
            <div className="text-sm text-muted-foreground">{t('hero.stats.daily_images')}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">98%</div>
            <div className="text-sm text-muted-foreground">{t('hero.stats.satisfaction')}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">5s</div>
            <div className="text-sm text-muted-foreground">{t('hero.stats.generation_time')}</div>
          </div>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/5 rounded-full blur-3xl"></div>
      </div>
    </section>
  );
};

export default NanoBananaProHero;
