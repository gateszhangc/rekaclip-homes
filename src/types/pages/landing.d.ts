import { Header } from "@/types/blocks/header";
import { Hero } from "@/types/blocks/hero";
import { Section } from "@/types/blocks/section";
import { Footer } from "@/types/blocks/footer";
import { Pricing } from "@/types/blocks/pricing";

import { FontRecognizerConfig } from "@/types/font-recognizer";

export interface LandingPage {
  header?: Header;
  hero?: Hero;
  branding?: Section;
  introduce?: Section;
  benefit?: Section;
  benefit_showcase?: Section;
  usage?: Section;
  comparison?: Section;
  feature?: Section;
  use_cases?: Section;
  showcase?: Section;
  stats?: Section;
  pricing?: Pricing;
  testimonial?: Section;
  faq?: Section;
  cta?: Section;
  footer?: Footer;
  image_translator?: Section;
  font_recognizer?: FontRecognizerConfig;
}

export interface PricingPage {
  pricing?: Pricing;
}

export interface ShowcasePage {
  showcase?: Section;
}
