import RefundPolicyContent from "@/app/(legal)/refund-policy/page.mdx";
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
  const pathname = "/refund-policy";

  return {
    title: "Refund Policy | EasyClaw",
    description:
      "Review EasyClaw refund eligibility, cancellation terms, and support response timelines.",
    alternates: {
      canonical: getAbsoluteLocalizedUrl(siteUrl, locale, pathname),
      languages: buildAlternateLanguageUrls(siteUrl, pathname),
    },
  };
}

export default function RefundPolicyPage() {
  return <RefundPolicyContent />;
}

