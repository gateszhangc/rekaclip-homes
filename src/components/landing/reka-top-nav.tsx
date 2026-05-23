"use client";

import { useState } from "react";
import Image from "next/image";
import { Link, usePathname } from "@/i18n/navigation";
import SignToggle from "@/components/sign/toggle";
import { Menu, X } from "lucide-react";

export const REKA_NAV_ITEMS = [
  { id: "clip", label: "Clip", icon: "Scissors", href: "/#clip" },
  { id: "boost", label: "Boost", icon: "Rocket", href: "/#boost" },
  { id: "feature", label: "Feature", icon: "Sparkles", href: "/#feature" },
  { id: "blog", label: "Blog", icon: "BookOpen", href: "/blog" },
  { id: "faq", label: "FAQ", icon: "HelpCircle", href: "/#faq" },
  { id: "pricing", label: "Pricing", icon: "DollarSign", href: "/pricing" },
] as const;

export const REKA_SECTION_IDS = ["clip", "boost", "feature", "faq"] as const;

function NavIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    Scissors: <ScissorsIcon />,
    Rocket: <RocketIcon />,
    Sparkles: <SparklesIcon />,
    DollarSign: <DollarIcon />,
    HelpCircle: <HelpIcon />,
    BookOpen: <BookOpenIcon />,
  };
  return <>{icons[name] || null}</>;
}

function ScissorsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}
function RocketIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}
function SparklesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8H4.4l4.8 3.5-1.9 5.8L12 14.6l4.7 3.5-1.9-5.8 4.8-3.5H13.9L12 3z" />
      <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
    </svg>
  );
}
function DollarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function HelpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function BookOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  );
}

export default function RekaTopNav({
  activeSection,
  onNavigate,
}: {
  activeSection: string;
  onNavigate?: (id: string) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isBlogRoute = pathname === "/blog" || pathname.startsWith("/blog/");

  const handleNav = (id: string, e: React.MouseEvent) => {
    if (id === "pricing" || id === "blog") {
      setMobileOpen(false);
      return;
    }
    if (isHome && onNavigate) {
      e.preventDefault();
      onNavigate(id);
      setMobileOpen(false);
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <>
      <header className="reka-top-nav">
        <div className="reka-top-nav-inner">
          <Link href="/" className="reka-top-nav-logo" onClick={() => setMobileOpen(false)}>
            <Image
              src="/imgs/logos/logo.svg"
              alt="Reka Clip"
              width={32}
              height={32}
              className="reka-top-nav-logo-mark"
              priority
            />
            <span>Reka Clip</span>
          </Link>

          <nav className="reka-top-nav-links" aria-label="Main">
            {REKA_NAV_ITEMS.map((item) => {
              const isActive =
                activeSection === item.id || (item.id === "blog" && isBlogRoute);

              return (
                <Link
                  key={item.id}
                  href={item.href as "/"}
                  className={`reka-top-nav-item ${isActive ? "active" : ""}`}
                  onClick={(e) => handleNav(item.id, e)}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="reka-top-nav-actions">
            <SignToggle />
            <button
              type="button"
              className="reka-top-nav-menu-btn"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="reka-top-nav-mobile" aria-label="Main mobile">
            {REKA_NAV_ITEMS.map((item) => {
              const isActive =
                activeSection === item.id || (item.id === "blog" && isBlogRoute);

              return (
                <Link
                  key={item.id}
                  href={item.href as "/"}
                  className={`reka-top-nav-item ${isActive ? "active" : ""}`}
                  onClick={(e) => handleNav(item.id, e)}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      {mobileOpen && (
        <div className="reka-top-nav-overlay" onClick={() => setMobileOpen(false)} aria-hidden />
      )}
    </>
  );
}
