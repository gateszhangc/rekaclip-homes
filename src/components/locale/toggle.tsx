"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useParams, usePathname, useRouter } from "next/navigation";

import { MdLanguage } from "react-icons/md";
import { defaultLocale, localeNames, locales } from "@/i18n/locale";

import { cn } from "@/lib/utils";

export default function ({ isIcon = false, className }: { isIcon?: boolean; className?: string }) {
  const params = useParams();
  const locale = (params.locale as string) || defaultLocale;
  const router = useRouter();
  const pathname = usePathname();

  const handleSwitchLanguage = (value: string) => {
    if (value === locale) {
      return;
    }

    const currentPathname = pathname || "/";
    const localePrefix = `/${locale}`;
    const pathWithoutLocale =
      currentPathname === localePrefix
        ? "/"
        : currentPathname.startsWith(`${localePrefix}/`)
          ? currentPathname.slice(localePrefix.length)
          : currentPathname;

    const normalizedPath = pathWithoutLocale.startsWith("/")
      ? pathWithoutLocale
      : `/${pathWithoutLocale}`;

    const nextPathname =
      value === defaultLocale
        ? normalizedPath
        : normalizedPath === "/"
          ? `/${value}`
          : `/${value}${normalizedPath}`;

    router.push(nextPathname);
  };

  return (
    <Select value={locale} onValueChange={handleSwitchLanguage}>
      <SelectTrigger
        className={cn(
          "flex items-center gap-2 border-none text-muted-foreground outline-hidden hover:bg-transparent focus:ring-0 focus:ring-offset-0",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <MdLanguage className="text-xl" />
          <span>{localeNames[locale]}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="z-50 min-w-[220px] rounded-[24px] border border-white/10 bg-background/95 p-2 text-foreground shadow-[0_25px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        {locales.map((key) => {
          const name = localeNames[key] ?? key;
          return (
            <SelectItem
              className="mx-1 cursor-pointer rounded-2xl px-4 py-2.5 text-foreground transition-all duration-200 hover:bg-primary/10 focus:bg-primary/15 data-[state=checked]:bg-primary/12 data-[state=checked]:font-semibold"
              key={key}
              value={key}
            >
              {name}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
