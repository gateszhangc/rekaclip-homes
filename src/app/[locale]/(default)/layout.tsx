import { ReactNode } from "react";
import LandingTheme from "@/components/theme/landing-theme";
import BlogPrefetch from "@/components/prefetch/blog-prefetch";
import Header from "@/components/blocks/header";
import Footer from "@/components/blocks/footer";
import { getLandingPage } from "@/services/page";

export default async function DefaultLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getLandingPage(locale);
  const isRekaClip = (page as any).template === "reka-clip";

  return (
    <LandingTheme>
      <BlogPrefetch locale={locale} />
      {!isRekaClip && page.header && <Header header={page.header} />}
      <main className="overflow-x-hidden">{children}</main>
      {!isRekaClip && page.footer && <Footer footer={page.footer} />}
    </LandingTheme>
  );
}
