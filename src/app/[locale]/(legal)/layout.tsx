import "@/app/globals.css";

import { Link } from "@/i18n/navigation";
import { MdOutlineHome } from "react-icons/md";
import React from "react";
import RekaLegalShell from "@/components/landing/reka-legal-shell";
import RekaSiteFooter from "@/components/landing/reka-site-footer";
import { getLandingPage } from "@/services/page";

export default async function LocaleLegalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const landing = await getLandingPage(locale);
  const isRekaClip = (landing as { template?: string }).template === "reka-clip";

  if (isRekaClip) {
    return (
      <RekaLegalShell>
        <section className="reka-legal-page">
          <div className="reka-page-container reka-legal-inner">
            <article className="reka-legal-prose">{children}</article>
          </div>
        </section>
        {landing.footer && <RekaSiteFooter footer={landing.footer} />}
      </RekaLegalShell>
    );
  }

  return (
    <div>
      <Link
        className="text-base-content cursor-pointer hover:opacity-80 transition-opacity"
        href="/"
      >
        <MdOutlineHome className="text-2xl mx-8 my-8" />
      </Link>
      <div className="text-md max-w-3xl mx-auto leading-loose pt-4 pb-8 px-8 prose prose-slate dark:prose-invert prose-headings:font-semibold prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-base-content prose-code:text-base-content prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md">
        {children}
      </div>
    </div>
  );
}
