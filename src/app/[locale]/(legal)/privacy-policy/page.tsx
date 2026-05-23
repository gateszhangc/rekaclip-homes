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
    title: "Privacy Policy | EasyClaw",
    description:
      "Learn how EasyClaw collects, uses, and protects your data when deploying and managing OpenClaw assistants.",
    alternates: {
      canonical: getAbsoluteLocalizedUrl(siteUrl, locale, pathname),
      languages: buildAlternateLanguageUrls(siteUrl, pathname),
    },
  };
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyContent />;
}

