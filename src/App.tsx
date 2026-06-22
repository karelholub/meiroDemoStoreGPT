import { useEffect, useMemo, useState } from "react";
import { categories } from "./data/categories";
import { personas } from "./data/personas";
import { products } from "./data/products";
import { getMeiroConfigStatus } from "./integrations/meiro/meiroConfig";
import { identifyUser, trackEvent, trackPageView } from "./integrations/meiro/meiroClient";
import { cartPayload, productPayload } from "./integrations/meiro/meiroEvents";
import { getPersonalizationDecision } from "./integrations/meiro/meiroPersonalization";
import { AppStateProvider, useAppState } from "./store/appState";
import type { ConsentState, PersonalizationZoneId, Product, RecommendationStrategy } from "./types";
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
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <header className="site-header">
      <Link to="/" className="brand"><BrandLogo /></Link>
      <nav>
        <Link to="/products">Shop</Link>
        <Link to="/search">Search</Link>
        <Link to="/account">Account</Link>
        <Link to="/demo-control">Demo</Link>
        <Link to="/cart" className="cart-link">Cart {count > 0 && <span>{count}</span>}</Link>
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

function formatSignalName(name: string) {
  return name.replaceAll("_", " ");
}

function SignalStrip() {
  const state = useAppState();
  const lastEvent = state.recentEvents[0];
  const lastSdkCall = state.meiroSdkCalls[0];
  const consentSummary = `Analytics ${state.consent.analytics ? "on" : "off"} / Personalization ${state.consent.personalization ? "on" : "off"}`;

  return (
    <section className="signal-strip" aria-label="Live tracking summary">
      <div className="signal-primary">
        <span className="eyebrow">Live demo signal</span>
        <strong>{lastEvent ? `Last event: ${formatSignalName(lastEvent.event_name)}` : "Browse to generate the first event"}</strong>
      </div>
      <div className="signal-meta">
        <span>{consentSummary}</span>
        <span>{lastSdkCall ? `MPT ${lastSdkCall.command}: ${lastSdkCall.label}` : "MPT SDK waiting"}</span>
      </div>
      <Link to="/demo-control" className="signal-link">Inspect signals</Link>
    </section>
  );
}

function HomePage() {
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
          <p>Elegant demo commerce for identity resolution, product affinity, cart intent, and consent-aware personalization.</p>
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
      </section>
      <SignalStrip />
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
          trackEvent("newsletter_signup", { email_domain: email.split("@")[1] ?? "unknown", marketing_consent: consent.marketing });
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
  const { cart, removeFromCart, setQuantity } = state;
  const enriched = cart.map((item) => ({ item, product: products.find((product) => product.id === item.productId)! })).filter((row) => row.product);
  const total = enriched.reduce((sum, row) => sum + row.product.price * row.item.quantity, 0);

  useEffect(() => trackEvent("cart_view", cartPayload(cart, products)), [cart.map((item) => `${item.productId}:${item.quantity}`).join(",")]);

  return (
    <main className="page two-col">
      <section>
        <h1>Cart</h1>
        <PersonalizationZone zoneId="cart_abandonment_banner" fallback="Your cart has focus. A rare and beautiful thing." className="banner" />
        {enriched.length === 0 ? (
          <EmptyState
            title="Your cart is peacefully empty."
            body="A rare state. Add something mildly useful to demonstrate cart intent, cart opener logic, and abandonment messaging."
            action={{ label: "Browse survival essentials", to: "/products" }}
          />
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
  const steps = ["Contact", "Shipping", "Fake payment", "Review"];
  useEffect(() => trackEvent("checkout_started", cartPayload(state.cart, products)), []);
  if (state.cart.length === 0) {
    return (
      <main className="page narrow">
        <EmptyState
          title="Checkout needs a cart first."
          body="This keeps the order-completed payload honest. Add a product, then return to the simulated checkout."
          action={{ label: "Add demo products", to: "/products" }}
        />
      </main>
    );
  }

  return (
    <main className="page checkout">
      <h1>Checkout</h1>
      <PersonalizationZone zoneId="checkout_reassurance_banner" fallback="No real payment will be taken. Your demo budget is safe." className="banner" />
      <div className="stepper">{steps.map((label, index) => <button type="button" className={index === step ? "active" : ""} onClick={() => setStep(index)} key={label}>{label}</button>)}</div>
      <section className="checkout-panel">
        <h2>{steps[step]}</h2>
        {step === 0 && <><input aria-label="Email" defaultValue={profile.email ?? ""} placeholder="Email" /><input aria-label="First name" defaultValue={profile.firstName ?? ""} placeholder="First name" /></>}
        {step === 1 && <><label><input type="radio" name="shipping-speed" defaultChecked /> Standard simulated shipping</label><label><input type="radio" name="shipping-speed" /> Express emotional handling</label></>}
        {step === 2 && <><label><input type="radio" name="payment-method" defaultChecked /> Demo card ending in 0000</label><p>No real payment system is connected.</p></>}
        {step === 3 && <OrderReview />}
        <div className="actions">
          {step > 0 && <button type="button" className="ghost" onClick={() => setStep(step - 1)}>Back</button>}
          {step < steps.length - 1 ? (
            <button type="button" onClick={() => { trackEvent("checkout_step_completed", { step: steps[step] }); setStep(step + 1); }}>Continue</button>
          ) : (
            <button type="button" onClick={() => {
              const orderPayload = cartPayload(state.cart, products);
              const orderId = completeOrder();
              trackEvent("order_completed", { order_id: orderId, customer_type: profile.customerType, ...orderPayload, total_value: orderPayload.cart_value, currency: "EUR" });
              navigate("/thank-you");
            }}>Complete simulated order</button>
          )}
        </div>
      </section>
    </main>
  );
}

function OrderReview() {
  const { cart } = useAppState();
  return <div>{cart.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return product ? <p key={item.productId}>{item.quantity} x {product.name}</p> : null;
  })}</div>;
}

function RegisterPage({ mode = "register" }: { mode?: "register" | "login" }) {
  const { updateProfile, setConsent } = useAppState();
  const [form, setForm] = useState({ email: "", firstName: "", currentLifeSituation: "Too many meetings", preferredCategory: categories[0].name, marketing: false, personalization: true });
  return (
    <main className="page narrow">
      <h1>{mode === "login" ? "Login simulation" : "Registration simulation"}</h1>
      <form className="form-card" onSubmit={(event) => {
        event.preventDefault();
        const profile = {
          email: form.email,
          firstName: form.firstName,
          currentLifeSituation: form.currentLifeSituation,
          preferredCategory: form.preferredCategory,
          customerType: "registered" as const,
          lifecycleStage: mode === "login" ? "known_customer" : "registered",
          categoryAffinity: form.preferredCategory,
          recommendedTags: [form.preferredCategory.toLowerCase()],
        };
        updateProfile(profile);
        setConsent({ necessary: true, analytics: true, personalization: form.personalization, marketing: form.marketing });
        identifyUser(profile);
        trackEvent(mode === "login" ? "user_logged_in" : "user_registered", { email_domain: form.email.split("@")[1], preferred_category: form.preferredCategory });
        navigate("/account");
      }}>
        <input aria-label="Email" required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input aria-label="First name" required placeholder="First name" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
        <select aria-label="Current life situation" value={form.currentLifeSituation} onChange={(event) => setForm({ ...form, currentLifeSituation: event.target.value })}>
          {["Too many meetings", "Parenting chaos", "Trying to sleep", "Marketing burnout", "Generally fine, suspiciously"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select aria-label="Preferred category" value={form.preferredCategory} onChange={(event) => setForm({ ...form, preferredCategory: event.target.value })}>
          {categories.map((category) => <option key={category.slug}>{category.name}</option>)}
        </select>
        <label><input type="checkbox" checked={form.marketing} onChange={(event) => setForm({ ...form, marketing: event.target.checked })} /> Marketing consent</label>
        <label><input type="checkbox" checked={form.personalization} onChange={(event) => setForm({ ...form, personalization: event.target.checked })} /> Personalization consent</label>
        <button>{mode === "login" ? "Simulate login" : "Create demo profile"}</button>
      </form>
    </main>
  );
}

function AccountPage() {
  const state = useAppState();
  const { profile, consent, recentlyViewed } = state;
  return (
    <main className="page two-col">
      <section className="profile-card">
        <h1>{profile.firstName ? `${profile.firstName}'s profile` : "Anonymous profile"}</h1>
        <PersonalizationZone zoneId="account_lifecycle_banner" fallback="Local profile enrichment is ready for Meiro identity resolution." className="banner" />
        <dl className="spec-list">
          <div><dt>Email</dt><dd>{profile.email ?? "Unknown visitor"}</dd></div>
          <div><dt>Lifecycle</dt><dd>{profile.lifecycleStage}</dd></div>
          <div><dt>Affinity</dt><dd>{profile.categoryAffinity ?? profile.preferredCategory ?? "Still emerging"}</dd></div>
          <div><dt>Consents</dt><dd>{Object.entries(consent).filter(([, enabled]) => enabled).map(([key]) => key).join(", ")}</dd></div>
          <div><dt>Recommended tags</dt><dd>{profile.recommendedTags.join(", ") || "None yet"}</dd></div>
        </dl>
      </section>
      <section>
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
    </main>
  );
}

function SearchPage() {
  const [query, setQuery] = useState(new URLSearchParams(window.location.search).get("q") ?? "");
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return products.filter((product) => [product.name, product.category, product.shortDescription, ...product.tags].join(" ").toLowerCase().includes(q));
  }, [query]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    trackEvent("search_submitted", { search_query: query, result_count: results.length });
  };
  return (
    <main className="page">
      <h1>Search</h1>
      <form className="search" onSubmit={submit}>
        <input aria-label="Search products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="meeting, sleep, please help" />
        <button>Search</button>
      </form>
      <div className="chips">{["meeting", "sleep", "parenting", "marketing", "Monday", "overthinking", "please help"].map((term) => <button type="button" onClick={() => setQuery(term)} key={term}>{term}</button>)}</div>
      <p>{query ? `${results.length} results` : "Try a popular fake search."}</p>
      <div onClickCapture={(event) => {
        const id = (event.target as HTMLElement).closest("[data-product-id]")?.getAttribute("data-product-id");
        if (id) trackEvent("search_result_clicked", { search_query: query, product_id: id });
      }}>
        {query && results.length === 0 ? (
          <EmptyState
            title="No supplies match that particular crisis."
            body="Try meeting, sleep, parenting, marketing, Monday, overthinking, or please help."
          />
        ) : (
          <div className="product-grid">{results.map((product) => <div data-product-id={product.id} key={product.id}><ProductCard product={product} /></div>)}</div>
        )}
      </div>
    </main>
  );
}

function PresenterChecklist() {
  const state = useAppState();
  const checks = [
    { label: "Anonymous browsing", done: state.recentlyViewed.length > 0 },
    { label: "Cart intent", done: state.cart.length > 0 },
    { label: "Identity resolution", done: state.profile.customerType === "registered" },
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

function MeiroStatusCard() {
  const status = getMeiroConfigStatus();
  const rows = [
    ["Mode", status.mode],
    ["SDK enabled", status.sdkEnabled ? "yes" : "no"],
    ["Endpoint", status.hasEndpoint ? "ready" : "missing"],
    ["Script", status.hasScriptUrl ? "ready" : "missing"],
    ["Debug", status.debug ? "on" : "off"],
  ];

  return (
    <section className="control-card">
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
      <p className="muted">Mock mode logs locally. Real SDK wiring should stay inside the Meiro integration layer.</p>
    </section>
  );
}

function DemoControlPage() {
  const state = useAppState();
  return (
    <main className="page two-col">
      <section>
        <h1>Demo control</h1>
        <p className="lead">Switch personas, review consent, and inspect the event trail behind each storefront action.</p>
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
        <PresenterChecklist />
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
  return (
    <main className="page narrow">
      <h1>Thank you. The order is simulated, the signals are not.</h1>
      <PersonalizationZone zoneId="thank_you_next_best_action" fallback="Recommended next step: review account profile enrichment." className="banner" />
      <Link to="/account" className="primary-cta">View profile</Link>
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
  const panel = (
    <aside className={inline ? "debug inline" : "debug"}>
      <h2>Demo event log</h2>
      <p><strong>Persona:</strong> {personas.find((persona) => persona.id === state.personaId)?.name}</p>
      <p><strong>Cart:</strong> {state.cart.length} lines</p>
      <p><strong>Viewed:</strong> {state.recentlyViewed.join(", ") || "none"}</p>
      <section className="decision-log">
        <h3>MPT SDK calls sent</h3>
        {state.meiroSdkCalls.length === 0 ? (
          <p className="muted">No SDK calls recorded yet. Browse, search, add to cart, or update consent to send the first signal.</p>
        ) : (
          state.meiroSdkCalls.slice(0, 8).map((call) => (
            <div className="sdk-call" key={`${call.timestamp}-${call.command}-${call.label}`}>
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
  if (pathname === "/demo-control") return <DemoControlPage />;
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
