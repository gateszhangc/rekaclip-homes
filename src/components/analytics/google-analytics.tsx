"use client";

import Script from "next/script";

export default function GoogleAnalytics() {
  const analyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

  // Do not track in development
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  if (!analyticsId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${analyticsId}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
