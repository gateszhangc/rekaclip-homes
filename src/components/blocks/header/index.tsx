"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Header as HeaderType } from "@/types/blocks/header";
import Icon from "@/components/icon";
import { Link, useRouter } from "@/i18n/navigation";
import { localeSwitcherEnabled } from "@/i18n/locale";
import LocaleToggle from "@/components/locale/toggle";
import { Menu } from "lucide-react";
import SignToggle from "@/components/sign/toggle";
import { useEffect } from "react";

import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import NextImage from "next/image";

const getPrefetchDelay = () => {
  if (typeof navigator === "undefined") {
    return 8000;
  }

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!connection) {
    return 8000;
  }

  if (connection.saveData) {
    return 20000;
  }

  const effectiveType = connection.effectiveType || "";
  if (effectiveType === "slow-2g" || effectiveType === "2g") {
    return 20000;
  }

  if (effectiveType === "3g") {
    return 12000;
  }

  return 8000;
};

const resolveNavUrl = (url?: string) => {
  if (!url) return url;
  if (url.includes("#pricing")) return "/pricing";
  return url;
};

const isPricingUrl = (url?: string) => {
  if (!url) {
    return false;
  }

  return url.includes("/pricing") || url.includes("#pricing");
};

const resolvePricingSource = () => {
  if (typeof window === "undefined") {
    return "header";
  }

  const hash = window.location.hash?.toLowerCase();
  if (hash === "#faq") {
    return "faq";
  }
  if (hash === "#feature") {
    return "feature";
  }

  return "header";
};

const trackPricingView = (url?: string, sourceOverride?: string) => {
  if (!isPricingUrl(url)) {
    return;
  }

  trackEvent("pricing_viewed", {
    ui_source: sourceOverride || resolvePricingSource(),
  });
};

export default function Header({ header }: { header: HeaderType }) {
  if (header.disabled) {
    return null;
  }

  const isStylesMenu = (name?: string) => name === "styles";

  const router = useRouter();
  const navItems = [...(header.nav?.items ?? [])];
  const shouldShowSign = header.show_sign !== false;
  const shouldShowLocaleToggle = header.show_locale && localeSwitcherEnabled;
  const headerButtons = (header.buttons ?? []).filter((item) => {
    const title = item.title?.trim().toLowerCase() ?? "";
    const url = item.url?.trim().toLowerCase() ?? "";

    // Keep CTA buttons, but hide support-contact actions requested by task 24.
    return !(
      title.includes("support") ||
      url.startsWith("mailto:support@") ||
      url.includes("support@easyclaw.pro")
    );
  });

  const stylesIndex = navItems.findIndex((item) => item.name === "styles");
  const pricingIndex = navItems.findIndex((item) =>
    item.url?.includes("/pricing")
  );
  if (stylesIndex > -1 && pricingIndex > -1 && stylesIndex > pricingIndex) {
    const [stylesItem] = navItems.splice(stylesIndex, 1);
    navItems.splice(pricingIndex, 0, stylesItem);
  }

  useEffect(() => {
    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const schedulePrefetch = () => {
      const delay = getPrefetchDelay();
      const runPrefetch = () => router.prefetch("/posts");

      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(runPrefetch, { timeout: delay });
      } else {
        timeoutId = window.setTimeout(runPrefetch, delay);
      }
    };

    if (document.readyState === "complete") {
      schedulePrefetch();
    } else {
      window.addEventListener("load", schedulePrefetch, { once: true });
    }

    return () => {
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener("load", schedulePrefetch);
    };
  }, [router]);

  return (
    <section className="py-3 landing-header">
      <div className="container">
        <nav className="hidden justify-between lg:flex">
          <div className="flex items-center gap-6">
            <Link
              href={(header.brand?.url as any) || "/"}
              className="flex items-center gap-2"
            >
              {header.brand?.logo?.src && (
                <NextImage
                  src={header.brand.logo.src}
                  alt={header.brand.logo.alt || header.brand.title}
                  width={36}
                  height={36}
                  sizes="36px"
                  className="h-auto w-9"
                />
              )}
              {header.brand?.title && (
                <span className="text-xl text-primary font-bold">
                  {header.brand?.title || ""}
                </span>
              )}
            </Link>
            <div className="flex items-center">
              <NavigationMenu>
                <NavigationMenuList>
                  {navItems.map((item, i) => {
                    if (item.children && item.children.length > 0) {
                      return (
                        <NavigationMenuItem
                          key={i}
                          className="text-muted-foreground"
                        >
                          <NavigationMenuTrigger>
                            {item.icon && (
                              <Icon
                                name={item.icon}
                                className="size-4 shrink-0 mr-2"
                              />
                            )}
                            <span>{item.title}</span>
                          </NavigationMenuTrigger>
                          <NavigationMenuContent>
                            {isStylesMenu(item.name) ? (
                              <div className="w-[560px] rounded-[24px] border border-white/10 bg-background/95 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                                <ul className="grid gap-3 md:grid-cols-2">
                                  {item.children.map((iitem, ii) => (
                                    <li key={ii}>
                                      <NavigationMenuLink asChild>
                                        <Link
                                          className="group flex items-center gap-3 rounded-2xl border border-transparent bg-muted/20 p-3 leading-none transition hover:border-primary/30 hover:bg-primary/10"
                                          href={iitem.url as any}
                                          target={iitem.target}
                                          onClick={() => trackPricingView(iitem.url)}
                                        >
                                          <div className="relative size-12 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                                            {iitem.image?.src ? (
                                              <NextImage
                                                src={iitem.image.src}
                                                alt={iitem.image.alt || iitem.title || "Style preview"}
                                                fill
                                                sizes="48px"
                                                className="object-cover"
                                              />
                                            ) : null}
                                          </div>
                                          <div>
                                            <div className="text-sm font-semibold text-foreground">
                                              {iitem.title}
                                            </div>
                                          </div>
                                        </Link>
                                      </NavigationMenuLink>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <ul className="w-80 p-3">
                                <NavigationMenuLink>
                                  {item.children.map((iitem, ii) => (
                                    <li key={ii}>
                                      <Link
                                        className={cn(
                                          "flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                        )}
                                        href={iitem.url as any}
                                        target={iitem.target}
                                        onClick={() => trackPricingView(iitem.url)}
                                      >
                                        {iitem.icon && (
                                          <Icon
                                            name={iitem.icon}
                                            className="size-5 shrink-0"
                                          />
                                        )}
                                        <div>
                                          <div className="text-sm font-semibold">
                                            {iitem.title}
                                          </div>
                                          <p className="text-sm leading-snug text-muted-foreground">
                                            {iitem.description}
                                          </p>
                                        </div>
                                      </Link>
                                    </li>
                                  ))}
                                </NavigationMenuLink>
                              </ul>
                            )}
                          </NavigationMenuContent>
                        </NavigationMenuItem>
                      );
                    }

                    return (
                      <NavigationMenuItem key={i}>
                        <Link
                          className={cn(
                            "text-muted-foreground",
                            navigationMenuTriggerStyle,
                            buttonVariants({
                              variant: "ghost",
                            })
                          )}
                          href={resolveNavUrl(item.url) as any}
                          target={item.target}
                          onClick={() => trackPricingView(item.url)}
                        >
                          {item.icon && (
                            <Icon
                              name={item.icon}
                              className="size-4 shrink-0 mr-0"
                            />
                          )}
                          {item.title}
                        </Link>
                      </NavigationMenuItem>
                    );
                  })}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className="shrink-0 flex gap-2 items-center">
            {shouldShowLocaleToggle && <LocaleToggle />}

            {headerButtons.map((item, i) => {
              return (
                <Button key={i} variant={item.variant}>
                  <Link
                    href={item.url as any}
                    target={item.target || ""}
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => trackPricingView(item.url)}
                  >
                    {item.title}
                    {item.icon && (
                      <Icon name={item.icon} className="size-4 shrink-0" />
                    )}
                  </Link>
                </Button>
              );
            })}
            {shouldShowSign && <SignToggle />}
          </div>
        </nav>

        <div className="block lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={(header.brand?.url || "/") as any}
              className="flex items-center gap-2"
            >
              {header.brand?.logo?.src && (
                <NextImage
                  src={header.brand.logo.src}
                  alt={header.brand.logo.alt || header.brand.title}
                  width={28}
                  height={28}
                  sizes="28px"
                  className="h-auto w-7"
                />
              )}
              {header.brand?.title && (
                <span className="text-xl font-bold">
                  {header.brand?.title || ""}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="default" size="icon" aria-label="Open menu">
                    <Menu className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>
                      <Link
                        href={(header.brand?.url || "/") as any}
                        className="flex items-center gap-2"
                      >
                        {header.brand?.logo?.src && (
                          <NextImage
                            src={header.brand.logo.src}
                            alt={header.brand.logo.alt || header.brand.title}
                            width={28}
                            height={28}
                            sizes="28px"
                            className="h-auto w-7"
                          />
                        )}
                        {header.brand?.title && (
                          <span className="text-xl font-bold">
                            {header.brand?.title || ""}
                          </span>
                        )}
                      </Link>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="my-4 flex flex-col gap-4">
                    <Accordion type="single" collapsible className="w-full">
                      {navItems.map((item, i) => {
                        if (item.children && item.children.length > 0) {
                          return (
                            <AccordionItem
                              key={i}
                              value={item.title || ""}
                              className="border-b-0"
                            >
                              <AccordionTrigger className="mb-4 py-0 px-4 font-semibold hover:no-underline text-left">
                                {item.title}
                              </AccordionTrigger>
                              <AccordionContent className="mt-2">
                                {isStylesMenu(item.name) ? (
                                  <div className="grid gap-3">
                                    {item.children.map((iitem, ii) => (
                                      <Link
                                        key={ii}
                                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-background/60 p-3"
                                        href={iitem.url as any}
                                        target={iitem.target}
                                        onClick={() => trackPricingView(iitem.url)}
                                      >
                                        <div className="relative size-10 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                                          {iitem.image?.src ? (
                                            <NextImage
                                              src={iitem.image.src}
                                              alt={iitem.image.alt || iitem.title || "Style preview"}
                                              fill
                                              sizes="40px"
                                              className="object-cover"
                                            />
                                          ) : null}
                                        </div>
                                        <div>
                                          <div className="text-sm font-semibold">
                                            {iitem.title}
                                          </div>
                                        </div>
                                      </Link>
                                    ))}
                                  </div>
                                ) : (
                                  item.children.map((iitem, ii) => (
                                    <Link
                                      key={ii}
                                      className={cn(
                                        "flex select-none gap-4 rounded-md p-3 leading-none outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                      )}
                                      href={iitem.url as any}
                                      target={iitem.target}
                                      onClick={() => trackPricingView(iitem.url)}
                                    >
                                      {iitem.icon && (
                                        <Icon
                                          name={iitem.icon}
                                          className="size-4 shrink-0"
                                        />
                                      )}
                                      <div>
                                        <div className="text-sm font-semibold">
                                          {iitem.title}
                                        </div>
                                        <p className="text-sm leading-snug text-muted-foreground">
                                          {iitem.description}
                                        </p>
                                      </div>
                                    </Link>
                                  ))
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          );
                        }
                        return (
                          <Link
                            key={i}
                            href={resolveNavUrl(item.url) as any}
                            target={item.target}
                            className="font-semibold my-4 flex items-center gap-2 px-4"
                            onClick={() => trackPricingView(item.url)}
                          >
                            {item.icon && (
                              <Icon
                                name={item.icon}
                                className="size-4 shrink-0"
                              />
                            )}
                            {item.title}
                          </Link>
                        );
                      })}
                    </Accordion>
                  </div>
                  <div className="mt-4 border-t pt-4">
                    <div className="mt-2 flex flex-col gap-3">
                      {headerButtons.map((item, i) => {
                        return (
                          <Button key={i} variant={item.variant}>
                            <Link
                              href={item.url as any}
                              target={item.target || ""}
                              className="flex items-center gap-1"
                              onClick={() => trackPricingView(item.url)}
                            >
                              {item.title}
                              {item.icon && (
                                <Icon
                                  name={item.icon}
                                  className="size-4 shrink-0"
                                />
                              )}
                            </Link>
                          </Button>
                        );
                      })}

                      {shouldShowSign && <SignToggle />}
                    </div>

                    {shouldShowLocaleToggle && (
                      <div className="mt-4">
                        <LocaleToggle className="w-full justify-between border border-white/10 bg-background/60" />
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
