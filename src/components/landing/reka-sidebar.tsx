"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import SignToggle from "@/components/sign/toggle";
import { Menu } from "lucide-react";

export const REKA_NAV_ITEMS = [
  { id: "clip", label: "Clip", icon: "Scissors", href: "/" },
  { id: "boost", label: "Boost", icon: "Rocket", href: "/boost" },
  { id: "feature", label: "Feature", icon: "Sparkles", href: "/feature" },
  { id: "pricing", label: "Pricing", icon: "DollarSign", href: "/pricing" },
  { id: "faq", label: "FAQ", icon: "HelpCircle", href: "/faq" },
] as const;

function NavIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    Scissors: <ScissorsIcon />,
    Rocket: <RocketIcon />,
    Sparkles: <SparklesIcon />,
    DollarSign: <DollarIcon />,
    HelpCircle: <HelpIcon />,
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

export default function RekaSidebar({
  activeSection,
  onNavigate,
}: {
  activeSection: string;
  onNavigate?: (id: string) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (id: string) => {
    onNavigate?.(id);
    setMobileOpen(false);
  };

  return (
    <>
      <div className="reka-mobile-header">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="text-[var(--text-secondary)] hover:text-[var(--text)] transition"
        >
          <Menu size={24} />
        </button>
        <span className="font-display font-bold text-lg">Reka Clip</span>
        <SignToggle />
      </div>

      {mobileOpen && (
        <div className="reka-sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`reka-sidebar ${mobileOpen ? "open" : ""}`}>
        <Link href="/" className="reka-sidebar-logo" onClick={() => setMobileOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-bold text-sm">
            R
          </div>
          <span>Reka Clip</span>
        </Link>

        <nav className="reka-sidebar-nav">
          {REKA_NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`reka-sidebar-item ${activeSection === item.id ? "active" : ""}`}
              onClick={() => handleNav(item.id)}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="reka-sidebar-user">
          <SignToggle />
        </div>
      </aside>
    </>
  );
}
