import type { ReactNode } from "react";
import Image from "next/image";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import type { Footer } from "@/types/blocks/footer";

const DEFAULT_SUPPORT_EMAIL = "support@rekaclip.homes";

function FooterHref({
  href,
  target,
  className,
  children,
}: {
  href?: string;
  target?: string;
  className?: string;
  children: ReactNode;
}) {
  if (!href) {
    return <span className={className}>{children}</span>;
  }

  const isAppRoute = href.startsWith("/") && !href.startsWith("//");

  if (isAppRoute) {
    return (
      <Link href={href as "/"} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} target={target} rel={target === "_blank" ? "noreferrer" : undefined} className={className}>
      {children}
    </a>
  );
}

function getSupportEmail(footer: Footer) {
  const mailto = footer.social?.items?.find((item) => item.url?.startsWith("mailto:"))?.url;
  if (mailto) {
    return mailto.replace(/^mailto:/i, "");
  }
  return DEFAULT_SUPPORT_EMAIL;
}

export default function RekaSiteFooter({ footer }: { footer: Footer }) {
  if (footer.disabled) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const supportEmail = getSupportEmail(footer);
  const brandTitle = footer.brand?.title || "Reka Clip";

  return (
    <footer className="reka-site-footer border-t border-white/10 bg-black/40" data-testid="reka-site-footer">
      <div className="reka-page-container py-12 text-sm text-white/65">
        <div className="flex flex-col items-center justify-between gap-10 text-center lg:flex-row lg:items-start lg:text-left">
          <div className="flex w-full max-w-xl shrink flex-col items-center gap-6 lg:items-start">
            {footer.brand ? (
              <div>
                <FooterHref
                  href={footer.brand.url || "/"}
                  target={footer.brand.target}
                  className="flex items-center justify-center gap-3 lg:justify-start"
                >
                  {footer.brand.logo?.src ? (
                    <Image
                      src={footer.brand.logo.src}
                      alt={footer.brand.logo.alt || brandTitle}
                      width={48}
                      height={48}
                      sizes="48px"
                      className="h-12 w-12 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-sm font-bold text-white">
                      R
                    </div>
                  )}
                  {footer.brand.title ? (
                    <span className="text-3xl font-semibold tracking-[0.04em] text-white">
                      {footer.brand.title}
                    </span>
                  ) : null}
                </FooterHref>
                {footer.brand.description ? (
                  <p className="mt-6 max-w-xl text-base leading-7 text-white/60">{footer.brand.description}</p>
                ) : null}
              </div>
            ) : null}

            {footer.social?.items?.length ? (
              <ul className="flex items-center gap-5 text-white/48">
                {footer.social.items.map((item, index) => (
                  <li key={`${item.title}-${index}`}>
                    <FooterHref
                      href={item.url || "#"}
                      target={item.target}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                    >
                      {item.icon ? <Icon name={item.icon} className="size-4" /> : null}
                      <span className="sr-only">{item.title}</span>
                    </FooterHref>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:gap-12">
            {footer.nav?.items?.map((item, index) => (
              <div key={`${item.title}-${index}`}>
                <p className="mb-6 font-semibold uppercase tracking-[0.18em] text-white/40">{item.title}</p>
                <ul className="space-y-4 text-sm text-white/62">
                  {item.children?.map((child, childIndex) => (
                    <li key={`${child.title}-${childIndex}`}>
                      <FooterHref
                        href={child.url || "#"}
                        target={child.target}
                        className="font-medium transition hover:text-white"
                      >
                        {child.title}
                      </FooterHref>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 text-center lg:text-left">
          <p className="mb-2 text-sm text-white/70">
            support:{" "}
            <a href={`mailto:${supportEmail}`} className="transition-colors hover:text-white">
              {supportEmail}
            </a>
          </p>
          {footer.disclaimer ? (
            <p className="max-w-4xl text-xs leading-6 text-white/45 lg:mx-0 mx-auto">{footer.disclaimer}</p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col justify-between gap-4 border-t border-white/10 pt-8 text-center text-sm font-medium text-white/52 lg:flex-row lg:items-center lg:text-left">
          <p>
            © {currentYear} {brandTitle}. {footer.copyright || "All rights reserved."}
          </p>

          {footer.agreement?.items?.length ? (
            <ul className="flex flex-wrap justify-center gap-4 lg:justify-end">
              {footer.agreement.items.map((item, index) => (
                <li key={`${item.title}-${index}`}>
                  <FooterHref href={item.url || "#"} target={item.target} className="transition hover:text-white">
                    {item.title}
                  </FooterHref>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
