import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";
import createMDX from "@next/mdx";
import { DIST_DIR_BY_PROFILE } from "./scripts/dev/next-runtime-lib.mjs";

const withMDX = createMDX();

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withNextIntl = createNextIntlPlugin();

function normalizeBackendBaseUrl(baseUrl) {
  const normalized = (baseUrl || "").trim().replace(/\/+$/, "");
  if (!normalized) {
    return "http://127.0.0.1:5000";
  }

  try {
    const url = new URL(normalized);
    if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    // Keep original value when it is not a full URL.
  }

  return normalized;
}

const backendBaseUrl = normalizeBackendBaseUrl(
  process.env.BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:5000"
);

const runtimeProfile = process.env.NEXT_RUNTIME_PROFILE?.trim();
const configuredDistDir =
  process.env.NEXT_DIST_DIR?.trim() ||
  (runtimeProfile === "playwright"
    ? DIST_DIR_BY_PROFILE.playwright
    : process.env.NODE_ENV === "production" || runtimeProfile === "build"
      ? DIST_DIR_BY_PROFILE.build
      : DIST_DIR_BY_PROFILE.web);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep each runtime profile in its own build directory so parallel Next
  // processes cannot corrupt manifests/chunks for one another.
  distDir: configuredDistDir,
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,
  reactStrictMode: false,
  compress: true, // Enable gzip compression
  productionBrowserSourceMaps: true,
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    mdxRs: true,
    // Web Vitals attribution for better debugging
    webVitalsAttribution: ["CLS", "LCP", "FCP", "TTFB", "INP"],
    // Optimize CSS chunks
    cssChunking: true,
    optimizePackageImports: [
      "lucide-react",
      "react-icons",
      "recharts",
      "framer-motion",
      "@radix-ui/react-accordion",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-icons",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-popover",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-radio-group",
      "@tabler/icons-react",
      "embla-carousel-react",
      "pino",
      "sonner",
      "next-themes",
      "class-variance-authority",
      "date-fns",
      "clsx",
      "tailwind-merge",
      "lodash",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"], // Prefer AVIF then WebP
    imageSizes: [16, 32, 48, 64, 96, 128, 160, 192, 240, 256, 320, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/health",
        destination: `${backendBaseUrl}/health`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "easyclaw.pro",
          },
        ],
        destination: "https://www.easyclaw.pro/:path*",
        permanent: true,
      },
      {
        source: "/styles/ghibli",
        destination: "/styles/storybook",
        permanent: true,
      },
    ];
  },
};

const configWithMDX = {
  ...nextConfig,
  experimental: {
    ...nextConfig.experimental,
    mdxRs: true,
  },
};

export default withBundleAnalyzer(withNextIntl(withMDX(configWithMDX)));
