import { Button, Image, Announcement } from "@/types/blocks/base";

export interface Announcement {
  title?: string;
  description?: string;
  label?: string;
  url?: string;
  target?: string;
}

export interface Hero {
  name?: string;
  disabled?: boolean;
  announcement?: Announcement;
  title_logo?: Image;
  title?: string;
  highlight_text?: string;
  subtitle?: string;
  description?: string;
  buttons?: Button[];
  image?: Image;
  images?: Image[];
  features?: string[];
  tip?: string;
  show_happy_users?: boolean;
  show_badge?: boolean;
}
