import { Metadata } from "next";

export type StylePageImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
};

export type StylePageHero = {
  badge: string;
  title: string;
  description: string;
  cta: {
    label: string;
    href: string;
  };
  image: StylePageImage;
  imageFooter?: {
    left: string;
    right?: string;
    className?: string;
  };
  sectionClassName?: string;
  sectionDecorations?: {
    wrapperClassName?: string;
    items: string[];
  };
  media?: {
    containerClassName?: string;
    decorations?: string[];
    frameClassName?: string;
    innerClassName?: string;
    imageClassName?: string;
  };
};

export type StylePageFeature = {
  icon?: string;
  iconImage?: {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
  };
  title: string;
  subtitle?: string;
  description: string;
  descriptionSecondary?: string;
};

export type StylePageUseCase = {
  title: string;
  description: string;
  image: string;
  cta: {
    label: string;
    href: string;
  };
  reverse?: boolean;
};

export type StylePageStep = {
  number: string;
  title: string;
  description: string;
  image: string;
};

export type StylePageFaqItem = {
  question: string;
  answer: string;
  questionSecondary?: string;
};

export type StylePageFAQ = {
  title: string;
  description: string;
  badgeLabel?: string;
  badgeClassName?: string;
  itemClassName?: string;
  itemTriggerClassName?: string;
  itemContentClassName?: string;
  itemOverlayClassName?: string;
  items: StylePageFaqItem[];
};

export type StylePageTheme = {
  featureCardClassName?: string;
  useCaseCardClassName?: string;
  useCaseImageWrapperClassName?: string;
  useCaseImageClassName?: string;
  stepsCardClassName?: string;
  stepsImageWrapperClassName?: string;
  stepsImageClassName?: string;
};

export type StylePageData = {
  slug: string;
  metadata: Metadata;
  hero: StylePageHero;
  intro: {
    title: string;
    description: string | string[];
    subheading?: string;
  };
  features: StylePageFeature[];
  useCases: StylePageUseCase[];
  useCasesSectionId?: string;
  stepsIntro: {
    title: string;
    description: string;
  };
  steps: StylePageStep[];
  faq: StylePageFAQ;
  theme?: StylePageTheme;
  useCaseImageSize?: {
    width: number;
    height: number;
  };
  stepImageSize?: {
    width: number;
    height: number;
  };
  useCaseImagePriority?: "first" | "none";
};
