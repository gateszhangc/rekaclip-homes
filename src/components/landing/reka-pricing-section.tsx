"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader, Sparkles, X } from "lucide-react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Pricing as PricingType, PricingItem } from "@/types/blocks/pricing";
import { useAppContext } from "@/contexts/app";
import { trackEvent } from "@/lib/analytics";

export interface RekaPricingItem extends PricingItem {
  features_excluded?: string[];
  billed_note?: string;
  promo_text?: string;
  show_pack_selector?: boolean;
}

interface RekaPricingSectionProps {
  pricing: PricingType & { items?: RekaPricingItem[] };
}

const PACK_OPTIONS = [
  { id: "1", label: "1 pack", multiplier: 1 },
  { id: "2", label: "2 packs", multiplier: 2 },
  { id: "3", label: "3 packs", multiplier: 3 },
];

export default function RekaPricingSection({ pricing }: RekaPricingSectionProps) {
  const locale = useLocale();
  const { setShowSignModal } = useAppContext();
  const checkoutPaused = process.env.NEXT_PUBLIC_PAUSE_CHECKOUT === "true";

  const [group, setGroup] = useState(() => {
    const featured = pricing.groups?.find((g) => g.is_featured);
    return featured?.name || pricing.groups?.[0]?.name || "monthly";
  });
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [proPack, setProPack] = useState("1");

  const visibleItems = useMemo(
    () =>
      (pricing.items as RekaPricingItem[] | undefined)?.filter(
        (item) => !item.group || item.group === group
      ) ?? [],
    [pricing.items, group]
  );

  const isAuthError = (message?: string | null) => {
    if (!message) return false;
    const normalized = message.toLowerCase();
    return (
      normalized.includes("no auth") ||
      normalized.includes("unauth") ||
      normalized.includes("sign-in") ||
      normalized.includes("sign in")
    );
  };

  const handleCheckout = async (item: RekaPricingItem) => {
    if (checkoutPaused) return;

    try {
      trackEvent("begin_checkout", {
        plan_id: item.product_id,
        interval: item.interval,
        currency: (item.currency || "usd").toUpperCase(),
        ui_source: "pricing_page",
      });

      setLoadingId(item.product_id);

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: item.product_id,
          currency: item.currency || "USD",
          locale: locale || "en",
        }),
      });

      const payload = await response.json().catch(() => null);

      if (response.status === 401) {
        setShowSignModal(true);
        return;
      }

      if (!payload || payload.code !== 0) {
        if (isAuthError(payload?.message)) {
          setShowSignModal(true);
          return;
        }
        toast.error(payload?.message || "Checkout failed");
        return;
      }

      if (payload.data?.checkout_url) {
        window.location.href = payload.data.checkout_url;
      } else {
        toast.error("Checkout failed");
      }
    } catch {
      toast.error("Checkout failed");
    } finally {
      setLoadingId(null);
    }
  };

  useEffect(() => {
    if (!visibleItems.length) return;
    trackEvent("view_item_list", {
      item_list_id: "pricing",
      item_list_name: group,
      items: visibleItems.map((item) => ({
        item_id: item.product_id,
        item_name: item.product_name || item.title || item.product_id,
      })),
    });
  }, [group, visibleItems]);

  return (
    <section className="reka-pricing-page">
      <div className="reka-page-container">
        <div className="reka-pricing-inner">
        <header className="reka-pricing-header landing-reveal landing-reveal--1">
          <h1 className="reka-pricing-title">{pricing.title}</h1>
          {pricing.description && <p className="reka-pricing-desc">{pricing.description}</p>}
        </header>

        {pricing.groups && pricing.groups.length > 0 && (
          <div className="reka-pricing-toggle landing-reveal landing-reveal--2">
            {pricing.groups.map((tab) => (
              <button
                key={tab.name}
                type="button"
                className={`reka-pricing-toggle-btn ${group === tab.name ? "reka-pricing-toggle-btn--active" : ""}`}
                onClick={() => setGroup(tab.name || "monthly")}
              >
                {tab.title}
                {tab.label && <span className="reka-pricing-toggle-badge">{tab.label}</span>}
              </button>
            ))}
          </div>
        )}

        <div className="reka-pricing-grid landing-reveal landing-reveal--3">
          {visibleItems.map((item) => (
            <article
              key={item.product_id}
              className={`reka-pricing-card ${item.is_featured ? "reka-pricing-card--featured" : ""}`}
            >
              <div className="reka-pricing-card-head">
                <h2 className="reka-pricing-card-title">{item.title}</h2>
                {item.label && item.is_featured && (
                  <span className="reka-pricing-card-badge">{item.label}</span>
                )}
              </div>

              <div className="reka-pricing-price-row">
                <span
                  className={`reka-pricing-price ${item.is_featured ? "reka-pricing-price--gradient" : ""}`}
                >
                  {item.price}
                </span>
                {item.original_price && (
                  <span className="reka-pricing-price-original">
                    {item.original_price}
                    {item.unit && <span className="reka-pricing-price-unit"> {item.unit}</span>}
                  </span>
                )}
                {!item.original_price && item.unit && (
                  <span className="reka-pricing-price-unit">{item.unit}</span>
                )}
              </div>

              {item.billed_note && <p className="reka-pricing-billed-note">{item.billed_note}</p>}

              {item.show_pack_selector && (
                <div className="reka-pricing-pack-row">
                  <span className="reka-pricing-pack-mult">1x</span>
                  <div className="reka-pricing-pack-select">
                    <select
                      value={proPack}
                      onChange={(e) => setProPack(e.target.value)}
                      aria-label="Select pack quantity"
                    >
                      {PACK_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="reka-pricing-pack-chevron" aria-hidden />
                  </div>
                </div>
              )}

              {item.promo_text && item.is_featured && (
                <div className="reka-pricing-promo">
                  <Sparkles size={14} aria-hidden />
                  <span>{item.promo_text}</span>
                </div>
              )}

              <button
                type="button"
                className="reka-pricing-cta-btn"
                disabled={!!loadingId || checkoutPaused}
                onClick={() => handleCheckout(item)}
              >
                {loadingId === item.product_id ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    {item.button?.title || "Upgrade"}
                  </>
                ) : (
                  item.button?.title || "Upgrade"
                )}
              </button>

              <ul className="reka-pricing-features">
                {item.features?.map((feature) => (
                  <li key={feature} className="reka-pricing-feature reka-pricing-feature--included">
                    <span
                      className={`reka-pricing-feature-icon ${item.is_featured ? "reka-pricing-feature-icon--pro" : ""}`}
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
                {item.features_excluded?.map((feature) => (
                  <li key={feature} className="reka-pricing-feature reka-pricing-feature--excluded">
                    <span className="reka-pricing-feature-icon reka-pricing-feature-icon--muted">
                      <X size={14} strokeWidth={2} />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}
