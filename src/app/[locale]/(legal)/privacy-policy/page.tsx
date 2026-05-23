import PrivacyPolicyContent from "@/app/(legal)/privacy-policy/page.mdx";
import { getSiteUrl } from "@/lib/site-url";
import {
  buildAlternateLanguageUrls,
  getAbsoluteLocalizedUrl,
} from "@/i18n/url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const siteUrl = getSiteUrl();
  const pathname = "/privacy-policy";

  return {
    title: "Privacy Policy | Reka Clip",
    description:
      "Learn how Reka Clip collects, uses, and protects your data when you clip, edit, and publish videos.",
    alternates: {
      canonical: getAbsoluteLocalizedUrl(siteUrl, locale, pathname),
      languages: buildAlternateLanguageUrls(siteUrl, pathname),
    },
  };
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyContent />;
}

