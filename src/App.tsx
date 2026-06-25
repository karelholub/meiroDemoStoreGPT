import { useEffect, useMemo, useState } from "react";
import { categories } from "./data/categories";
import { personas } from "./data/personas";
import { profileApiScenarios } from "./data/profileApiScenarios";
import { products } from "./data/products";
import { getMeiroConfigStatus } from "./integrations/meiro/meiroConfig";
import { identifyUser, trackEvent, trackPageView } from "./integrations/meiro/meiroClient";
import { cartPayload, productPayload } from "./integrations/meiro/meiroEvents";
import { getPersonalizationDecision } from "./integrations/meiro/meiroPersonalization";
import { getMeiroProfileApiStatus } from "./integrations/meiro/meiroProfileApi";
import { AppStateProvider, useAppState } from "./store/appState";
import type { ConsentState, CustomerProfile, PersonalizationZoneId, Product, RecommendationStrategy } from "./types";
import { formatMaybeProfileDate, formatProfileDate } from "./utils/format";
import { recommendProducts } from "./utils/recommendations";

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function usePath() {
  const [path, setPath] = useState(window.location.pathname + window.location.search);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname + window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

function Link({
  to,
  children,
  className,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

function Money({ value }: { value: number }) {
  return <>{new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value)}</>;
}

const categoryTone: Record<string, string> = {
  "Work & Meetings": "tone-work",
  "Parenting & Chaos": "tone-chaos",
  "Sleep & Recovery": "tone-sleep",
  "Existential Wellness": "tone-wellness",
  "Marketing Therapy": "tone-marketing",
  "Tiny Dopamine": "tone-dopamine",
  "Gifts for People Who Say “I’m Fine”": "tone-gifts",
};

const visualCrops = ["50% 50%", "38% 45%", "62% 43%", "45% 62%", "68% 58%", "35% 38%", "54% 34%"];
const visualVariants = ["variant-seal", "variant-label", "variant-band", "variant-corner", "variant-ticket", "variant-swatch"];

function productVisualVariant(product: Product) {
  const hash = [...product.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const stockLabel = product.stockStatus === "low_stock" ? "Low stock" : product.stockStatus === "fake_sold_out" ? "Archived" : product.tags[0];

  return {
    badge: stockLabel,
    className: visualVariants[hash % visualVariants.length],
    crop: visualCrops[hash % visualCrops.length],
    rotation: `${(hash % 7) - 3}deg`,
    sku: product.id.split("-").slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
  };
}

function ProductVisual({ product, size = "card" }: { product: Product; size?: "card" | "large" | "thumb" }) {
  const words = product.name.split(" ");
  const monogram = words.slice(0, 2).map((word) => word[0]).join("");
  const tagLine = product.tags.slice(0, 2).join(" / ");
  const variant = productVisualVariant(product);
  const visualStyle = {
    "--product-crop": variant.crop,
    "--label-tilt": variant.rotation,
  } as React.CSSProperties;

  return (
    <div className={`product-visual ${categoryTone[product.category] ?? "tone-work"} ${variant.className} ${size}`} style={visualStyle} role="img" aria-label={`${product.name} product image`}>
      <img src={product.image} alt="" loading={size === "large" ? "eager" : "lazy"} />
      <div className="visual-package" />
      <div className="visual-finish" />
      <span className="visual-badge">{variant.badge}</span>
      <div className="visual-overlay">
        <span className="visual-brand">ESC</span>
        <strong>{product.name}</strong>
        <small>{tagLine}</small>
      </div>
      <span className="visual-sku">{variant.sku}</span>
      <em className="visual-monogram">{monogram}</em>
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark">ESC</span>
      <h2>{title}</h2>
      <p>{body}</p>
      {action && <Link to={action.to} className="primary-cta">{action.label}</Link>}
    </div>
  );
}

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "brand-lockup compact" : "brand-lockup"} aria-label="Existential Supplies Co.">
      <svg className="brand-mark" viewBox="0 0 96 72" aria-hidden="true">
        <path d="M14 44a34 34 0 0 1 68 0" />
        <path d="M36 44a18 18 0 0 1 36 0" />
        <path d="M8 46h80" />
        <path d="M12 54c16-2 28-2 44 0 13 2 22 1 34-1" />
        <path d="M18 61c12-2 22-2 36 0 9 1 17 1 26-1" />
        <path d="M25 44V24l-8 17h16l-8-17Z" />
        <path d="M21 32h8" />
        <path d="M48 15l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" />
        <path d="M70 23c5-4 9-5 14-4-3 2-4 4-3 7-5 0-8-1-11-3Z" />
      </svg>
      <span className="brand-words">
        <strong>Existential </strong>
        <small>Supplies Co.</small>
      </span>
    </span>
  );
}

function Header() {
  const { cart } = useAppState();
  const path = usePath();
  const [pathname] = path.split("?");
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const navItems = [
    { to: "/products", label: "Shop" },
    { to: "/search", label: "Search" },
    { to: "/account", label: "Account" },
    { to: "/playbooks", label: "Playbooks" },
    { to: "/demo-control", label: "Demo", className: "demo-nav-link" },
  ];
  return (
    <header className="site-header">
      <Link to="/" className="brand"><BrandLogo /></Link>
      <nav aria-label="Primary navigation">
        {navItems.map((item) => {
          const active = pathname === item.to || (item.to === "/products" && (pathname.startsWith("/category/") || pathname.startsWith("/product/")));
          return <Link key={item.to} to={item.to} className={[active ? "active" : "", item.className ?? ""].filter(Boolean).join(" ")}>{item.label}</Link>;
        })}
        <Link to="/cart" className={["cart-link", pathname === "/cart" ? "active" : ""].filter(Boolean).join(" ")} aria-label={count > 0 ? `Cart with ${count} items` : "Cart"}>
          <span className="cart-label">Cart</span>
          <span className="cart-count">{count}</span>
        </Link>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div>
        <BrandLogo compact />
        <p>Fake products. Real customer journeys. Built for Meiro CDP demos.</p>
      </div>
      <div className="footer-links">
        <Link to="/products">Catalog</Link>
        <Link to="/playbooks">Playbooks</Link>
        <Link to="/register">Register</Link>
        <Link to="/login">Login</Link>
      </div>
    </footer>
  );
}

function PersonalizationZone({
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
  return inline ? <span className={className}>{content}</span> : <div className={className}>{content}</div>;
}

function ProductCard({ product, source = "grid" }: { product: Product; source?: string }) {
  const { addToCart } = useAppState();
  const handleProductSelect = () => {
    if (source !== "grid") {
      trackEvent("recommendation_clicked", { strategy: source, product_id: product.id });
    }
  };

  return (
    <article className="product-card">
      <Link to={`/product/${product.slug}`} onClick={handleProductSelect}>
        <ProductVisual product={product} />
      </Link>
      <div className="card-copy">
        <span className="eyebrow">{product.category}</span>
        <Link to={`/product/${product.slug}`} className="product-name" onClick={handleProductSelect}>{product.name}</Link>
        <p>{product.shortDescription}</p>
        <div className="price-row">
          <strong><Money value={product.price} /></strong>
          {product.compareAtPrice && <s><Money value={product.compareAtPrice} /></s>}
        </div>
        <button type="button" onClick={() => addToCart(product.id)} disabled={product.stockStatus === "fake_sold_out"}>
          {product.stockStatus === "fake_sold_out" ? "Temporarily mythical" : "Add to cart"}
        </button>
      </div>
    </article>
  );
}

function ProductGrid({ items }: { items: Product[] }) {
  return <div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}

const ecommercePlaybooks = [
  {
    id: "abandoned-cart",
    title: "Abandoned cart recovery",
    trigger: "cart_abandoned with cart value and item ids",
    path: "/cart",
    personaId: "cart_abandoner",
    webSurface: "Cart banner, cart lines, checkout entry, live signal strip",
    profileFields: ["has_active_cart", "last_abandoned_cart_value", "cart_item_ids"],
  },
  {
    id: "welcome-first-purchase",
    title: "Welcome and first-purchase nurture",
    trigger: "customer_registered or email_subscribed",
    path: "/register",
    personaId: "newsletter",
    webSurface: "Registration, newsletter signup, bestseller rail, first-purchase offer slot",
    profileFields: ["total_orders", "signup_channel", "marketing_consent"],
  },
  {
    id: "replenishment",
    title: "Replenishment and reorder reminder",
    trigger: "predicted_reorder_date from profile attributes",
    path: "/account",
    personaId: "post_purchase",
    webSurface: "Account reorder slot, profile API field preview, one-click reorder CTA",
    profileFields: ["predicted_reorder_date", "last_purchased_sku", "days_since_last_purchase"],
  },
  {
    id: "post-purchase-cross-sell",
    title: "Post-purchase upsell and cross-sell",
    trigger: "order_confirmed with line items",
    path: "/thank-you",
    personaId: "post_purchase",
    webSurface: "Thank-you next-best-action, complementary products, cart cross-sell rail",
    profileFields: ["last_purchased_category", "last_purchased_sku", "second_purchase"],
  },
  {
    id: "win-back",
    title: "Win-back lapsed customer",
    trigger: "lapsed_customers audience",
    path: "/",
    personaId: "lapsed_customer",
    webSurface: "Homepage comeback banner, saved category picks, incentive slot",
    profileFields: ["days_since_last_purchase", "last_purchased_category", "journey_membership"],
  },
  {
    id: "vip",
    title: "VIP and high-value customer program",
    trigger: "vip_tier changes to gold",
    path: "/account",
    personaId: "high_value",
    webSurface: "VIP profile panel, early-access banner, premium recommendation rail",
    profileFields: ["vip_tier", "lifetime_value", "purchase_count"],
  },
  {
    id: "browse-abandonment",
    title: "Browse abandonment",
    trigger: "product_view with no add_to_cart",
    path: "/products",
    personaId: "known_customer",
    webSurface: "Recently viewed rail, same-category recommendations, identified profile state",
    profileFields: ["last_viewed_product_id", "viewed_product_count", "push_opt_in"],
  },
  {
    id: "review-referral",
    title: "Post-purchase review and referral",
    trigger: "order_delivered from OMS or shipping webhook",
    path: "/review",
    personaId: "post_purchase",
    webSurface: "Review form, referral code panel, purchased-product context",
    profileFields: ["delivery_status", "repeat_buyer", "has_left_review"],
  },
] as const;

type ProfileAttributeRow = {
  category: "configured" | "optional" | "post_delivery";
  label: string;
  field: string;
  value: unknown;
  surface: string;
};

function profileFieldValue(field: string, profile: CustomerProfile): unknown {
  const values: Record<string, unknown> = {
    cart_item_ids: profile.cartItemIds,
    category_affinity: profile.categoryAffinity ?? profile.preferredCategory,
    days_since_last_purchase: profile.daysSinceLastPurchase,
    delivery_status: profile.deliveryStatus,
    discount_affinity: profile.discountAffinity,
    has_active_cart: profile.hasActiveCart,
    has_left_review: profile.hasLeftReview,
    journey_membership: profile.journeyMembership,
    last_abandoned_cart_value: profile.lastAbandonedCartValue,
    last_purchased_category: profile.lastPurchasedCategory,
    last_purchased_sku: profile.lastPurchasedSku,
    last_viewed_product_id: profile.lastViewedProductId,
    lifetime_value: profile.lifetimeValue,
    marketing_consent: profile.marketingConsent,
    next_best_action: profile.nextBestAction,
    next_best_product_ids: profile.nextBestProductIds,
    predicted_reorder_date: profile.predictedReorderDate,
    purchase_count: profile.purchaseCount,
    push_opt_in: profile.pushOptIn,
    referral_code: profile.referralCode,
    repeat_buyer: profile.repeatBuyer,
    second_purchase: profile.repeatBuyer,
    signup_channel: profile.signupChannel,
    total_orders: profile.purchaseCount,
    vip_tier: profile.vipTier,
    viewed_product_count: profile.viewedProductCount,
  };

  return values[field];
}

function hasProfileValue(value: unknown) {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

const configuredProfileApiFields = new Set([
  "vip_tier",
  "lifetime_value",
  "purchase_count",
  "total_orders",
  "days_since_last_purchase",
  "last_purchased_category",
  "last_viewed_product_id",
  "has_active_cart",
  "last_abandoned_cart_value",
  "cart_item_ids",
  "predicted_reorder_date",
  "last_purchased_sku",
  "journey_membership",
]);

const optionalProfileApiFields = new Set([
  "delivery_status",
  "referral_code",
  "has_left_review",
  "repeat_buyer",
]);

function PlaybookSummaryCard({ playbook }: { playbook: (typeof ecommercePlaybooks)[number] }) {
  const state = useAppState();
  return (
    <article className="playbook-card">
      <span className="eyebrow">{playbook.trigger}</span>
      <h2>{playbook.title}</h2>
      <p>{playbook.webSurface}</p>
      <div className="playbook-fields" aria-label={`${playbook.title} profile fields`}>
        {playbook.profileFields.map((field) => {
          const value = profileFieldValue(field, state.profile);
          const populated = hasProfileValue(value);
          const expected = configuredProfileApiFields.has(field);
          const optional = optionalProfileApiFields.has(field);
          const className = populated ? "filled" : expected ? "missing" : optional ? "optional" : "";
          return <code className={className} key={field}>{field}{populated ? `: ${formatProfileValue(value)}` : optional ? ": optional source" : ""}</code>;
        })}
      </div>
      <div className="actions">
        <button type="button" className="ghost" onClick={() => state.setPersona(playbook.personaId)}>Load scenario</button>
        <Link to={playbook.path} className="primary-cta">Open surface</Link>
      </div>
    </article>
  );
}

function RecommendationRail({
  title,
  strategy,
  currentProductId,
  category,
  limit = 4,
}: {
  title: React.ReactNode;
  strategy: RecommendationStrategy;
  currentProductId?: string;
  category?: string;
  limit?: number;
}) {
  const state = useAppState();
  const items = recommendProducts(strategy, state, { currentProductId, category, limit });
  const productIds = items.map((item) => item.id).join(",");
  const titleLabel = typeof title === "string" ? title : "personalized";
  useEffect(() => {
    trackEvent("recommendation_viewed", { strategy, title: titleLabel, product_ids: items.map((item) => item.id) });
  }, [strategy, titleLabel, productIds]);

  if (!items.length) return null;
  return (
    <section className="rail">
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      <div className="rail-grid">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} source={strategy} />
        ))}
      </div>
    </section>
  );
}

function LifecyclePlaybookSlots({ compact = false }: { compact?: boolean }) {
  const state = useAppState();
  const recentCategories = state.profile.recentlyViewedCategories;
  const favoriteCategory = state.profile.categoryAffinity ?? state.profile.preferredCategory ?? recentCategories[recentCategories.length - 1] ?? "Sleep & Recovery";
  const reorderProduct =
    products.find((product) => product.id === state.profile.lastPurchasedSku || product.slug === state.profile.lastPurchasedSku) ??
    products.find((product) => state.profile.purchases.includes(product.id)) ??
    products.find((product) => product.category === favoriteCategory) ??
    products[0];
  const categoryPicks = products.filter((product) => product.category === favoriteCategory).slice(0, compact ? 2 : 3);
  const lapsed =
    state.personaId === "lapsed_customer" ||
    state.profile.lifecycleStage === "lapsed_customer" ||
    state.profile.journeyMembership?.some((item) => item.toLowerCase().includes("win-back")) ||
    Boolean(state.profile.daysSinceLastPurchase && state.profile.daysSinceLastPurchase >= 60);
  const vip = state.personaId === "high_value" || state.profile.lifecycleStage === "high_value_customer" || ["gold", "platinum"].includes(String(state.profile.vipTier ?? "").toLowerCase());
  const predictedReorderDate = formatProfileDate(state.profile.predictedReorderDate);
  const reorderHint = state.profile.predictedReorderDate
    ? `Predicted reorder date: ${predictedReorderDate}.`
    : state.profile.daysSinceLastPurchase
      ? `${state.profile.daysSinceLastPurchase} days since last purchase.`
      : "Ready for Profile API fields such as predicted_reorder_date and last_purchased_sku.";

  return (
    <section className={compact ? "journey-slots compact" : "journey-slots"} aria-label="Meiro ecommerce playbook surfaces">
      <article className="journey-slot">
        <span className="eyebrow">Replenishment</span>
        <h2>Reorder timing slot</h2>
        <p>{reorderHint}</p>
        <div className="slot-product">
          <ProductVisual product={reorderProduct} size="thumb" />
          <div>
            <strong>{reorderProduct.name}</strong>
            <span>{state.profile.predictedReorderDate ? `Reorder on ${predictedReorderDate}` : "Suggested reorder in 3 days"}</span>
          </div>
        </div>
        <Link to={`/product/${reorderProduct.slug}`} className="signal-link">Reorder product</Link>
      </article>
      <article className="journey-slot">
        <span className="eyebrow">{vip ? "VIP active" : "VIP program"}</span>
        <h2>{vip ? "Early access is unlocked" : "VIP treatment slot"}</h2>
        <p>{state.profile.vipTier ? `${state.profile.vipTier} tier, ${state.profile.purchaseCount ?? 0} orders, EUR ${state.profile.lifetimeValue ?? 0} lifetime value.` : "Use vip_tier, lifetime_value, and purchase_count to change offers without changing the page."}</p>
        <Link to="/account" className="signal-link">View profile tier</Link>
      </article>
      <article className="journey-slot">
        <span className="eyebrow">{lapsed ? "Win-back active" : "Win-back"}</span>
        <h2>{lapsed ? "We saved your last category" : "Lapsed customer offer slot"}</h2>
        <p>{lapsed && state.profile.daysSinceLastPurchase ? `${state.profile.daysSinceLastPurchase} days since last purchase. ` : ""}{favoriteCategory} picks can be filled from a catalog feed scoped by last_purchased_category.</p>
        <div className="mini-products">
          {categoryPicks.map((product) => <ProductVisual key={product.id} product={product} size="thumb" />)}
        </div>
      </article>
    </section>
  );
}

function HomePage() {
  const heroProducts = [
    products.find((product) => product.id === "strategic-nap-pillow"),
    products.find((product) => product.id === "executive-decision-dice"),
    products.find((product) => product.id === "im-fine-care-parcel"),
  ].filter(Boolean) as Product[];
  const heroText = (
    <>
      Everything you need for the life you did not fully plan.
      <span>Premium fictional supplies for meetings, Mondays, parenting chaos, and tiny existential emergencies.</span>
    </>
  );
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <PersonalizationZone zoneId="homepage_top_banner" fallback="Free simulated shipping over EUR 120. Emotional shipping remains variable." className="banner" />
          <h1><PersonalizationZone zoneId="homepage_hero" fallback={heroText} /></h1>
          <p>Fictional essentials for meetings, Mondays, sleep, parenting chaos, and tiny emergencies of being human.</p>
          <div className="hero-actions">
            <Link to="/products" className="primary-cta">Shop survival essentials</Link>
            <Link to="/demo-control" className="secondary-cta">Open demo control</Link>
          </div>
          <div className="hero-proof" aria-label="Store highlights">
            <span><strong>42</strong> absurdly useful products</span>
            <span><strong>21</strong> intent signals</span>
            <span><strong>0</strong> real payments</span>
          </div>
        </div>
        <div className="hero-showcase" aria-label="Featured survival supplies">
          <span className="eyebrow">Featured survival kit</span>
          <div className="hero-product-stack">
            {heroProducts.map((product) => (
              <Link key={product.id} to={`/product/${product.slug}`} className="hero-product">
                <ProductVisual product={product} size="thumb" />
                <span>{product.name}</span>
              </Link>
            ))}
          </div>
          <div className="hero-signal">
            <strong>Personalized slots ready</strong>
            <span>Hero, catalog rails, cart recovery, and lifecycle offers can all be filled from Meiro profile attributes.</span>
          </div>
        </div>
      </section>
      <section className="home-intro" aria-label="Homepage personalization summary">
        <span className="eyebrow">Demo commerce surface</span>
        <h2>Retail polish on top, CDP proof underneath.</h2>
        <p>Browse categories, trigger cart intent, complete a checkout, and watch Profile API attributes reshape the storefront without changing the experience.</p>
      </section>
      <section className="category-strip">
        {categories.map((category) => (
          <Link key={category.slug} to={`/category/${category.slug}`} className="category-card">
            <span>{category.name}</span>
            <p>{category.description}</p>
          </Link>
        ))}
      </section>
      <RecommendationRail
        title={<PersonalizationZone zoneId="homepage_recommendation_rail" fallback="Recommended for modern emotional logistics" inline />}
        strategy="next_best_product"
      />
      <RecommendationRail title="Bestsellers with suspiciously high empathy" strategy="high_margin_bestsellers" />
      <RecommendationRail title="Recently viewed, because memory is a feature" strategy="recently_viewed" />
      <LifecyclePlaybookSlots />
      <Newsletter />
      <section className="trust-band">
        <div><strong>0</strong><span>real payments</span></div>
        <div><strong>42</strong><span>demo products</span></div>
        <div><strong>21</strong><span>trackable intent signals</span></div>
      </section>
    </>
  );
}

function Newsletter() {
  const { consent } = useAppState();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  return (
    <section className="newsletter">
      <div>
        <h2>{consent.marketing ? "Good news. You consented to being gently bothered." : "Subscribe to measured optimism."}</h2>
        <p>{submitted ? "Subscribed. A demo sign-up signal was recorded for the event trail." : "Occasional fictional product launches, lifecycle nudges, and demo-friendly activation moments."}</p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          trackEvent("newsletter_signup", { email, email_domain: email.split("@")[1] ?? "unknown", marketing_consent: consent.marketing });
          setEmail("");
          setSubmitted(true);
        }}
      >
        <input aria-label="Email address" value={email} onChange={(event) => { setEmail(event.target.value); setSubmitted(false); }} placeholder="email@example.com" type="email" required />
        <button>Subscribe</button>
      </form>
    </section>
  );
}

function ProductsPage({ categorySlug }: { categorySlug?: string }) {
  const category = categories.find((item) => item.slug === categorySlug);
  const items = category ? products.filter((product) => product.category === category.name) : products;
  useEffect(() => {
    trackEvent(category ? "category_view" : "product_list_view", {
      category: category?.name,
      product_count: items.length,
    });
  }, [category?.name, items.length]);

  return (
    <main className="page">
      <div className="page-heading">
        <span className="eyebrow">{category ? "Category" : "All products"}</span>
        <h1>{category?.name ?? "Survival essentials"}</h1>
        <PersonalizationZone zoneId="category_intro_banner" fallback={<p>{category?.description ?? "Browse the full catalog of fictional relief for very real customer journeys."}</p>} />
      </div>
      <ProductGrid items={items} />
    </main>
  );
}

function ProductPage({ slug }: { slug: string }) {
  const { addToCart, viewProduct } = useAppState();
  const product = products.find((item) => item.slug === slug);
  useEffect(() => {
    if (!product) return;
    viewProduct(product.id);
    trackEvent("product_view", productPayload(product));
  }, [product?.id]);

  if (!product) return <NotFound />;
  return (
    <main className="product-detail">
      <ProductVisual product={product} size="large" />
      <section>
        <span className="eyebrow">{product.category}</span>
        <h1>{product.name}</h1>
        <p className="lead">{product.longDescription}</p>
        <div className="price-row large"><strong><Money value={product.price} /></strong>{product.compareAtPrice && <s><Money value={product.compareAtPrice} /></s>}</div>
        <button type="button" className="primary-cta" onClick={() => addToCart(product.id)}>Add to cart</button>
        <dl className="spec-list">
          <div><dt>Stock</dt><dd>{product.stockStatus.replaceAll("_", " ")}</dd></div>
          <div><dt>Tags</dt><dd>{product.tags.join(", ")}</dd></div>
          <div><dt>Demo value</dt><dd>Product affinity, recommendation clicks, cart intent</dd></div>
        </dl>
      </section>
      <RecommendationRail
        title={<PersonalizationZone zoneId="product_detail_cross_sell" fallback="Pairs well with related coping mechanisms" inline />}
        strategy="similar_tags"
        currentProductId={product.id}
      />
    </main>
  );
}

function CartPage() {
  const state = useAppState();
  const { cart, addToCart, removeFromCart, setQuantity } = state;
  const enriched = cart.map((item) => ({ item, product: products.find((product) => product.id === item.productId)! })).filter((row) => row.product);
  const profileCartProducts = (state.profile.cartItemIds ?? [])
    .map((id) => products.find((product) => product.id === id || product.slug === id))
    .filter(Boolean) as Product[];
  const emptyCartPicks = (profileCartProducts.length > 0 ? profileCartProducts : recommendProducts("next_best_product", state, { limit: 3 })).slice(0, 3);
  const emptyCartIds = emptyCartPicks.map((product) => product.id).join(",");
  const total = enriched.reduce((sum, row) => sum + row.product.price * row.item.quantity, 0);

  useEffect(() => trackEvent("cart_view", cartPayload(cart, products)), [cart.map((item) => `${item.productId}:${item.quantity}`).join(",")]);
  useEffect(() => {
    if (enriched.length === 0 && emptyCartPicks.length > 0) {
      trackEvent("recommendation_viewed", {
        strategy: profileCartProducts.length > 0 ? "profile_cart_recovery" : "next_best_product",
        title: "Empty cart recovery picks",
        product_ids: emptyCartPicks.map((product) => product.id),
      });
    }
  }, [enriched.length, emptyCartIds, profileCartProducts.length]);

  return (
    <main className="page two-col cart-page">
      <section className="cart-main">
        <div className="cart-heading">
          <span className="eyebrow">Cart intent</span>
          <h1>{enriched.length > 0 ? "Cart" : "Empty cart, useful signals."}</h1>
        </div>
        <PersonalizationZone zoneId="cart_abandonment_banner" fallback="Your cart has focus. A rare and beautiful thing." className="banner" />
        {enriched.length === 0 ? (
          <section className="cart-empty-panel">
            <div className="cart-empty-copy">
              <span className="empty-mark">ESC</span>
              <h2>{state.profile.hasActiveCart || profileCartProducts.length > 0 ? "Meiro sees cart intent for this profile." : "No local cart yet."}</h2>
              <p>{state.profile.lastAbandonedCartValue ? `Profile API reports an abandoned cart worth EUR ${state.profile.lastAbandonedCartValue}. Restore one of these products to launch the checkout demo.` : "Start with one product to create the cart opener signal, then use checkout to demonstrate abandonment, cross-sell, and purchase events."}</p>
              <div className="cart-signal-grid" aria-label="Cart profile signals">
                <div><span>active cart</span><strong>{state.profile.hasActiveCart ? "yes" : "not yet"}</strong></div>
                <div><span>profile value</span><strong>{state.profile.lastAbandonedCartValue ? <Money value={state.profile.lastAbandonedCartValue} /> : "pending"}</strong></div>
                <div><span>item ids</span><strong>{state.profile.cartItemIds?.length ?? 0}</strong></div>
              </div>
              <div className="actions">
                <Link to="/products" className="primary-cta">Browse survival essentials</Link>
                <Link to="/search" className="secondary-cta">Search by crisis</Link>
              </div>
            </div>
            {emptyCartPicks.length > 0 && (
              <div className="cart-empty-picks" aria-label="Recommended cart starters">
                <span className="eyebrow">{profileCartProducts.length > 0 ? "Profile API cart items" : "Recommended starters"}</span>
                {emptyCartPicks.map((product) => (
                  <article className="cart-pick" key={product.id}>
                    <ProductVisual product={product} size="thumb" />
                    <div>
                      <strong>{product.name}</strong>
                      <span><Money value={product.price} /></span>
                    </div>
                    <button type="button" onClick={() => addToCart(product.id)}>Add</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : enriched.map(({ item, product }) => (
          <div className="cart-row" key={product.id}>
            <ProductVisual product={product} size="thumb" />
            <div>
              <strong>{product.name}</strong>
              <p><Money value={product.price} /></p>
            </div>
            <input aria-label={`Quantity for ${product.name}`} type="number" min="1" value={item.quantity} onChange={(event) => setQuantity(product.id, Number(event.target.value))} />
            <button type="button" className="ghost" onClick={() => removeFromCart(product.id)}>Remove</button>
          </div>
        ))}
      </section>
      <aside className="summary">
        <PersonalizationZone zoneId="cart_discount_banner" fallback="Free simulated shipping at EUR 120." />
        <div className="total"><span>Total</span><strong><Money value={total} /></strong></div>
        {enriched.length > 0 ? <Link to="/checkout" className="primary-cta">Checkout</Link> : <Link to="/products" className="primary-cta">Add products</Link>}
      </aside>
      {enriched.length > 0 && <RecommendationRail title="Cart cross-sells with practical emotional range" strategy="cart_cross_sell" />}
    </main>
  );
}

function CheckoutPage() {
  const state = useAppState();
  const { completeOrder, profile } = state;
  const [step, setStep] = useState(0);
  const [checkoutDetails, setCheckoutDetails] = useState({
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    firstName: profile.firstName ?? "",
    surname: profile.surname ?? "",
    streetAddress: profile.streetAddress ?? "",
    apartmentOrCompany: profile.apartmentOrCompany ?? "",
    city: profile.city ?? "",
    postalCode: profile.postalCode ?? "",
    country: profile.country ?? "",
    shippingSpeed: "standard_simulated_shipping",
    paymentMethod: "demo_card_0000",
  });
  const steps = ["Contact", "Shipping", "Fake payment", "Review"];
  const checkoutPayload = () => ({
    contact: {
      email: checkoutDetails.email,
      phone: checkoutDetails.phone,
      first_name: checkoutDetails.firstName,
      surname: checkoutDetails.surname,
    },
    shipping: {
      street_address: checkoutDetails.streetAddress,
      apartment_or_company: checkoutDetails.apartmentOrCompany,
      city: checkoutDetails.city,
      postal_code: checkoutDetails.postalCode,
      country: checkoutDetails.country,
      shipping_speed: checkoutDetails.shippingSpeed,
    },
    payment: {
      payment_method: checkoutDetails.paymentMethod,
    },
  });
  useEffect(() => {
    setCheckoutDetails((current) => ({
      ...current,
      email: current.email || profile.email || "",
      phone: current.phone || profile.phone || "",
      firstName: current.firstName || profile.firstName || "",
      surname: current.surname || profile.surname || "",
      streetAddress: current.streetAddress || profile.streetAddress || "",
      apartmentOrCompany: current.apartmentOrCompany || profile.apartmentOrCompany || "",
      city: current.city || profile.city || "",
      postalCode: current.postalCode || profile.postalCode || "",
      country: current.country || profile.country || "",
    }));
  }, [profile.email, profile.phone, profile.firstName, profile.surname, profile.streetAddress, profile.apartmentOrCompany, profile.city, profile.postalCode, profile.country]);
  const completeStep = () => {
    const payload = { step: steps[step], ...checkoutPayload(), ...cartPayload(state.cart, products) };
    if (step === 0) trackEvent("checkout_contact_submitted", payload);
    if (step === 1) trackEvent("checkout_shipping_submitted", payload);
    if (step === 2) trackEvent("checkout_payment_submitted", payload);
    trackEvent("checkout_step_completed", payload);
    setStep(step + 1);
  };
  useEffect(() => trackEvent("checkout_started", cartPayload(state.cart, products)), []);
  if (state.cart.length === 0) {
    return (
      <main className="page narrow checkout-empty">
        <EmptyState
          title="Checkout needs a cart first."
          body="This keeps the order-completed payload honest. Add a product, then return to the simulated checkout."
          action={{ label: "Browse products", to: "/products" }}
        />
      </main>
    );
  }

  return (
    <main className="page checkout-page">
      <div className="checkout-heading">
        <span className="eyebrow">Simulated checkout</span>
        <h1>Checkout</h1>
        <PersonalizationZone zoneId="checkout_reassurance_banner" fallback="No real payment will be taken. Your demo budget is safe." className="banner" />
      </div>
      <div className="checkout-layout">
        <section className="checkout-panel">
          <div className="stepper">{steps.map((label, index) => <button type="button" className={index === step ? "active" : ""} onClick={() => setStep(index)} key={label}><span>{index + 1}</span>{label}</button>)}</div>
          <div className="checkout-step-card">
            <h2>{steps[step]}</h2>
            {step === 0 && (
              <div className="checkout-fields">
                <input aria-label="Email" autoComplete="email" onChange={(event) => setCheckoutDetails({ ...checkoutDetails, email: event.target.value })} placeholder="Email" type="email" value={checkoutDetails.email} />
                <input aria-label="Phone" autoComplete="tel" onChange={(event) => setCheckoutDetails({ ...checkoutDetails, phone: event.target.value })} placeholder="Phone" type="tel" value={checkoutDetails.phone} />
                <input aria-label="First name" autoComplete="given-name" onChange={(event) => setCheckoutDetails({ ...checkoutDetails, firstName: event.target.value })} placeholder="First name" value={checkoutDetails.firstName} />
                <input aria-label="Surname" autoComplete="family-name" onChange={(event) => setCheckoutDetails({ ...checkoutDetails, surname: event.target.value })} placeholder="Surname" value={checkoutDetails.surname} />
              </div>
            )}
            {step === 1 && (
              <div className="checkout-fields">
                <input aria-label="Street address" autoComplete="address-line1" className="span-2" onChange={(event) => setCheckoutDetails({ ...checkoutDetails, streetAddress: event.target.value })} placeholder="Street address" value={checkoutDetails.streetAddress} />
                <input aria-label="Apartment or company" autoComplete="address-line2" className="span-2" onChange={(event) => setCheckoutDetails({ ...checkoutDetails, apartmentOrCompany: event.target.value })} placeholder="Apartment, company, or delivery note" value={checkoutDetails.apartmentOrCompany} />
                <input aria-label="City" autoComplete="address-level2" onChange={(event) => setCheckoutDetails({ ...checkoutDetails, city: event.target.value })} placeholder="City" value={checkoutDetails.city} />
                <input aria-label="Postal code" autoComplete="postal-code" onChange={(event) => setCheckoutDetails({ ...checkoutDetails, postalCode: event.target.value })} placeholder="Postal code" value={checkoutDetails.postalCode} />
                <input aria-label="Country" autoComplete="country-name" className="span-2" onChange={(event) => setCheckoutDetails({ ...checkoutDetails, country: event.target.value })} placeholder="Country" value={checkoutDetails.country} />
                <div className="checkout-options span-2">
                  <label><input checked={checkoutDetails.shippingSpeed === "standard_simulated_shipping"} onChange={() => setCheckoutDetails({ ...checkoutDetails, shippingSpeed: "standard_simulated_shipping" })} type="radio" name="shipping-speed" /> Standard simulated shipping</label>
                  <label><input checked={checkoutDetails.shippingSpeed === "express_emotional_handling"} onChange={() => setCheckoutDetails({ ...checkoutDetails, shippingSpeed: "express_emotional_handling" })} type="radio" name="shipping-speed" /> Express emotional handling</label>
                </div>
              </div>
            )}
            {step === 2 && <div className="checkout-options"><label><input checked={checkoutDetails.paymentMethod === "demo_card_0000"} onChange={() => setCheckoutDetails({ ...checkoutDetails, paymentMethod: "demo_card_0000" })} type="radio" name="payment-method" /> Demo card ending in 0000</label><p>No real payment system is connected.</p></div>}
            {step === 3 && <OrderReview />}
            <div className="actions">
              {step > 0 && <button type="button" className="ghost" onClick={() => setStep(step - 1)}>Back</button>}
              {step < steps.length - 1 ? (
                <button type="button" onClick={completeStep}>Continue</button>
              ) : (
                <button type="button" onClick={() => {
                  const orderPayload = cartPayload(state.cart, products);
                  state.updateProfile({
                    email: checkoutDetails.email,
                    phone: checkoutDetails.phone,
                    firstName: checkoutDetails.firstName,
                    surname: checkoutDetails.surname,
                    streetAddress: checkoutDetails.streetAddress,
                    apartmentOrCompany: checkoutDetails.apartmentOrCompany,
                    city: checkoutDetails.city,
                    postalCode: checkoutDetails.postalCode,
                    country: checkoutDetails.country,
                  });
                  const orderId = completeOrder();
                  trackEvent("order_completed", {
                    order_id: orderId,
                    customer_type: profile.customerType,
                    email: checkoutDetails.email,
                    phone: checkoutDetails.phone,
                    ...checkoutPayload(),
                    ...orderPayload,
                    total_value: orderPayload.cart_value,
                    currency: "EUR",
                  });
                  navigate("/thank-you");
                }}>Complete simulated order</button>
              )}
            </div>
          </div>
        </section>
        <CheckoutSummary />
      </div>
    </main>
  );
}

function OrderReview() {
  const { cart } = useAppState();
  return <div className="order-review">{cart.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return product ? <p key={item.productId}><span>Qty {item.quantity}</span><strong>{product.name}</strong></p> : null;
  })}</div>;
}

function CheckoutSummary() {
  const { cart } = useAppState();
  const enriched = cart.map((item) => ({ item, product: products.find((product) => product.id === item.productId) })).filter((entry): entry is { item: typeof cart[number]; product: Product } => Boolean(entry.product));
  const subtotal = enriched.reduce((sum, { item, product }) => sum + item.quantity * product.price, 0);

  return (
    <aside className="checkout-summary" aria-label="Order summary">
      <h2>Order summary</h2>
      <div className="checkout-summary-list">
        {enriched.map(({ item, product }) => (
          <div className="checkout-summary-item" key={product.id}>
            <ProductVisual product={product} size="thumb" />
            <div>
              <strong>{product.name}</strong>
              <span>{item.quantity} x <Money value={product.price} /></span>
            </div>
            <b><Money value={product.price * item.quantity} /></b>
          </div>
        ))}
      </div>
      <div className="checkout-total">
        <span>Total</span>
        <strong><Money value={subtotal} /></strong>
      </div>
      <p>Demo checkout sends order and cart payloads for Meiro event validation.</p>
    </aside>
  );
}

function RegisterPage({ mode = "register" }: { mode?: "register" | "login" }) {
  const { updateProfile, setConsent } = useAppState();
  const [form, setForm] = useState({ email: "", firstName: "", currentLifeSituation: "Too many meetings", preferredCategory: categories[0].name, marketing: false, personalization: true });
  const isLogin = mode === "login";
  return (
    <main className="page register-page">
      <section className="register-hero">
        <span className="eyebrow">{isLogin ? "Identity resolution" : "Profile creation"}</span>
        <h1>{isLogin ? "Recognize a returning customer." : "Create a profile Meiro can stitch."}</h1>
        <p>{isLogin ? "Simulate a known visitor returning with email-based identity and preference context." : "Capture a minimal identity signal, consent state, and category preference for the personalization demo."}</p>
        <div className="register-proof">
          <div><strong>email</strong><span>sent on sign_up/login</span></div>
          <div><strong>consent</strong><span>updates SDK storage rights</span></div>
          <div><strong>affinity</strong><span>shapes the storefront</span></div>
        </div>
      </section>
      <form className="form-card register-form" onSubmit={(event) => {
          event.preventDefault();
          const profile = {
            email: form.email,
            firstName: form.firstName,
            currentLifeSituation: form.currentLifeSituation,
            preferredCategory: form.preferredCategory,
            customerType: "registered" as const,
            lifecycleStage: isLogin ? "known_customer" : "registered",
            categoryAffinity: form.preferredCategory,
            recommendedTags: [form.preferredCategory.toLowerCase()],
          };
          updateProfile(profile);
          setConsent({ necessary: true, analytics: true, personalization: form.personalization, marketing: form.marketing });
          identifyUser(profile);
          trackEvent(isLogin ? "user_logged_in" : "user_registered", { email: form.email, email_domain: form.email.split("@")[1], preferred_category: form.preferredCategory });
          navigate("/account");
        }}>
        <div className="form-section-heading">
          <span className="eyebrow">{isLogin ? "Login signal" : "Sign-up signal"}</span>
          <h2>{isLogin ? "Known profile details" : "Profile details"}</h2>
        </div>
        <label>
          <span>Email</span>
          <input aria-label="Email" required type="email" placeholder="mira@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label>
          <span>First name</span>
          <input aria-label="First name" required placeholder="Mira" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
        </label>
        <label>
          <span>Current life situation</span>
          <select aria-label="Current life situation" value={form.currentLifeSituation} onChange={(event) => setForm({ ...form, currentLifeSituation: event.target.value })}>
            {["Too many meetings", "Parenting chaos", "Trying to sleep", "Marketing burnout", "Generally fine, suspiciously"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Preferred category</span>
          <select aria-label="Preferred category" value={form.preferredCategory} onChange={(event) => setForm({ ...form, preferredCategory: event.target.value })}>
            {categories.map((category) => <option key={category.slug}>{category.name}</option>)}
          </select>
        </label>
        <div className="consent-choice-list" aria-label="Consent choices">
          <label><input type="checkbox" checked={form.marketing} onChange={(event) => setForm({ ...form, marketing: event.target.checked })} /><span><strong>Marketing consent</strong><small>Allow lifecycle nudges and fictional launches.</small></span></label>
          <label><input type="checkbox" checked={form.personalization} onChange={(event) => setForm({ ...form, personalization: event.target.checked })} /><span><strong>Personalization consent</strong><small>Allow profile-aware banners and recommendations.</small></span></label>
        </div>
        <button>{isLogin ? "Simulate login" : "Create demo profile"}</button>
      </form>
    </main>
  );
}

function AccountPage() {
  const state = useAppState();
  const { profile, consent, recentlyViewed } = state;
  const identityLabel = profile.email ?? profile.phone ?? "anonymous device";
  const affinityLabel = profile.categoryAffinity ?? profile.preferredCategory ?? "Still emerging";
  const profileApiSummary =
    state.profileApiStatus.state === "loaded"
      ? `Loaded via ${state.profileApiStatus.identifierType}`
      : state.profileApiStatus.message ?? state.profileApiStatus.state.replaceAll("_", " ");
  return (
    <main className="page two-col account-page">
      <section className="profile-card">
        <span className="eyebrow">Identity profile</span>
        <h1>{profile.firstName ? `${profile.firstName}'s profile` : "Anonymous profile"}</h1>
        <PersonalizationZone zoneId="account_lifecycle_banner" fallback="Local profile enrichment is ready for Meiro identity resolution." className="banner" />
        <div className="account-summary-grid" aria-label="Profile summary">
          <div><span>Identifier</span><strong>{identityLabel}</strong></div>
          <div><span>Lifecycle</span><strong>{profile.lifecycleStage.replaceAll("_", " ")}</strong></div>
          <div><span>Affinity</span><strong>{affinityLabel}</strong></div>
          <div><span>Profile API</span><strong>{profileApiSummary}</strong></div>
        </div>
        <dl className="spec-list">
          <div><dt>Email</dt><dd>{profile.email ?? "Unknown visitor"}</dd></div>
          <div><dt>Phone</dt><dd>{profile.phone ?? "Not known"}</dd></div>
          <div><dt>Lifecycle</dt><dd>{profile.lifecycleStage}</dd></div>
          <div><dt>Affinity</dt><dd>{profile.categoryAffinity ?? profile.preferredCategory ?? "Still emerging"}</dd></div>
          <div><dt>VIP tier</dt><dd>{profile.vipTier ?? "Not assigned"}</dd></div>
          <div><dt>Lifetime value</dt><dd>{profile.lifetimeValue !== undefined ? <Money value={profile.lifetimeValue} /> : "Not calculated"}</dd></div>
          <div><dt>Purchase count</dt><dd>{profile.purchaseCount ?? "Not counted"}</dd></div>
          <div><dt>Reorder date</dt><dd>{formatProfileDate(profile.predictedReorderDate) ?? "Not predicted yet"}</dd></div>
          <div><dt>Last purchase</dt><dd>{profile.lastPurchasedSku ?? profile.lastPurchasedCategory ?? "Not known"}</dd></div>
          <div><dt>Active cart</dt><dd>{profile.hasActiveCart ? "Yes" : profile.lastAbandonedCartValue ? `Abandoned value ${profile.lastAbandonedCartValue}` : "No profile signal"}</dd></div>
          <div><dt>Last viewed</dt><dd>{profile.lastViewedProductId ?? "No product attribute"}</dd></div>
          <div><dt>Delivery</dt><dd>{profile.deliveryStatus ?? "No delivery status"}</dd></div>
          <div><dt>Consents</dt><dd>{Object.entries(consent).filter(([, enabled]) => enabled).map(([key]) => key).join(", ")}</dd></div>
          <div><dt>Marketing consent</dt><dd>{profile.marketingConsent === undefined ? "Not in profile" : profile.marketingConsent ? "Granted" : "Denied"}</dd></div>
          <div><dt>Recommended tags</dt><dd>{profile.recommendedTags.join(", ") || "None yet"}</dd></div>
          <div><dt>Journeys</dt><dd>{profile.journeyMembership?.join(", ") || "No journey membership"}</dd></div>
          <div><dt>Profile API</dt><dd>{profileApiSummary}</dd></div>
        </dl>
      </section>
      <section className="account-behavior">
        <span className="eyebrow">Behavior merge</span>
        <h2>Visible behavior Meiro could merge</h2>
        {recentlyViewed.length === 0 ? (
          <EmptyState
            title="No anonymous behavior yet."
            body="View a few products before registering to show how anonymous activity can become useful profile context."
            action={{ label: "View products", to: "/products" }}
          />
        ) : (
          <ProductGrid items={recentlyViewed.map((id) => products.find((product) => product.id === id)).filter(Boolean) as Product[]} />
        )}
      </section>
      <LifecyclePlaybookSlots compact />
      <section className="profile-api-card">
        <span className="eyebrow">Profile API ready</span>
        <h2>{state.profileApiStatus.state === "loaded" ? "Profile API is hydrating this page." : "Fields this page can consume"}</h2>
        <p>{state.profileApiStatus.state === "loaded" ? "Realtime Meiro attributes are merged into the local profile and reused by banners, slots, and recommendation rails." : "Meiro CDP can populate these values at render time; the storefront only needs the slots and fallbacks."}</p>
        <div className="playbook-fields">
          {[
            ["vip_tier", profile.vipTier],
            ["lifetime_value", profile.lifetimeValue],
            ["purchase_count", profile.purchaseCount],
            ["predicted_reorder_date", formatProfileDate(profile.predictedReorderDate)],
            ["last_purchased_sku", profile.lastPurchasedSku],
            ["days_since_last_purchase", profile.daysSinceLastPurchase],
            ["last_purchased_category", profile.lastPurchasedCategory],
            ["last_viewed_product_id", profile.lastViewedProductId],
            ["has_active_cart", profile.hasActiveCart],
            ["last_abandoned_cart_value", profile.lastAbandonedCartValue],
            ["cart_item_ids", profile.cartItemIds?.join(", ")],
            ["journey_membership", profile.journeyMembership?.join(", ")],
            ["delivery_status", profile.deliveryStatus],
            ["referral_code", profile.referralCode],
            ["has_left_review", profile.hasLeftReview],
          ].map(([field, value]) => <code key={String(field)}>{String(field)}{value !== undefined ? `: ${String(value)}` : ""}</code>)}
        </div>
      </section>
    </main>
  );
}

function SearchPage() {
  const state = useAppState();
  const [query, setQuery] = useState(new URLSearchParams(window.location.search).get("q") ?? "");
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return products.filter((product) => [product.name, product.category, product.shortDescription, ...product.tags].join(" ").toLowerCase().includes(q));
  }, [query]);
  const lastViewedItems = recommendProducts("recently_viewed", state, { limit: 4 });
  const lastViewedIds = lastViewedItems.map((product) => product.id).join(",");
  const lastViewedProduct = products.find((product) => product.id === state.profile.lastViewedProductId || product.slug === state.profile.lastViewedProductId) ?? products.find((product) => product.id === state.recentlyViewed[0]);
  const affinityLabel = state.profile.categoryAffinity ?? state.profile.preferredCategory ?? state.profile.lastPurchasedCategory ?? state.profile.recommendedTags[0] ?? "profile signals";
  useEffect(() => {
    if (lastViewedItems.length > 0) {
      trackEvent("recommendation_viewed", { strategy: "recently_viewed", title: "Last viewed products", product_ids: lastViewedItems.map((item) => item.id) });
    }
  }, [lastViewedIds]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    trackEvent("search_submitted", { search_query: query, result_count: results.length });
  };
  return (
    <main className="page search-page">
      <section className="search-hero">
        <div>
          <span className="eyebrow">Intent capture</span>
          <h1>Search supplies for the current crisis.</h1>
          <p>Search terms become Meiro intent signals while recently viewed and recommended products stay close enough to act on.</p>
        </div>
        <div className="search-context-panel" aria-label="Personalized search context">
          <div>
            <span>Last viewed</span>
            <strong>{lastViewedProduct?.name ?? "Waiting for product view"}</strong>
          </div>
          <div>
            <span>Recommendation basis</span>
            <strong>{affinityLabel}</strong>
          </div>
        </div>
      </section>

      <section className="search-workbench">
        <div className="search-card">
          <form className="search" onSubmit={submit}>
            <input aria-label="Search products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="meeting, sleep, please help" />
            <button>Search</button>
          </form>
          <div className="chips search-chips">{["meeting", "sleep", "parenting", "marketing", "Monday", "overthinking", "please help"].map((term) => <button type="button" onClick={() => setQuery(term)} key={term}>{term}</button>)}</div>
        </div>
        <p className="search-result-count">{query ? `${results.length} result${results.length === 1 ? "" : "s"} for "${query}"` : "Try a popular fake search or use the personalized rails below."}</p>
      </section>

      <section className="search-results" onClickCapture={(event) => {
          const id = (event.target as HTMLElement).closest("[data-product-id]")?.getAttribute("data-product-id");
          if (id) trackEvent("search_result_clicked", { search_query: query, product_id: id });
        }}>
        {query && results.length === 0 ? (
          <EmptyState
            title="No supplies match that particular crisis."
            body="Try meeting, sleep, parenting, marketing, Monday, overthinking, or please help."
          />
        ) : query ? (
          <div className="product-grid">{results.map((product) => <div data-product-id={product.id} key={product.id}><ProductCard product={product} /></div>)}</div>
        ) : null}
      </section>

      <section className="rail search-personalized-rail">
        <div className="section-heading">
          <h2>Last viewed products</h2>
        </div>
        {lastViewedItems.length > 0 ? (
          <div className="rail-grid">
            {lastViewedItems.map((product) => <ProductCard key={product.id} product={product} source="recently_viewed" />)}
          </div>
        ) : (
          <div className="search-empty-rail">
            <strong>No viewed product yet</strong>
            <p>Open any product detail or expose <code>last_viewed_product_id</code> through the Profile API to fill this rail.</p>
          </div>
        )}
      </section>
      <RecommendationRail title={`Recommended from ${affinityLabel}`} strategy="next_best_product" limit={4} />
    </main>
  );
}

function PresenterChecklist() {
  const state = useAppState();
  const checks = [
    { label: "Anonymous browsing", done: state.recentlyViewed.length > 0 },
    { label: "Cart intent", done: state.cart.length > 0 },
    { label: "Identity resolution", done: state.profile.customerType === "registered" },
    { label: "Profile API hydration", done: state.profileApiStatus.state === "loaded" },
    { label: "Consent controls", done: Boolean(state.recentEvents.find((event) => event.event_name === "consent_updated")) },
    { label: "Personalization variant", done: state.personaId !== "anonymous_new" },
    { label: "Post-purchase lifecycle", done: state.profile.lifecycleStage === "post_purchase" },
  ];

  return (
    <section className="control-card">
      <h2>Presenter checklist</h2>
      <div className="checklist">
        {checks.map((check) => (
          <div className={check.done ? "done" : ""} key={check.label}>
            <span>{check.done ? "Done" : "Ready"}</span>
            <strong>{check.label}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatProfileValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "waiting";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "empty";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return String(value);
  return String(formatMaybeProfileDate(value));
}

function profileAttributeRows(state: ReturnType<typeof useAppState>): ProfileAttributeRow[] {
  const profile = state.profile;
  return [
    { category: "configured", label: "VIP", field: "vip_tier", value: profile.vipTier, surface: "top banner, account, lifecycle slot" },
    { category: "configured", label: "LTV", field: "lifetime_value", value: profile.lifetimeValue, surface: "account banner, VIP slot" },
    { category: "configured", label: "Orders", field: "purchase_count", value: profile.purchaseCount, surface: "account banner, VIP slot" },
    { category: "configured", label: "Reorder", field: "predicted_reorder_date", value: formatProfileDate(profile.predictedReorderDate), surface: "top banner, replenishment slot" },
    { category: "configured", label: "Last SKU", field: "last_purchased_sku", value: profile.lastPurchasedSku, surface: "reorder product, review/referral product" },
    { category: "configured", label: "Last category", field: "last_purchased_category", value: profile.lastPurchasedCategory, surface: "win-back, thank-you, recommendation context" },
    { category: "configured", label: "Days since", field: "days_since_last_purchase", value: profile.daysSinceLastPurchase, surface: "win-back slot" },
    { category: "configured", label: "Last viewed", field: "last_viewed_product_id", value: profile.lastViewedProductId, surface: "recently viewed rail" },
    { category: "configured", label: "Active cart", field: "has_active_cart", value: profile.hasActiveCart, surface: "hero and cart recovery" },
    { category: "configured", label: "Abandoned value", field: "last_abandoned_cart_value", value: profile.lastAbandonedCartValue, surface: "cart recovery message" },
    { category: "configured", label: "Cart items", field: "cart_item_ids", value: profile.cartItemIds, surface: "cart recovery, cross-sell" },
    { category: "configured", label: "Journeys", field: "journey_membership", value: profile.journeyMembership, surface: "win-back and lifecycle labels" },
    { category: "optional", label: "Next products", field: "next_best_product_ids", value: profile.nextBestProductIds, surface: "homepage recommendation rail" },
    { category: "optional", label: "Next action", field: "next_best_action", value: profile.nextBestAction, surface: "hero, thank-you banner" },
    { category: "post_delivery", label: "Delivery", field: "delivery_status", value: profile.deliveryStatus, surface: "review/referral page" },
    { category: "post_delivery", label: "Referral", field: "referral_code", value: profile.referralCode, surface: "review/referral card" },
    { category: "post_delivery", label: "Review", field: "has_left_review", value: profile.hasLeftReview, surface: "review/referral form state" },
  ];
}

function ProfileApiInspector() {
  const state = useAppState();
  const attributeCount = Object.keys(state.profile.profileApiAttributes ?? {}).length;
  const rows = profileAttributeRows(state);
  const configuredMissingRows = rows.filter((row) => row.category === "configured" && !hasProfileValue(row.value));
  const optionalMissingRows = rows.filter((row) => row.category === "optional" && !hasProfileValue(row.value));
  const postDeliveryMissingRows = rows.filter((row) => row.category === "post_delivery" && !hasProfileValue(row.value));
  const loadedLabel =
    state.profileApiStatus.state === "loaded"
      ? `${attributeCount} attributes loaded`
      : state.profileApiStatus.message ?? state.profileApiStatus.state.replaceAll("_", " ");
  const identifier =
    state.profileApiStatus.identifierType && state.profileApiStatus.identifierValue
      ? `${state.profileApiStatus.identifierType}: ${state.profileApiStatus.identifierValue}`
      : "waiting for identifier";

  return (
    <section className="control-card profile-inspector">
      <h2>Profile API proof</h2>
      <dl className="status-list compact">
        <div><dt>Status</dt><dd>{loadedLabel}</dd></div>
        <div><dt>Identifier</dt><dd>{identifier}</dd></div>
        <div><dt>Updated</dt><dd>{state.profileApiStatus.updatedAt ? new Date(state.profileApiStatus.updatedAt).toLocaleTimeString() : "not yet"}</dd></div>
      </dl>
      <div className="attribute-grid">
        {rows.map((row) => (
          <div className={hasProfileValue(row.value) ? "attribute-row" : "attribute-row empty"} key={row.field}>
            <span>{row.label}</span>
            <strong>{formatProfileValue(row.value)}</strong>
            <code>{row.field}</code>
            <small>{row.surface}</small>
          </div>
        ))}
      </div>
      <div className="missing-attributes">
        <strong>{state.profileApiStatus.state === "loaded" ? "Configured attributes still missing values" : "Configured Profile API values to check"}</strong>
        <p className="muted">{configuredMissingRows.length === 0 ? "All configured real-time attributes used by visible storefront surfaces have values." : "These configured attributes are still empty in the current Profile API response."}</p>
        {configuredMissingRows.length > 0 && (
          <div className="playbook-fields">
            {configuredMissingRows.map((row) => <code className="missing" key={row.field}>{row.field}</code>)}
          </div>
        )}
        {(optionalMissingRows.length > 0 || postDeliveryMissingRows.length > 0) && (
          <details className="optional-attributes">
            <summary>Optional placeholders not expected from current setup</summary>
            {optionalMissingRows.length > 0 && (
              <>
                <p className="muted">Recommendation/content placeholders:</p>
                <div className="playbook-fields">
                  {optionalMissingRows.map((row) => <code className="missing" key={row.field}>{row.field}</code>)}
                </div>
              </>
            )}
            {postDeliveryMissingRows.length > 0 && (
              <>
                <p className="muted">Post-delivery placeholders need OMS/review/referral source fields:</p>
                <div className="playbook-fields">
                  {postDeliveryMissingRows.map((row) => <code className="missing" key={row.field}>{row.field}</code>)}
                </div>
              </>
            )}
          </details>
        )}
      </div>
    </section>
  );
}

function ProfileApiScenarioControls() {
  const state = useAppState();
  return (
    <section className="control-card profile-scenarios">
      <h2>Seed Profile API scenario</h2>
      <p className="muted">Load deterministic attributes to QA profile-powered surfaces without waiting for live CDP data.</p>
      <div className="scenario-buttons">
        {profileApiScenarios.map((scenario) => (
          <button type="button" className={state.personaId === `profile_api:${scenario.id}` ? "active" : ""} key={scenario.id} onClick={() => state.applyProfileApiScenario(scenario)}>
            <strong>{scenario.name}</strong>
            <span>{scenario.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MeiroStatusCard() {
  const status = getMeiroConfigStatus();
  const profileApiStatus = getMeiroProfileApiStatus();
  const rows = [
    ["Mode", status.mode],
    ["SDK enabled", status.sdkEnabled ? "yes" : "no"],
    ["Endpoint", status.hasEndpoint ? "ready" : "missing"],
    ["Script", status.hasScriptUrl ? "ready" : "missing"],
    ["Debug", status.debug ? "on" : "off"],
    ["Profile API", profileApiStatus.enabled ? "proxy ready" : "disabled"],
  ];

  return (
    <section className="control-card">
      <span className="eyebrow">Integration</span>
      <h2>Meiro status</h2>
      <dl className="status-list">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="muted"><strong>Endpoint:</strong> {status.endpoint}</p>
      <p className="muted"><strong>Script:</strong> {status.scriptUrl}</p>
      <p className="muted"><strong>Profile API:</strong> {profileApiStatus.endpoint}</p>
      <p className="muted">Mock mode logs locally. Real SDK wiring should stay inside the Meiro integration layer.</p>
    </section>
  );
}

function DemoSignalStrip() {
  const state = useAppState();
  const sdkCall = state.meiroSdkCalls[0];
  const event = state.recentEvents[0];
  const profileStatus = state.profileApiStatus.state === "loaded" ? "Profile loaded" : state.profileApiStatus.state.replaceAll("_", " ");
  const consentCount = (["analytics", "personalization", "marketing"] as const).filter((key) => state.consent[key]).length;

  return (
    <div className="demo-signal-strip" aria-label="Demo status">
      <div>
        <span>Profile API</span>
        <strong>{profileStatus}</strong>
      </div>
      <div>
        <span>Consent</span>
        <strong>{consentCount}/3 active</strong>
      </div>
      <div>
        <span>Latest SDK call</span>
        <strong>{sdkCall ? `${sdkCall.command}: ${sdkCall.label}` : "waiting"}</strong>
      </div>
      <div>
        <span>Latest event</span>
        <strong>{event?.event_name ?? "waiting"}</strong>
      </div>
    </div>
  );
}

function DemoControlPage() {
  const state = useAppState();
  const completedSignals = [
    state.recentlyViewed.length > 0,
    state.cart.length > 0,
    state.profile.customerType === "registered",
    state.profileApiStatus.state === "loaded",
    state.personaId !== "anonymous_new",
  ].filter(Boolean).length;
  return (
    <main className="page two-col demo-control-page">
      <section>
        <div className="demo-hero">
          <div>
            <span className="eyebrow">Presenter command center</span>
            <h1>Demo control</h1>
            <p className="lead">Switch profile scenarios, verify consent, and inspect the exact storefront signals being sent to Meiro.</p>
          </div>
          <div className="demo-progress-card">
            <span>Demo readiness</span>
            <strong>{completedSignals}/5</strong>
            <p>core signals active</p>
          </div>
          <div className="actions">
            <Link to="/playbooks" className="primary-cta">Open playbooks</Link>
            <Link to="/account" className="secondary-action">View hydrated account</Link>
          </div>
        </div>
        <DemoSignalStrip />
        <div className="demo-section-heading">
          <div>
            <span className="eyebrow">Local personas</span>
            <h2>Presenter shortcuts</h2>
          </div>
          <p className="muted">Use these to demonstrate journeys before or alongside live Profile API data.</p>
        </div>
        <div className="persona-grid">
          {personas.map((persona) => (
            <button type="button" className={state.personaId === persona.id ? "active persona" : "persona"} key={persona.id} onClick={() => state.setPersona(persona.id)}>
              <strong>{persona.name}</strong>
              <span>{persona.description}</span>
            </button>
          ))}
        </div>
      </section>
      <aside className="demo-side">
        <MeiroStatusCard />
        <ProfileApiInspector />
        <ProfileApiScenarioControls />
        <PresenterChecklist />
        <section className="control-card">
          <h2>Use case coverage</h2>
          <p className="muted">Eight ecommerce playbooks have a visible web surface ready for Meiro journeys, catalog feeds, or Profile API attributes.</p>
          <Link to="/playbooks" className="signal-link">Open playbooks</Link>
        </section>
        <section className="control-card">
          <h2>Consent state</h2>
          {(["analytics", "personalization", "marketing"] as const).map((key) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={state.consent[key]}
                onChange={(event) => state.setConsent({ ...state.consent, [key]: event.target.checked, necessary: true })}
              />
              {key}
            </label>
          ))}
          <button type="button" className="ghost" onClick={state.clearDebugHistory}>Clear event history</button>
        </section>
        <DebugPanel inline />
      </aside>
    </main>
  );
}

function ThankYouPage() {
  const state = useAppState();
  const orderId = state.lastOrderId ?? "ESC-DEMO";
  const firstName = state.profile.firstName;
  const nextAction = state.profile.nextBestAction ?? "review_or_refer";
  const reorderDate = formatProfileDate(state.profile.predictedReorderDate);

  return (
    <main className="page thank-you-page">
      <section className="thank-you-hero">
        <div>
          <span className="eyebrow">Order signal received</span>
          <h1>{firstName ? `Thank you, ${firstName}.` : "Thank you."} The order is simulated, the signals are not.</h1>
          <PersonalizationZone zoneId="thank_you_next_best_action" fallback="Recommended next step: review account profile enrichment." className="banner" />
          <div className="actions">
            <Link to="/review" className="primary-cta">Review or refer</Link>
            <Link to="/account" className="secondary-action">View profile</Link>
          </div>
        </div>
        <aside className="receipt-card" aria-label="Simulated order receipt">
          <span className="eyebrow">Demo receipt</span>
          <dl>
            <div><dt>Order</dt><dd>{orderId}</dd></div>
            <div><dt>Event</dt><dd>purchase</dd></div>
            <div><dt>Profile key</dt><dd>{state.profile.email ?? state.profile.phone ?? "anonymous device"}</dd></div>
            <div><dt>Next action</dt><dd>{nextAction.replaceAll("_", " ")}</dd></div>
          </dl>
        </aside>
      </section>
      <section className="post-purchase-strip" aria-label="Post-purchase personalization signals">
        <div>
          <span>Profile enriched</span>
          <strong>{state.profile.purchaseCount !== undefined ? `${state.profile.purchaseCount} orders` : "purchase count ready"}</strong>
        </div>
        <div>
          <span>Reorder timing</span>
          <strong>{reorderDate ?? "waiting for prediction"}</strong>
        </div>
        <div>
          <span>Lifecycle</span>
          <strong>{state.profile.lifecycleStage.replaceAll("_", " ")}</strong>
        </div>
      </section>
      <LifecyclePlaybookSlots compact />
    </main>
  );
}

function PlaybooksPage() {
  return (
    <main className="page">
      <div className="page-heading">
        <span className="eyebrow">Meiro ecommerce use cases</span>
        <h1>Eight playbooks, eight web surfaces.</h1>
        <p>The CDP can handle audiences, catalog feeds, journey logic, and Profile API attributes. This storefront now provides the visible places where those decisions can appear.</p>
      </div>
      <section className="playbook-grid">
        {ecommercePlaybooks.map((playbook) => <PlaybookSummaryCard key={playbook.id} playbook={playbook} />)}
      </section>
      <section className="profile-api-card">
        <span className="eyebrow">Integration stance</span>
        <h2>Profile API can hydrate the page without changing the demo flow.</h2>
        <p>Use Profile API responses to fill tier, reorder timing, lapsed status, delivery state, and review/referral eligibility. The current local personas are only presenter shortcuts.</p>
      </section>
    </main>
  );
}

function ReviewReferralPage() {
  const state = useAppState();
  const reviewedProduct =
    products.find((product) => product.id === state.profile.lastPurchasedSku || product.slug === state.profile.lastPurchasedSku) ??
    products.find((product) => state.profile.purchases.includes(product.id)) ??
    products.find((product) => product.id === "monday-survival-kit") ??
    products[0];
  const [submitted, setSubmitted] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const reviewLocked = Boolean(state.profile.hasLeftReview);
  const referralCode = state.profile.referralCode ?? "ESC-FINE-20";
  const deliveryStatus = state.profile.deliveryStatus ?? "awaiting delivery signal";
  const reviewStatus = reviewLocked ? "review received" : submitted ? "review captured" : "ready";
  const reviewTextLength = reviewText.trim().length;

  return (
    <main className="page two-col review-page">
      <section className="review-main">
        <div className="page-heading compact">
          <span className="eyebrow">Post-purchase review and referral</span>
          <h1>How did the supplies land?</h1>
          <p>A focused surface for delivered-order journeys, repeat-buyer splits, and referral-code personalization.</p>
        </div>
        <div className="review-product-strip">
          <ProductVisual product={reviewedProduct} size="thumb" />
          <div>
            <span className="eyebrow">Product context</span>
            <strong>{reviewedProduct.name}</strong>
            <p>{reviewedProduct.category}</p>
          </div>
          <div className="review-status">
            <span>{deliveryStatus}</span>
            <strong>{reviewStatus}</strong>
          </div>
        </div>
        <form className={submitted ? "form-card review-form submitted" : "form-card review-form"} onSubmit={(event) => {
          event.preventDefault();
          trackEvent("review_submitted", {
            form_id: "post_purchase_review",
            product_id: reviewedProduct.id,
            product_name: reviewedProduct.name,
            product_category: reviewedProduct.category,
            last_purchased_sku: state.profile.lastPurchasedSku,
            last_purchased_category: state.profile.lastPurchasedCategory,
            delivery_status: state.profile.deliveryStatus,
            repeat_buyer: state.profile.repeatBuyer,
            referral_code: referralCode,
            review_text_length: reviewTextLength,
          });
          setSubmitted(true);
        }}>
          <label>
            Product
            <input aria-label="Reviewed product" value={reviewedProduct.name} readOnly />
          </label>
          <label className="review-text-field">
            <span>Review</span>
            <textarea
              aria-label="Review text"
              disabled={reviewLocked || submitted}
              maxLength={420}
              name="review_text"
              onChange={(event) => setReviewText(event.target.value)}
              placeholder="Surprisingly useful. Mildly concerning."
              required
              rows={5}
              value={reviewText}
            />
            <span className="review-field-meta">
              <small>The event sends product context and text length, not the review body.</small>
              <b>{reviewTextLength}/420</b>
            </span>
          </label>
          <button disabled={reviewLocked}>{reviewLocked ? "Review already received" : submitted ? "Review noted" : "Submit simulated review"}</button>
        </form>
      </section>
      <aside className="summary review-summary">
        <span className="eyebrow">Referral slot</span>
        <h2>{state.profile.repeatBuyer ? "Repeat buyer perk" : "Referral ready"}</h2>
        <p>{state.profile.repeatBuyer ? "Repeat buyer profile detected. " : ""}Referral copy and code can come from Meiro once the post-delivery signal is available.</p>
        <div className="referral-card">
          <span>Referral code</span>
          <div className="referral-code">{referralCode}</div>
        </div>
        <div className="playbook-fields">
          <code>delivery_status{state.profile.deliveryStatus ? `: ${state.profile.deliveryStatus}` : ""}</code>
          <code>repeat_buyer{state.profile.repeatBuyer !== undefined ? `: ${String(state.profile.repeatBuyer)}` : ""}</code>
          <code>has_left_review{state.profile.hasLeftReview !== undefined ? `: ${String(state.profile.hasLeftReview)}` : ""}</code>
          <code>review_submitted</code>
        </div>
      </aside>
    </main>
  );
}

function ConsentBanner() {
  const { consent, setConsent } = useAppState();
  const [open, setOpen] = useState(!localStorage.getItem("esc_consent_seen"));
  const [draft, setDraft] = useState<ConsentState>(consent);
  const [customizing, setCustomizing] = useState(false);
  useEffect(() => {
    document.body.classList.toggle("consent-visible", open);
    return () => document.body.classList.remove("consent-visible");
  }, [open]);

  const finish = (next: ConsentState) => {
    localStorage.setItem("esc_consent_seen", "true");
    setConsent(next);
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div className={customizing ? "consent expanded" : "consent"}>
      <div>
        <strong>Consent preferences</strong>
        <p>Necessary is always on. Other choices control analytics, personalization, and marketing simulation.</p>
      </div>
      {customizing && (
        <div className="consent-options">
          {(["analytics", "personalization", "marketing"] as const).map((key) => (
            <label key={key}>
              <input type="checkbox" checked={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.checked })} />
              <span>{key}</span>
            </label>
          ))}
        </div>
      )}
      <div className="consent-actions">
        {customizing ? (
          <>
            <button type="button" className="ghost" onClick={() => setCustomizing(false)}>Back</button>
            <button type="button" onClick={() => finish({ ...draft, necessary: true })}>Save choices</button>
          </>
        ) : (
          <>
            <button type="button" className="ghost" onClick={() => finish({ necessary: true, analytics: false, personalization: false, marketing: false })}>Essential only</button>
            <button type="button" className="ghost" onClick={() => setCustomizing(true)}>Customize</button>
            <button type="button" onClick={() => finish({ necessary: true, analytics: true, personalization: true, marketing: true })}>Accept all</button>
          </>
        )}
      </div>
    </div>
  );
}

function DebugPanel({ inline = false }: { inline?: boolean }) {
  const state = useAppState();
  const [open, setOpen] = useState(false);
  const personaLabel = state.personaId.startsWith("profile_api:")
    ? `Profile API scenario: ${profileApiScenarios.find((scenario) => `profile_api:${scenario.id}` === state.personaId)?.name ?? state.personaId.replace("profile_api:", "")}`
    : personas.find((persona) => persona.id === state.personaId)?.name;
  const panel = (
    <aside className={inline ? "debug inline" : "debug"}>
      <h2>Demo event log</h2>
      <p><strong>Persona:</strong> {personaLabel}</p>
      <p><strong>Cart:</strong> {state.cart.length} lines</p>
      <p><strong>Viewed:</strong> {state.recentlyViewed.join(", ") || "none"}</p>
      <section className="decision-log">
        <h3>MPT SDK calls sent</h3>
        {state.meiroSdkCalls.length === 0 ? (
          <p className="muted">No SDK calls recorded yet. Browse, search, add to cart, or update consent to send the first signal.</p>
        ) : (
          state.meiroSdkCalls.slice(0, 8).map((call, index) => (
            <div className="sdk-call" key={`${call.timestamp}-${call.command}-${call.label}-${index}`}>
              <strong>{call.command}</strong>
              <span>{call.label}</span>
              <p>{new Date(call.timestamp).toLocaleTimeString()}</p>
            </div>
          ))
        )}
      </section>
      <section className="decision-log">
        <h3>Personalization decisions</h3>
        {state.personalizationDecisions.length === 0 ? (
          <p className="muted">No zones have rendered yet.</p>
        ) : (
          state.personalizationDecisions.map((decision) => (
            <div className={decision.decision} key={`${decision.zoneId}-${decision.ruleId}`}>
              <strong>{decision.zoneId}</strong>
              <span>{decision.decision}</span>
              <code>{decision.ruleId}</code>
              <p>{decision.reason}</p>
            </div>
          ))
        )}
      </section>
      <pre>{JSON.stringify({ consent: state.consent, profile: state.profile }, null, 2)}</pre>
      {state.recentEvents.length === 0 ? (
        <p className="muted">No tracked events in the local buffer yet. Browse, search, add to cart, or update consent to generate one.</p>
      ) : (
        <div className="event-list">
          {state.recentEvents.map((event, index) => (
            <details key={`${event.timestamp}-${index}`}>
              <summary><code>{event.event_name}</code><span>{new Date(event.timestamp).toLocaleTimeString()}</span></summary>
              <pre>{JSON.stringify(event, null, 2)}</pre>
            </details>
          ))}
        </div>
      )}
    </aside>
  );
  if (inline) return panel;
  return (
    <>
      <button type="button" className="debug-toggle" onClick={() => setOpen(!open)}>{open ? "Close log" : "Event log"}</button>
      {open && panel}
    </>
  );
}

function NotFound() {
  return <main className="page narrow"><h1>Page not found</h1><Link to="/" className="primary-cta">Go home</Link></main>;
}

function Router() {
  const path = usePath();
  useEffect(() => trackPageView({ path }), [path]);

  const [pathname] = path.split("?");
  if (pathname === "/") return <HomePage />;
  if (pathname === "/products") return <ProductsPage />;
  if (pathname.startsWith("/category/")) return <ProductsPage categorySlug={pathname.replace("/category/", "")} />;
  if (pathname.startsWith("/product/")) return <ProductPage slug={pathname.replace("/product/", "")} />;
  if (pathname === "/cart") return <CartPage />;
  if (pathname === "/checkout") return <CheckoutPage />;
  if (pathname === "/register") return <RegisterPage />;
  if (pathname === "/login") return <RegisterPage mode="login" />;
  if (pathname === "/account") return <AccountPage />;
  if (pathname === "/search") return <SearchPage />;
  if (pathname === "/playbooks") return <PlaybooksPage />;
  if (pathname === "/demo-control") return <DemoControlPage />;
  if (pathname === "/review") return <ReviewReferralPage />;
  if (pathname === "/thank-you") return <ThankYouPage />;
  return <NotFound />;
}

export function App() {
  return (
    <AppStateProvider>
      <Header />
      <ConsentBanner />
      <Router />
      <Footer />
      {(import.meta.env.DEV || import.meta.env.VITE_DEMO_DEBUG_ENABLED === "true") && <DebugPanel />}
    </AppStateProvider>
  );
}
