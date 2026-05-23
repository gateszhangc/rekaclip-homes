import { corporateMemphisData } from "./corporate-memphis";
import { rubberHoseData } from "./rubber-hose";
import { storybookData } from "./storybook";
import { vibrantColorsData } from "./vibrant-colors";
import { StylePageData } from "./types";

export const stylePages: Record<string, StylePageData> = {
  [corporateMemphisData.slug]: corporateMemphisData,
  [rubberHoseData.slug]: rubberHoseData,
  [vibrantColorsData.slug]: vibrantColorsData,
  [storybookData.slug]: storybookData,
};

export const styleSlugs = Object.keys(stylePages);

export const getStyleData = (slug: string) => stylePages[slug];
