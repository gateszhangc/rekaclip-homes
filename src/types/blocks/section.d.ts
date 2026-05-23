import { Image, Button } from "@/types/blocks/base";

export interface SectionItem {
  title?: string;
  description?: string;
  label?: string;
  before?: string;
  after?: string;
  icon?: string;
  image?: Image;
  beforeSrc?: string;
  afterSrc?: string;
  beforeAlt?: string;
  afterAlt?: string;
  highlight?: string;
  reverse?: boolean;
  buttons?: Button[];
  url?: string;
  target?: string;
  children?: SectionItem[];
}

export interface Section {
  disabled?: boolean | string;
  name?: string;
  title?: string;
  description?: string;
  label?: string;
  note?: string;
  before_label?: string;
  after_label?: string;
  footer?: string;
  icon?: string;
  image?: Image;
  buttons?: Button[];
  items?: SectionItem[];
}
