import { useEffect, useRef, useState } from "react";
import { isPurchasable } from "../data/products";
import { trackEvent } from "../integrations/meiro/meiroClient";
import { getPersonalizationDecision } from "../integrations/meiro/meiroPersonalization";
import { useAppState } from "../store/appState";
import type { PersonalizationZoneId, Product, RecommendationStrategy } from "../types";
import { formatProfileDate } from "../utils/format";
import { recommendProducts } from "../utils/recommendations";
import { FREE_GIFT_THRESHOLD, FREE_SHIPPING_THRESHOLD, Money, formatCzk } from "./format";
import { ArrowIcon, BagIcon, BellIcon, ChevronIcon, HeartIcon, MinusIcon, PlusIcon, Stars } from "./icons";
import { LeafMark } from "./Logo";
import { Link } from "./router";

export const productUrl = (product: Product) => `/product/${product.slug}`;

export function ProductImage({ product, size = "card", eager = false }: { product: Product; size?: "card" | "large" | "thumb"; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`product-image product-image-${size}`}>
      {failed ? (
        <div className="product-image-fallback" aria-hidden="true">
          <LeafMark size={size === "thumb" ? 22 : 44} />
          <span>{product.brand}</span>
        </div>
      ) : (
        <img
          src={product.image}
          alt={`${product.brand} ${product.name}${product.detail ? `, ${product.detail}` : ""}`}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function discountPercent(product: Product) {
  return product.compareAtPrice ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;
}

export function ProductBadges({ product }: { product: Product }) {
  const discount = discountPercent(product);
  const badges: Array<{ label: string; tone: string }> = [];
  if (product.stockStatus === "preorder") badges.push({ label: "Pre-order", tone: "brand" });
  else if (product.isNew) badges.push({ label: "New", tone: "brand" });
  if (product.isSecondChance) badges.push({ label: "Second chance", tone: "amber" });
  if (discount > 0) badges.push({ label: `−${discount} %`, tone: "sale" });
  if (product.isVegan && badges.length < 2) badges.push({ label: "Vegan", tone: "leaf" });
  if (!badges.length) return null;
  return (
    <div className="badges">
      {badges.slice(0, 2).map((badge) => (
        <span key={badge.label} className={`badge badge-${badge.tone}`}>{badge.label}</span>
      ))}
    </div>
  );
}

export function RatingLine({ product, compact = false }: { product: Product; compact?: boolean }) {
  if (!product.rating || !product.reviewCount) return null;
  return (
    <span className="rating-line" aria-label={`Rated ${product.rating} out of 5 from ${product.reviewCount} reviews`}>
      <Stars rating={product.rating} size={compact ? 12 : 14} />
      <span className="rating-value">{product.rating.toFixed(1)}</span>
      <span className="rating-count">({product.reviewCount})</span>
    </span>
  );
}

export function StockNote({ product }: { product: Product }) {
  if (product.stockStatus === "preorder") return <span className="stock stock-preorder">Launches {formatProfileDate(product.releaseDate)}</span>;
  if (product.stockStatus === "out_of_stock") return <span className="stock stock-out">Out of stock</span>;
  if (product.stockStatus === "low_stock") return <span className="stock stock-low">Only {product.stockQty} left</span>;
  return <span className="stock stock-in">In stock, ships today</span>;
}

export function WishlistButton({ product, className = "" }: { product: Product; className?: string }) {
  const { wishlist, toggleWishlist } = useAppState();
  const active = wishlist.includes(product.id);
  return (
    <button
      type="button"
      className={`icon-button wishlist-button ${active ? "is-active" : ""} ${className}`}
      aria-pressed={active}
      aria-label={active ? `Remove ${product.name} from favourites` : `Save ${product.name} to favourites`}
      onClick={() => toggleWishlist(product.id)}
    >
      <HeartIcon size={18} filled={active} />
    </button>
  );
}

export function ProductCard({ product, source = "grid", position }: { product: Product; source?: string; position?: number }) {
  const { addToCart, requestBackInStock, watchdog } = useAppState();
  const purchasable = isPurchasable(product);
  const watching = watchdog.includes(product.id);
  const handleSelect = () => {
    if (source !== "grid") trackEvent("recommendation_clicked", { strategy: source, product_id: product.id, product_name: product.title, category: product.category, price: product.price, position });
  };

  return (
    <article className="product-card" data-product-id={product.id}>
      <div className="product-card-media">
        <Link to={productUrl(product)} onClick={handleSelect} tabIndex={-1} aria-hidden="true">
          <ProductImage product={product} />
        </Link>
        <ProductBadges product={product} />
        <WishlistButton product={product} className="product-card-wish" />
        {purchasable ? (
          <button type="button" className="quick-add" onClick={() => addToCart(product.id)} aria-label={`Add ${product.name} to basket`}>
            <PlusIcon size={18} />
            <span>{product.stockStatus === "preorder" ? "Pre-order" : "Quick add"}</span>
          </button>
        ) : (
          <button type="button" className="quick-add quick-add-muted" disabled={watching} onClick={() => requestBackInStock(product.id)}>
            <BellIcon size={16} />
            <span>{watching ? "We'll email you" : "Notify me"}</span>
          </button>
        )}
      </div>
      <div className="product-card-body">
        <span className="product-card-brand">{product.brand}</span>
        <Link to={productUrl(product)} className="product-card-name" onClick={handleSelect}>
          {product.name}
        </Link>
        {product.detail && <span className="product-card-detail">{product.detail}</span>}
        <RatingLine product={product} compact />
        <div className="price">
          <Money value={product.price} className={product.compareAtPrice ? "price-now is-sale" : "price-now"} />
          {product.compareAtPrice && <s className="price-was">{formatCzk(product.compareAtPrice)}</s>}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items, source = "grid" }: { items: Product[]; source?: string }) {
  return (
    <div className="product-grid">
      {items.map((product, index) => (
        <ProductCard key={product.id} product={product} source={source} position={index + 1} />
      ))}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: { label: string; to: string } }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <Link to={action.to} className="text-link">
          {action.label} <ArrowIcon size={16} />
        </Link>
      )}
    </div>
  );
}

export function ProductRail({
  title,
  subtitle,
  strategy,
  currentProductId,
  category,
  limit = 8,
  items: providedItems,
  action,
  trackingTitle,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  strategy: RecommendationStrategy | string;
  currentProductId?: string;
  category?: string;
  limit?: number;
  items?: Product[];
  action?: { label: string; to: string };
  trackingTitle?: string;
}) {
  const state = useAppState();
  const items = providedItems ?? recommendProducts(strategy as RecommendationStrategy, state, { currentProductId, category, limit });
  const ids = items.map((item) => item.id).join(",");
  const titleLabel = trackingTitle ?? (typeof title === "string" ? title : "personalized");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (items.length) trackEvent("recommendation_viewed", { strategy, title: titleLabel, product_ids: items.map((item) => item.id) });
  }, [strategy, titleLabel, ids]);

  if (!items.length) return null;
  const scrollBy = (direction: number) => scroller.current?.scrollBy({ left: direction * scroller.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className="rail">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="rail-controls">
          {action && (
            <Link to={action.to} className="text-link">
              {action.label} <ArrowIcon size={16} />
            </Link>
          )}
          <button type="button" className="icon-button rail-arrow rail-arrow-prev" aria-label="Scroll left" onClick={() => scrollBy(-1)}>
            <ChevronIcon size={18} />
          </button>
          <button type="button" className="icon-button rail-arrow" aria-label="Scroll right" onClick={() => scrollBy(1)}>
            <ChevronIcon size={18} />
          </button>
        </div>
      </div>
      <div className="rail-track" ref={scroller}>
        {items.map((product, index) => (
          <ProductCard key={product.id} product={product} source={String(strategy)} position={index + 1} />
        ))}
      </div>
    </section>
  );
}

export function PersonalizationZone({
  zoneId,
  fallback,
  className,
  inline = false,
}: {
  zoneId: PersonalizationZoneId;
  fallback: React.ReactNode;
  className?: string;
  inline?: boolean;
}) {
  const state = useAppState();
  const decision = getPersonalizationDecision(zoneId, state);
  const message = decision.content;
  useEffect(() => {
    state.recordPersonalizationDecision(decision);
    trackEvent("personalization_viewed", {
      zone_id: zoneId,
      decision: decision.decision,
      rule_id: decision.ruleId,
      reason: decision.reason,
      persona_id: state.personaId,
    });
  }, [zoneId, decision.decision, decision.ruleId, decision.reason, message, state.personaId]);

  const content = message ?? fallback;
  const props = { className, "data-zone": zoneId, "data-decision": decision.decision };
  return inline ? <span {...props}>{content}</span> : <div {...props}>{content}</div>;
}

export function EmptyState({ title, body, action, children }: { title: string; body: string; action?: { label: string; to: string }; children?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <LeafMark size={36} className="empty-mark" />
      <h2>{title}</h2>
      <p>{body}</p>
      {action && <Link to={action.to} className="button button-primary">{action.label}</Link>}
      {children}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function QuantityStepper({ value, onChange, label, min = 1 }: { value: number; onChange: (next: number) => void; label: string; min?: number }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label="Decrease quantity" onClick={() => onChange(value - 1)} disabled={value <= min && min > 0}>
        <MinusIcon size={16} />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label="Increase quantity" onClick={() => onChange(value + 1)}>
        <PlusIcon size={16} />
      </button>
    </div>
  );
}

export function FreeShippingMeter({ subtotal }: { subtotal: number }) {
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
  const giftRemaining = FREE_GIFT_THRESHOLD - subtotal;
  const progress = Math.min(1, subtotal / FREE_SHIPPING_THRESHOLD);
  return (
    <div className="shipping-meter">
      <p>
        {remaining > 0 ? (
          <>
            Add <strong>{formatCzk(remaining)}</strong> for free shipping
            {giftRemaining > 0 ? <> · {formatCzk(giftRemaining)} to your free gift</> : <> · free gift unlocked</>}
          </>
        ) : (
          <>
            <strong>Free shipping</strong> and a free gift are yours
          </>
        )}
      </p>
      <div className="meter" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
        <i style={{ left: `${(FREE_GIFT_THRESHOLD / FREE_SHIPPING_THRESHOLD) * 100}%` }} />
      </div>
    </div>
  );
}

export function AddToBagButton({ product, quantity = 1, className = "" }: { product: Product; quantity?: number; className?: string }) {
  const { addToCart, requestBackInStock, watchdog } = useAppState();
  if (!isPurchasable(product)) {
    const watching = watchdog.includes(product.id);
    return (
      <button type="button" className={`button button-secondary ${className}`} disabled={watching} onClick={() => requestBackInStock(product.id)}>
        <BellIcon size={18} /> {watching ? "We'll email you when it's back" : "Notify me when available"}
      </button>
    );
  }
  return (
    <button type="button" className={`button button-primary ${className}`} onClick={() => addToCart(product.id, quantity)}>
      <BagIcon size={18} /> {product.stockStatus === "preorder" ? "Pre-order now" : "Add to basket"}
    </button>
  );
}
