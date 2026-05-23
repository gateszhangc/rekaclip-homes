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

  return (
    <LandingTheme>
      <BlogPrefetch locale={locale} />
      {page.header && <Header header={page.header} />}
      <main className="overflow-x-hidden">{children}</main>
      {page.footer && <Footer footer={page.footer} />}
    </LandingTheme>
  );
}
