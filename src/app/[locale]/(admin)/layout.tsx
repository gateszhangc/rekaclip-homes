import DashboardLayout from "@/components/dashboard/layout";
import Empty from "@/components/blocks/empty";
import { ReactNode } from "react";
import { Sidebar } from "@/types/blocks/sidebar";
import { getUserInfo } from "@/services/auth_user";
import { redirect } from "next/navigation";
import LandingTheme from "@/components/theme/landing-theme";
import { isAuthEnabled } from "@/lib/auth";

// Admin pages depend on request-scoped auth/session state and must not be
// prerendered during production builds.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const wrapperClassName = "dark admin-shipany";
  const authEnabled = isAuthEnabled();

  const sidebar: Sidebar = {
    brand: {
      title: "Image Describer",
      logo: {
        src: "/imgs/logos/logo.png",
        alt: "Image Describer",
      },
      url: "/admin",
    },
    nav: {
      items: [
        {
          title: "Dashboard",
          url: "/admin",
          icon: "RiDashboardLine",
        },
      ],
    },
    library: {
      title: "Menu",
      items: [
        {
          title: "Users",
          url: "/admin/users",
          icon: "RiUserLine",
        },
        {
          title: "Orders",
          icon: "RiOrderPlayLine",
          url: "/admin/orders",
        },
        {
          title: "Posts",
          url: "/admin/posts",
          icon: "RiArticleLine",
        },
        {
          title: "Feedbacks",
          url: "/admin/feedbacks",
          icon: "RiMessage2Line",
        },
        {
          title: "Account Pool",
          url: "/admin/accounts",
          icon: "RiKey2Line",
        },
      ],
    },
    bottomNav: {
      items: [
        {
          title: "Documents",
          url: "https://docs.shipany.ai",
          target: "_blank",
          icon: "RiFileTextLine",
        },
        {
          title: "Blocks",
          url: "https://shipany.ai/blocks",
          target: "_blank",
          icon: "RiDashboardLine",
        },
        {
          title: "Showcases",
          url: "https://shipany.ai/showcase",
          target: "_blank",
          icon: "RiAppsLine",
        },
      ],
    },
    social: {
      items: [
        {
          title: "Home",
          url: "/",
          target: "_blank",
          icon: "RiHomeLine",
        },
        {
          title: "Github",
          url: "https://github.com/shipanyai/shipany-template-one",
          target: "_blank",
          icon: "RiGithubLine",
        },
        {
          title: "Discord",
          url: "https://discord.gg/HQNnrzjZQS",
          target: "_blank",
          icon: "RiDiscordLine",
        },
        {
          title: "X",
          url: "https://x.com/shipanyai",
          target: "_blank",
          icon: "RiTwitterLine",
        },
      ],
    },
    account: {
      items: [
        {
          title: "Home",
          url: "/",
          icon: "RiHomeLine",
          target: "_blank",
        },
        {
          title: "Recharge",
          url: "/pricing",
          icon: "RiMoneyDollarBoxLine",
          target: "_blank",
        },
      ],
    },
  };

  const wrap = (content: ReactNode) => (
    <LandingTheme force className={wrapperClassName}>
      {content}
    </LandingTheme>
  );

  // When auth is disabled (local E2E / MVP), allow admin routes to be accessed
  // without redirecting to /auth/signin. This keeps the account-pool UI usable
  // while auth providers are turned off.
  if (!authEnabled) {
    return wrap(<DashboardLayout sidebar={sidebar}>{children}</DashboardLayout>);
  }

  const userInfo = await getUserInfo();
  if (!userInfo || !userInfo.email) {
    redirect("/auth/signin");
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(",");
  if (!adminEmails?.includes(userInfo?.email)) {
    return wrap(<Empty message="No access" />);
  }

  return wrap(<DashboardLayout sidebar={sidebar}>{children}</DashboardLayout>);
}
