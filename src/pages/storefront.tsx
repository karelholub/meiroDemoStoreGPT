import { useEffect, useMemo, useState } from "react";
import { categories, categorySlug, collections } from "../data/categories";
import { isPurchasable, products } from "../data/products";
import { ratingDistribution, reviewsFor } from "../data/reviews";
import { trackEvent } from "../integrations/meiro/meiroClient";
import { engineLevelLabels, useMeiroRecommendations } from "../integrations/meiro/meiroRecommendations";
import { cartPayload, productPayload } from "../integrations/meiro/meiroEvents";
import { useAppState } from "../store/appState";
import type { Product } from "../types";
import { formatProfileDate } from "../utils/format";
import { enrichCartItems, findProductById, findProductByIdOrSlug, findProductsByIds, findProductsByIdsOrSlugs } from "../utils/productLookup";
import { recommendProducts } from "../utils/recommendations";
import {
  AddToBagButton,
  Breadcrumbs,
  EmptyState,
  FreeShippingMeter,
  PersonalizationZone,
  ProductBadges,
  ProductCard,
  ProductGrid,
  ProductImage,
  ProductRail,
  QuantityStepper,
  RatingLine,
  SectionHeader,
  StockNote,
  WishlistButton,
  discountPercent,
  productUrl,
} from "../ui/components";
import { FREE_SHIPPING_THRESHOLD, Money, formatCzk, paymentOptions, shippingOptions } from "../ui/format";
import { ArrowIcon, BellIcon, CheckIcon, ChevronDownIcon, CloseIcon, LeafIcon, PinIcon, ShieldIcon, SlidersIcon, Stars, TruckIcon } from "../ui/icons";
import { TrustStrip, searchProducts } from "../ui/layout";
import { Link, navigate, useDocumentTitle, useQueryParam } from "../ui/router";
import { LifecycleSlots } from "./lifecycle";

/* ------------------------------------------------------------------ Home */

export function HomePage() {
  useDocumentTitle(undefined);
  const { cart } = useAppState();
  const engine = useMeiroRecommendations({ refreshKey: cart.map((item) => item.productId).join(",") });
  const selectProducts = products.filter((product) => product.brand === "VITALY Select" && isPurchasable(product) && !product.detail.toLowerCase().includes("sample")).slice(0, 4);
  const launches = products.filter((product) => product.stockStatus === "preorder");
  const newIn = products.filter((product) => product.isNew && product.stockStatus !== "preorder" && isPurchasable(product)).slice(0, 8);

  return (
    <main id="main" className="home">
      <section className="hero">
        <img className="hero-image" src="/assets/lifestyle/hero.jpg" alt="Woman stretching in a yoga pose on the seafront at sunrise" fetchPriority="high" />
        <div className="hero-content">
          <PersonalizationZone zoneId="homepage_top_banner" fallback="New: VITALY Select Algae Omega-3. Pre-order now" className="hero-pill" />
          <h1>
            <PersonalizationZone zoneId="homepage_hero" fallback="Feel your best, every day." inline />
          </h1>
          <p>Vitamins, minerals and natural care, chosen with pharmacists and delivered tomorrow. Over 130 products, honest prices, free shipping over CZK 1,500.</p>
          <div className="hero-actions">
            <Link to="/collections/bestsellers" className="button button-primary button-lg">Shop bestsellers</Link>
            <Link to="/collections/vitaly-select" className="button button-light button-lg">Discover VITALY Select</Link>
          </div>
          <ul className="hero-proof">
            <li><Stars rating={4.8} size={14} /> 4.8 from 12,400 reviews</li>
            <li><TruckIcon size={16} /> Ships today before 2 pm</li>
          </ul>
        </div>
      </section>

      {/* Anchor for the Meiro inline web banner "Vitaly · A06/A12 New VITALY Select products – VIP early access" (anchorType id). */}
      <div id="vitaly-meiro-hero" className="meiro-inline-slot" />

      <section className="category-scroller" aria-label="Shop by category">
        <SectionHeader title="Shop by category" action={{ label: "All products", to: "/products" }} />
        <div className="category-track">
          {categories.map((category) => (
            <Link key={category.slug} to={`/category/${category.slug}`} className="category-tile">
              <img src={category.image} alt={category.imageAlt} loading="lazy" />
              <span>{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <ProductRail
        title={<PersonalizationZone zoneId="homepage_recommendation_rail" fallback="Recommended for you" inline />}
        trackingTitle="homepage_recommendation_rail"
        subtitle={engine.items.length ? <EngineNote engine={engine} /> : "Based on what customers like you buy together"}
        strategy={engine.items.length ? "meiro_engine:vitaly_for_you" : "next_best_product"}
        items={engine.items.length ? engine.items.slice(0, 10).map((row) => row.product) : undefined}
        limit={10}
      />

      <section className="spotlight">
        <div className="spotlight-media">
          <img src="/assets/vitaly/story-natios_horcik.jpg" alt="VITALY Select Magnesium bisglycinate with B6" loading="lazy" />
        </div>
        <div className="spotlight-copy">
          <p className="kicker"><LeafIcon size={16} /> Our own line</p>
          <h2>VITALY Select</h2>
          <p>Clean formulas in vegan capsules, developed with pharmacists and made in the EU. No fillers, no proprietary blends, and prices that make a daily routine affordable.</p>
          <ul className="spotlight-list">
            {selectProducts.map((product) => (
              <li key={product.id}>
                <Link to={productUrl(product)}>
                  <ProductImage product={product} size="thumb" />
                  <span><strong>{product.name}</strong><small>{product.detail}</small></span>
                  <Money value={product.price} />
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/collections/vitaly-select" className="text-link">Shop all 29 VITALY Select products <ArrowIcon size={16} /></Link>
        </div>
      </section>

      <ProductRail title="Bestsellers" subtitle="Most reordered this month" strategy="bestsellers" items={collectionItems("bestsellers").slice(0, 10)} action={{ label: "See all", to: "/collections/bestsellers" }} />

      {launches.length > 0 && <LaunchBand launches={launches} />}

      <ProductRail title="New in" subtitle="Fresh arrivals from brands you trust" strategy="new_arrivals" items={newIn} action={{ label: "See all", to: "/collections/new" }} />

      <LifecycleSlots />

      <section className="second-chance-band">
        <img src="/assets/lifestyle/second-chance.jpg" alt="" loading="lazy" />
        <div>
          <p className="kicker">Second chance</p>
          <h2>Same quality, up to 30 % less</h2>
          <p>Short-dated products or dented boxes. The contents are perfect, and we always tell you why something is discounted.</p>
          <Link to="/collections/second-chance" className="button button-light">Browse Second chance</Link>
        </div>
      </section>

      <ProductRail title="Recently viewed" strategy="recently_viewed" limit={8} />

      <Newsletter />
      <TrustStrip />
    </main>
  );
}

function LaunchBand({ launches }: { launches: Product[] }) {
  const { requestBackInStock, watchdog } = useAppState();
  return (
    <section className="launch-band">
      <div className="launch-intro">
        <p className="kicker">Coming soon</p>
        <h2>Be first to try new VITALY Select launches</h2>
        <p>Pre-order today and we ship on launch day. Vitaly Club members get early access.</p>
      </div>
      <div className="launch-cards">
        {launches.map((product) => (
          <article key={product.id} className="launch-card">
            <Link to={productUrl(product)}><ProductImage product={product} /></Link>
            <div>
              <span className="launch-date">Launches {formatProfileDate(product.releaseDate)}</span>
              <Link to={productUrl(product)} className="launch-name">{product.name}</Link>
              <span className="product-card-detail">{product.detail}</span>
              <div className="launch-actions">
                <Money value={product.price} className="price-now" />
                <AddToBagButton product={product} />
                <button type="button" className="icon-button" aria-label={`Notify me when ${product.name} launches`} disabled={watchdog.includes(product.id)} onClick={() => requestBackInStock(product.id)}>
                  {watchdog.includes(product.id) ? <CheckIcon size={18} /> : <BellIcon size={18} />}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const interests = ["Vitamins & minerals", "Magnesium", "Probiotics", "Herbs & adaptogens", "Sports nutrition", "Cosmetics", "Eco household"];

export function Newsletter() {
  const { consent, setConsent, updateProfile } = useAppState();
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [agree, setAgree] = useState(consent.marketing);
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="newsletter">
      <div className="newsletter-copy">
        <h2>{submitted ? "Thank you, you're on the list." : "Healthy tips and new products first"}</h2>
        <p>{submitted ? "Your welcome gift is waiting in your inbox. We add a free gift to every order over CZK 1,200." : "Subscribe and get a free gift with your next order over CZK 1,200. One useful email a week, unsubscribe anytime."}</p>
      </div>
      {!submitted && (
        <form
          className="newsletter-form"
          onSubmit={(event) => {
            event.preventDefault();
            trackEvent("newsletter_signup", { email, email_domain: email.split("@")[1] ?? "unknown", marketing_consent: agree, interests: picked, method: "newsletter_footer" });
            if (agree && !consent.marketing) setConsent({ ...consent, marketing: true });
            if (picked[0]) updateProfile({ preferredCategory: picked[0], recommendedTags: picked.map((item) => item.toLowerCase()) });
            setSubmitted(true);
          }}
        >
          <fieldset className="chips">
            <legend>What interests you most?</legend>
            {interests.map((interest) => (
              <label key={interest} className={picked.includes(interest) ? "chip is-active" : "chip"}>
                <input type="checkbox" checked={picked.includes(interest)} onChange={() => setPicked((items) => (items.includes(interest) ? items.filter((item) => item !== interest) : [...items, interest]))} />
                {interest}
              </label>
            ))}
          </fieldset>
          <div className="input-group">
            <input aria-label="Email address" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" type="email" required autoComplete="email" />
            <button className="button button-primary">Subscribe</button>
          </div>
          <label className="check-row">
            <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} required />
            <span>I agree to receive marketing communications from Vitaly. You can unsubscribe at any time.</span>
          </label>
        </form>
      )}
    </section>
  );
}

function EngineNote({ engine }: { engine: ReturnType<typeof useMeiroRecommendations> }) {
  const label = engineLevelLabels[engine.levelKey ?? "popular"] ?? "Recommended";
  return (
    <span className="engine-note">
      <LeafIcon size={14} /> {label} · {engine.personalised ? "personalised by" : "from"} the Meiro recommendation engine
    </span>
  );
}

/* --------------------------------------------------------------- Listing */

type SortKey = "popular" | "price-asc" | "price-desc" | "rating" | "new";
const sortLabels: Record<SortKey, string> = { popular: "Most popular", "price-asc": "Price: low to high", "price-desc": "Price: high to low", rating: "Top rated", new: "Newest" };

function sortProducts(items: Product[], sort: SortKey) {
  const list = [...items];
  if (sort === "price-asc") return list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") return list.sort((a, b) => b.price - a.price);
  if (sort === "rating") return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount);
  if (sort === "new") return list.sort((a, b) => Number(b.isNew || !!b.releaseDate) - Number(a.isNew || !!a.releaseDate));
  return list.sort((a, b) => Number(isPurchasable(b)) - Number(isPurchasable(a)) || b.popularityScore - a.popularityScore);
}

function collectionItems(slug: string) {
  if (slug === "vitaly-select") return products.filter((product) => product.brand === "VITALY Select");
  if (slug === "second-chance") return products.filter((product) => product.isSecondChance);
  if (slug === "new") return products.filter((product) => product.isNew || product.releaseDate);
  if (slug === "bestsellers") return [...products].filter((product) => isPurchasable(product) && !product.isSecondChance).sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 24);
  return products;
}

export function ListingPage({ categorySlug: catSlug, collectionSlug }: { categorySlug?: string; collectionSlug?: string }) {
  const state = useAppState();
  const category = categories.find((item) => item.slug === catSlug);
  const collection = collections.find((item) => item.slug === collectionSlug);
  const base = category ? products.filter((product) => product.category === category.name) : collection ? collectionItems(collection.slug) : products;
  const [sort, setSort] = useState<SortKey>("popular");
  const [brands, setBrands] = useState<string[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [flags, setFlags] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visible, setVisible] = useState(24);
  const affinity = state.profile.categoryAffinity ?? state.profile.preferredCategory;
  useDocumentTitle(category?.name ?? collection?.name ?? "All products");

  useEffect(() => {
    setBrands([]);
    setCats([]);
    setFlags([]);
    setVisible(24);
    setSort("popular");
  }, [catSlug, collectionSlug]);

  useEffect(() => {
    trackEvent(category ? "category_view" : "product_list_view", {
      category: category?.name ?? collection?.name ?? "All products",
      product_count: base.length,
      items: base.slice(0, 12).map((product) => ({ product_id: product.id, product_name: product.title, category: product.category, price: product.price })),
    });
  }, [category?.name, collection?.name, base.length]);

  const brandCounts = useMemo(() => {
    const counts = new Map<string, number>();
    base.forEach((product) => counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [base]);
  const catCounts = useMemo(() => {
    const counts = new Map<string, number>();
    base.forEach((product) => counts.set(product.category, (counts.get(product.category) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [base]);

  const flagDefs = [
    { id: "in_stock", label: "In stock", test: (product: Product) => isPurchasable(product) },
    { id: "vegan", label: "Vegan", test: (product: Product) => product.isVegan },
    { id: "sale", label: "On sale", test: (product: Product) => Boolean(product.compareAtPrice) },
    { id: "select", label: "VITALY Select", test: (product: Product) => product.brand === "VITALY Select" },
    { id: "top", label: "Rated 4.8+", test: (product: Product) => (product.rating ?? 0) >= 4.8 },
  ];

  let filtered = base.filter((product) => (!brands.length || brands.includes(product.brand)) && (!cats.length || cats.includes(product.category)) && flags.every((flag) => flagDefs.find((def) => def.id === flag)?.test(product)));
  filtered = sortProducts(filtered, sort);
  if (!category && affinity && sort === "popular" && state.consent.personalization) {
    filtered = [...filtered.filter((product) => product.category === affinity), ...filtered.filter((product) => product.category !== affinity)];
  }
  const activeCount = brands.length + cats.length + flags.length;
  const toggle = (list: string[], set: (next: string[]) => void, value: string) => set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const title = category?.name ?? collection?.name ?? "All products";
  const description = category?.description ?? collection?.description ?? "Vitamins, minerals, natural cosmetics and eco household essentials from Vitaly and brands we trust.";

  return (
    <main id="main" className="listing">
      <header className={category ? "listing-hero has-image" : "listing-hero"}>
        {category && <img src={category.image} alt="" />}
        <div className="listing-hero-copy">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, ...(category || collection ? [{ label: "Shop", to: "/products" }] : []), { label: title }]} />
          <h1>{title}</h1>
          <PersonalizationZone zoneId="category_intro_banner" fallback={<p>{description}</p>} className="listing-intro" />
        </div>
      </header>

      <div className="listing-toolbar">
        <button type="button" className="button button-ghost filter-toggle" onClick={() => setFiltersOpen(true)}>
          <SlidersIcon size={18} /> Filters{activeCount > 0 && ` (${activeCount})`}
        </button>
        <p className="result-count">{filtered.length} products</p>
        <label className="sort-select">
          <span>Sort by</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            {Object.entries(sortLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <ChevronDownIcon size={16} />
        </label>
      </div>

      <div className="listing-body">
        <aside className={filtersOpen ? "filters is-open" : "filters"} aria-label="Filters">
          <div className="filters-head">
            <h2>Filters</h2>
            <button type="button" className="icon-button" aria-label="Close filters" onClick={() => setFiltersOpen(false)}><CloseIcon /></button>
          </div>
          <fieldset>
            <legend>Show only</legend>
            {flagDefs.map((flag) => (
              <label key={flag.id} className="check-row">
                <input type="checkbox" checked={flags.includes(flag.id)} onChange={() => toggle(flags, setFlags, flag.id)} />
                <span>{flag.label}</span>
                <small>{base.filter(flag.test).length}</small>
              </label>
            ))}
          </fieldset>
          {!category && catCounts.length > 1 && (
            <fieldset>
              <legend>Category</legend>
              {catCounts.map(([name, count]) => (
                <label key={name} className="check-row">
                  <input type="checkbox" checked={cats.includes(name)} onChange={() => toggle(cats, setCats, name)} />
                  <span>{name}</span>
                  <small>{count}</small>
                </label>
              ))}
            </fieldset>
          )}
          {brandCounts.length > 1 && (
            <fieldset>
              <legend>Brand</legend>
              {brandCounts.map(([name, count]) => (
                <label key={name} className="check-row">
                  <input type="checkbox" checked={brands.includes(name)} onChange={() => toggle(brands, setBrands, name)} />
                  <span>{name}</span>
                  <small>{count}</small>
                </label>
              ))}
            </fieldset>
          )}
          <div className="filters-foot">
            <button type="button" className="button button-ghost" onClick={() => { setBrands([]); setCats([]); setFlags([]); }} disabled={!activeCount}>Clear all</button>
            <button type="button" className="button button-primary" onClick={() => setFiltersOpen(false)}>Show {filtered.length} products</button>
          </div>
        </aside>
        {filtersOpen && <div className="filters-scrim" onClick={() => setFiltersOpen(false)} />}

        <div className="listing-results">
          {activeCount > 0 && (
            <div className="active-filters">
              {[...flags.map((id) => ({ id, label: flagDefs.find((flag) => flag.id === id)?.label ?? id, clear: () => toggle(flags, setFlags, id) })),
                ...cats.map((id) => ({ id, label: id, clear: () => toggle(cats, setCats, id) })),
                ...brands.map((id) => ({ id, label: id, clear: () => toggle(brands, setBrands, id) }))].map((chip) => (
                <button type="button" key={chip.id} className="chip is-active" onClick={chip.clear}>{chip.label} <CloseIcon size={14} /></button>
              ))}
            </div>
          )}
          {filtered.length === 0 ? (
            <EmptyState title="No products match these filters" body="Try removing a filter or browse all products." action={{ label: "Browse all products", to: "/products" }} />
          ) : (
            <>
              <ProductGrid items={filtered.slice(0, visible)} />
              {visible < filtered.length && (
                <div className="load-more">
                  <p>Showing {visible} of {filtered.length}</p>
                  <button type="button" className="button button-ghost" onClick={() => setVisible((count) => count + 24)}>Show more products</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------- Product page */

export function ProductPage({ slug }: { slug: string }) {
  const { viewProduct } = useAppState();
  const product = findProductByIdOrSlug(slug);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  useDocumentTitle(product ? `${product.brand} ${product.name}` : "Product not found");
  const engine = useMeiroRecommendations({ itemId: product?.id, enabled: Boolean(product) });

  useEffect(() => {
    if (!product) return;
    setQuantity(1);
    setImageIndex(0);
    viewProduct(product.id);
    trackEvent("product_view", productPayload(product));
  }, [product?.id]);

  if (!product) return <NotFound />;
  const category = categories.find((item) => item.name === product.category);
  const reviews = reviewsFor(product);
  const distribution = ratingDistribution(product);
  const perDay = product.packDays ? product.price / product.packDays : undefined;
  const discount = discountPercent(product);
  const gallery = [
    { kind: "product" as const, label: "Product" },
    { kind: "detail" as const, label: "Label detail" },
    ...(category ? [{ kind: "lifestyle" as const, label: category.name }] : []),
  ];
  const complementary = products
    .filter((item) => product.complementaryCategories.includes(item.category) && item.id !== product.id && isPurchasable(item) && !item.isSecondChance)
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, 8);

  return (
    <main id="main" className="pdp">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: product.category, to: `/category/${categorySlug(product.category)}` }, { label: product.name }]} />
      <div className="pdp-top">
        <section className="gallery" aria-label="Product images">
          <div className="gallery-main">
            {gallery[imageIndex].kind === "lifestyle" && category ? (
              <img className="gallery-lifestyle" src={category.image} alt={category.imageAlt} />
            ) : (
              <div className={gallery[imageIndex].kind === "detail" ? "gallery-zoom" : ""}>
                <ProductImage product={product} size="large" eager />
              </div>
            )}
            <ProductBadges product={product} />
          </div>
          <div className="gallery-thumbs" role="tablist" aria-label="Choose image">
            {gallery.map((item, index) => (
              <button type="button" role="tab" aria-selected={index === imageIndex} aria-label={item.label} key={item.kind} className={index === imageIndex ? "is-active" : ""} onClick={() => setImageIndex(index)}>
                {item.kind === "lifestyle" && category ? <img src={category.image} alt="" /> : <span className={item.kind === "detail" ? "gallery-zoom" : ""}><ProductImage product={product} size="thumb" /></span>}
              </button>
            ))}
          </div>
        </section>

        <section className="buy-box">
          <Link to={product.brand === "VITALY Select" ? "/collections/vitaly-select" : `/search?q=${encodeURIComponent(product.brand)}`} className="buy-brand">{product.brand}</Link>
          <h1>{product.name}</h1>
          {product.detail && <p className="buy-detail">{product.detail}</p>}
          {product.rating && (
            <a href="#reviews" className="buy-rating" onClick={(event) => { event.preventDefault(); document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" }); }}>
              <RatingLine product={product} /> <span>Read reviews</span>
            </a>
          )}
          <div className="buy-price">
            <Money value={product.price} className={product.compareAtPrice ? "price-now is-sale" : "price-now"} />
            {product.compareAtPrice && (
              <>
                <s className="price-was">{formatCzk(product.compareAtPrice)}</s>
                <span className="badge badge-sale">Save {discount} %</span>
              </>
            )}
          </div>
          {perDay && <p className="buy-unit">{formatCzk(Math.round(perDay * 10) / 10)} per day · one pack lasts {product.packDays} days</p>}
          {product.isSecondChance && product.secondChanceReason && <p className="notice notice-amber"><strong>Why it's discounted:</strong> {product.secondChanceReason}. The product itself is in perfect condition.</p>}
          <p className="buy-lead">{product.shortDescription}</p>
          <StockNote product={product} />
          <div className="buy-actions">
            {isPurchasable(product) && <QuantityStepper value={quantity} onChange={(next) => setQuantity(Math.max(1, next))} label="Quantity" />}
            <AddToBagButton product={product} quantity={quantity} className="buy-add" />
            <WishlistButton product={product} className="buy-wish" />
          </div>
          <ul className="buy-promises">
            <li><TruckIcon size={18} /><span>{product.price >= FREE_SHIPPING_THRESHOLD ? "Free shipping on this item" : `Free shipping over ${formatCzk(FREE_SHIPPING_THRESHOLD)}`}</span></li>
            <li><PinIcon size={18} /><span>Pickup point tomorrow from CZK 69</span></li>
            <li><ShieldIcon size={18} /><span>30-day returns on unopened products</span></li>
          </ul>
          <ul className="buy-benefits">
            {product.benefits.map((benefit) => <li key={benefit}><CheckIcon size={16} /> {benefit}</li>)}
          </ul>
          <details className="accordion" open>
            <summary>Description <ChevronDownIcon size={18} /></summary>
            <p>{product.longDescription}</p>
          </details>
          <details className="accordion">
            <summary>How to use <ChevronDownIcon size={18} /></summary>
            <p>Follow the recommended daily dose on the pack. Do not exceed it. Food supplements are not a substitute for a varied diet and healthy lifestyle. Keep out of reach of children.</p>
          </details>
          <details className="accordion">
            <summary>Product details <ChevronDownIcon size={18} /></summary>
            <dl className="spec-list">
              <div><dt>Brand</dt><dd>{product.brand}</dd></div>
              <div><dt>Category</dt><dd>{product.category}</dd></div>
              {product.packDays && <div><dt>Pack lasts</dt><dd>{product.packDays} days</dd></div>}
              <div><dt>Vegan</dt><dd>{product.isVegan ? "Yes" : "No"}</dd></div>
              <div><dt>Product code</dt><dd>{product.id}</dd></div>
            </dl>
          </details>
        </section>
      </div>

      {complementary.length > 0 && (
        <ProductRail title="Complete your routine" subtitle={`Pairs well with ${product.name}`} strategy="frequently_bought_together" items={complementary} />
      )}

      <section className="reviews" id="reviews" aria-label="Customer reviews">
        <div className="reviews-summary">
          <h2>Customer reviews</h2>
          {product.rating ? (
            <>
              <div className="reviews-score"><strong>{product.rating.toFixed(1)}</strong><span><Stars rating={product.rating} size={18} /><small>{product.reviewCount} verified reviews</small></span></div>
              <ul className="reviews-bars">
                {distribution.map((row) => (
                  <li key={row.stars}>
                    <span>{row.stars}★</span>
                    <span className="bar"><i style={{ transform: `scaleX(${product.reviewCount ? row.count / product.reviewCount : 0})` }} /></span>
                    <small>{row.count}</small>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>No reviews yet. Be the first to share your experience.</p>
          )}
          <Link to="/review" className="button button-ghost">Write a review</Link>
        </div>
        <div className="reviews-list">
          {reviews.map((review) => (
            <article key={review.id} className="review">
              <header>
                <Stars rating={review.rating} size={14} />
                <h3>{review.title}</h3>
              </header>
              <p>{review.body}</p>
              <footer>
                <span><strong>{review.author}</strong>, {review.city} · {formatProfileDate(review.date)}</span>
                {review.verified && <span className="verified"><CheckIcon size={14} /> Verified purchase</span>}
              </footer>
            </article>
          ))}
        </div>
      </section>

      <ProductRail
        title={<PersonalizationZone zoneId="product_detail_cross_sell" fallback="You may also like" inline />}
        trackingTitle="product_detail_cross_sell"
        subtitle={engine.items.length ? <EngineNote engine={engine} /> : undefined}
        strategy={engine.items.length ? "meiro_engine:vitaly_for_you" : "similar_tags"}
        items={engine.items.length ? engine.items.slice(0, 10).map((row) => row.product) : undefined}
        currentProductId={product.id}
        limit={10}
      />

      <div className="sticky-buy">
        <span><strong>{product.name}</strong><Money value={product.price} /></span>
        <AddToBagButton product={product} quantity={quantity} />
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------- Search */

export function SearchPage() {
  const state = useAppState();
  const urlQuery = useQueryParam("q");
  const [query, setQuery] = useState(urlQuery);
  const [sort, setSort] = useState<SortKey>("popular");
  const results = useMemo(() => (sort === "popular" ? searchProducts(urlQuery) : sortProducts(searchProducts(urlQuery), sort)), [urlQuery, sort]);
  const lastViewedItems = recommendProducts("recently_viewed", state, { limit: 8 });
  useDocumentTitle(urlQuery ? `Search: ${urlQuery}` : "Search");

  useEffect(() => setQuery(urlQuery), [urlQuery]);
  useEffect(() => {
    if (urlQuery) trackEvent("search_submitted", { search_query: urlQuery, result_count: results.length });
  }, [urlQuery]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim() === urlQuery) trackEvent("search_submitted", { search_query: query, result_count: results.length });
    else navigate(`/search?q=${encodeURIComponent(query.trim())}`, { scroll: false });
  };

  return (
    <main id="main" className="search-page">
      <section className="search-hero">
        <h1>{urlQuery ? <>Results for “{urlQuery}”</> : "What are you looking for?"}</h1>
        <form className="search-big" role="search" onSubmit={submit}>
          <input aria-label="Search products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try magnesium, sleep, vegan omega…" type="search" />
          <button className="button button-primary">Search</button>
        </form>
        <div className="chips">
          {["magnesium", "sleep", "vitamin D", "probiotics", "ashwagandha", "protein", "vegan"].map((term) => (
            <Link key={term} to={`/search?q=${encodeURIComponent(term)}`} className={urlQuery === term ? "chip is-active" : "chip"}>{term}</Link>
          ))}
        </div>
      </section>

      {urlQuery && (
        <section
          className="search-results"
          onClickCapture={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("button")) return;
            const id = target.closest("[data-product-id]")?.getAttribute("data-product-id");
            const product = findProductById(id ?? undefined);
            if (product) trackEvent("search_result_clicked", { search_query: urlQuery, product_id: product.id, product_name: product.title, category: product.category, price: product.price });
          }}
        >
          <div className="listing-toolbar">
            <p className="result-count">{results.length} result{results.length === 1 ? "" : "s"}</p>
            <label className="sort-select">
              <span>Sort by</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                {Object.entries(sortLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <ChevronDownIcon size={16} />
            </label>
          </div>
          {results.length === 0 ? (
            <EmptyState title={`No results for “${urlQuery}”`} body="Check the spelling or try a more general term, like “magnesium” or “vitamins”." action={{ label: "Browse all products", to: "/products" }} />
          ) : (
            <ProductGrid items={results} />
          )}
        </section>
      )}

      <section className="rail search-personalized-rail">
        <div className="section-header"><div><h2>Last viewed products</h2></div></div>
        {lastViewedItems.length > 0 ? (
          <div className="rail-track">
            {lastViewedItems.map((product, index) => <ProductCard key={product.id} product={product} source="recently_viewed" position={index + 1} />)}
          </div>
        ) : (
          <p className="muted">Products you view will appear here, so you can pick up where you left off.</p>
        )}
      </section>
      <ProductRail title="Popular right now" strategy="next_best_product" limit={8} />
    </main>
  );
}

/* ------------------------------------------------------------------ Cart */

export function CartPage() {
  const state = useAppState();
  const { cart, addToCart, removeFromCart, setQuantity } = state;
  const enriched = enrichCartItems(cart);
  const profileCartProducts = findProductsByIdsOrSlugs(state.profile.cartItemIds);
  const emptyCartPicks = (profileCartProducts.length > 0 ? profileCartProducts : recommendProducts("next_best_product", state, { limit: 4 })).slice(0, 4);
  const emptyCartIds = emptyCartPicks.map((product) => product.id).join(",");
  const subtotal = enriched.reduce((sum, row) => sum + row.product.price * row.item.quantity, 0);
  const savings = enriched.reduce((sum, row) => sum + ((row.product.compareAtPrice ?? row.product.price) - row.product.price) * row.item.quantity, 0);
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  useDocumentTitle("Basket");

  useEffect(() => trackEvent("cart_view", cartPayload(cart)), [cart.map((item) => `${item.productId}:${item.quantity}`).join(",")]);
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
    <main id="main" className="cart-page">
      <h1>Your basket</h1>
      <PersonalizationZone zoneId="cart_abandonment_banner" fallback={null} className="notice notice-brand zone-banner" />
      {enriched.length === 0 ? (
        <section className="cart-empty">
          <EmptyState
            title={state.profile.hasActiveCart || profileCartProducts.length > 0 ? "Welcome back. We saved a few things for you." : "Your basket is empty"}
            body={state.profile.lastAbandonedCartValue ? `Your last basket was worth ${formatCzk(state.profile.lastAbandonedCartValue)}. Add the items back with one click.` : "Discover our bestsellers or pick up where you left off."}
            action={{ label: "Shop bestsellers", to: "/collections/bestsellers" }}
          />
          {emptyCartPicks.length > 0 && (
            <div className="cart-picks">
              <h2>{profileCartProducts.length > 0 ? "From your last visit" : "Popular picks"}</h2>
              <ul>
                {emptyCartPicks.map((product) => (
                  <li key={product.id}>
                    <ProductImage product={product} size="thumb" />
                    <span><strong>{product.name}</strong><Money value={product.price} /></span>
                    <button type="button" className="button button-ghost button-sm" onClick={() => addToCart(product.id, 1, { openDrawer: false })}>Add</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : (
        <div className="cart-layout">
          <section className="cart-lines" aria-label="Basket items">
            <FreeShippingMeter subtotal={subtotal} />
            <ul>
              {enriched.map(({ item, product }) => (
                <li key={product.id} className="cart-line">
                  <Link to={productUrl(product)}><ProductImage product={product} size="thumb" /></Link>
                  <div className="cart-line-info">
                    <small>{product.brand}</small>
                    <Link to={productUrl(product)} className="cart-line-name">{product.name}</Link>
                    <span className="product-card-detail">{product.detail}</span>
                    <StockNote product={product} />
                  </div>
                  <QuantityStepper value={item.quantity} min={0} label={`Quantity of ${product.name}`} onChange={(next) => setQuantity(product.id, next)} />
                  <div className="cart-line-price">
                    <Money value={product.price * item.quantity} />
                    {item.quantity > 1 && <small>{formatCzk(product.price)} each</small>}
                  </div>
                  <button type="button" className="icon-button" aria-label={`Remove ${product.name}`} onClick={() => removeFromCart(product.id)}><CloseIcon size={18} /></button>
                </li>
              ))}
            </ul>
          </section>
          <aside className="order-summary" aria-label="Order summary">
            <h2>Order summary</h2>
            <PersonalizationZone zoneId="cart_discount_banner" fallback={null} className="notice notice-leaf zone-banner" />
            <dl>
              <div><dt>Subtotal</dt><dd><Money value={subtotal} /></dd></div>
              {savings > 0 && <div className="is-saving"><dt>You save</dt><dd>−{formatCzk(savings)}</dd></div>}
              <div><dt>Shipping</dt><dd>{subtotal >= FREE_SHIPPING_THRESHOLD ? "Free" : "From CZK 69"}</dd></div>
              <div className="summary-total"><dt>Total</dt><dd><Money value={subtotal} /></dd></div>
            </dl>
            <form className="promo" onSubmit={(event) => { event.preventDefault(); setPromoApplied(Boolean(promo.trim())); }}>
              <input aria-label="Discount code" placeholder="Discount code" value={promo} onChange={(event) => { setPromo(event.target.value); setPromoApplied(false); }} />
              <button className="button button-ghost button-sm">Apply</button>
            </form>
            {promoApplied && <p className="muted">Code {promo.toUpperCase()} will be checked at checkout.</p>}
            <Link to="/checkout" className="button button-primary button-block button-lg">Go to checkout</Link>
            <p className="summary-note"><ShieldIcon size={16} /> Secure checkout · VAT included</p>
          </aside>
        </div>
      )}
      {enriched.length > 0 && <ProductRail title="Frequently bought together" strategy="cart_cross_sell" limit={8} />}
    </main>
  );
}

/* -------------------------------------------------------------- Checkout */

export function CheckoutPage() {
  const state = useAppState();
  const { completeOrder, profile } = state;
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState({
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    firstName: profile.firstName ?? "",
    surname: profile.surname ?? "",
    streetAddress: profile.streetAddress ?? "",
    apartmentOrCompany: profile.apartmentOrCompany ?? "",
    city: profile.city ?? "",
    postalCode: profile.postalCode ?? "",
    country: profile.country ?? "Czech Republic",
    shippingSpeed: "pickup_point",
    paymentMethod: "card_demo",
  });
  const steps = ["Contact", "Delivery", "Payment", "Review"];
  useDocumentTitle("Checkout");
  const enriched = enrichCartItems(state.cart);
  const subtotal = enriched.reduce((sum, { item, product }) => sum + item.quantity * product.price, 0);
  const shipping = shippingOptions.find((option) => option.id === details.shippingSpeed) ?? shippingOptions[0];
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : shipping.price;
  const codFee = details.paymentMethod === "cash_on_delivery" ? 39 : 0;

  const checkoutPayload = () => ({
    contact: { email: details.email, phone: details.phone, first_name: details.firstName, surname: details.surname },
    shipping: {
      street_address: details.streetAddress,
      apartment_or_company: details.apartmentOrCompany,
      city: details.city,
      postal_code: details.postalCode,
      country: details.country,
      shipping_speed: details.shippingSpeed,
    },
    payment: { payment_method: details.paymentMethod },
  });

  useEffect(() => {
    setDetails((current) => ({
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
  useEffect(() => trackEvent("checkout_started", cartPayload(state.cart)), []);

  const completeStep = (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { step: steps[step], ...checkoutPayload(), ...cartPayload(state.cart) };
    if (step === 0) trackEvent("checkout_contact_submitted", payload);
    if (step === 1) trackEvent("checkout_shipping_submitted", payload);
    if (step === 2) trackEvent("checkout_payment_submitted", payload);
    trackEvent("checkout_step_completed", payload);
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const placeOrder = () => {
    const orderPayload = cartPayload(state.cart);
    state.updateProfile({
      email: details.email,
      phone: details.phone,
      firstName: details.firstName,
      surname: details.surname,
      streetAddress: details.streetAddress,
      apartmentOrCompany: details.apartmentOrCompany,
      city: details.city,
      postalCode: details.postalCode,
      country: details.country,
    });
    const orderId = completeOrder();
    trackEvent("order_completed", {
      order_id: orderId,
      customer_type: profile.customerType,
      email: details.email,
      phone: details.phone,
      ...checkoutPayload(),
      ...orderPayload,
      shipping_cost: shippingCost,
      total_value: orderPayload.cart_value,
      currency: "CZK",
    });
    navigate("/thank-you");
  };

  if (state.cart.length === 0) {
    return (
      <main id="main" className="checkout-page narrow">
        <EmptyState title="Your basket is empty" body="Add a product to your basket to check out." action={{ label: "Shop bestsellers", to: "/collections/bestsellers" }} />
      </main>
    );
  }

  const field = (key: keyof typeof details, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={`field ${props.className ?? ""}`}>
      <span>{label}</span>
      <input {...props} className={undefined} value={details[key]} onChange={(event) => setDetails({ ...details, [key]: event.target.value })} />
    </label>
  );

  return (
    <main id="main" className="checkout-page">
      <div className="checkout-head">
        <h1>Checkout</h1>
        <PersonalizationZone zoneId="checkout_reassurance_banner" fallback="Secure checkout. Orders before 2 pm ship today." className="checkout-reassure" />
      </div>
      <ol className="progress" aria-label="Checkout steps">
        {steps.map((label, index) => (
          <li key={label} className={index === step ? "is-current" : index < step ? "is-done" : ""}>
            <button type="button" disabled={index > step} onClick={() => setStep(index)}>
              <span>{index < step ? <CheckIcon size={14} /> : index + 1}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>
      <div className="checkout-layout">
        <form className="checkout-card" onSubmit={step < 3 ? completeStep : (event) => { event.preventDefault(); placeOrder(); }}>
          <h2>{["Contact details", "Delivery", "Payment", "Review your order"][step]}</h2>
          {step === 0 && (
            <div className="field-grid">
              {field("email", "Email", { type: "email", autoComplete: "email", required: true, className: "span-2" })}
              {field("firstName", "First name", { autoComplete: "given-name", required: true })}
              {field("surname", "Surname", { autoComplete: "family-name", required: true })}
              {field("phone", "Phone", { type: "tel", autoComplete: "tel", className: "span-2" })}
              <p className="muted span-2">Already have an account? <Link to="/login">Sign in</Link> for faster checkout and Vitaly Club points.</p>
            </div>
          )}
          {step === 1 && (
            <>
              <div className="option-list">
                {shippingOptions.map((option) => (
                  <label key={option.id} className={details.shippingSpeed === option.id ? "option is-selected" : "option"}>
                    <input type="radio" name="shipping" checked={details.shippingSpeed === option.id} onChange={() => setDetails({ ...details, shippingSpeed: option.id })} />
                    <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                    <b>{subtotal >= FREE_SHIPPING_THRESHOLD ? "Free" : formatCzk(option.price)}</b>
                  </label>
                ))}
              </div>
              <div className="field-grid">
                {field("streetAddress", "Street address", { autoComplete: "address-line1", required: true, className: "span-2" })}
                {field("apartmentOrCompany", "Apartment, company (optional)", { autoComplete: "address-line2", className: "span-2" })}
                {field("city", "City", { autoComplete: "address-level2", required: true })}
                {field("postalCode", "Postal code", { autoComplete: "postal-code", required: true })}
                {field("country", "Country", { autoComplete: "country-name", className: "span-2" })}
              </div>
            </>
          )}
          {step === 2 && (
            <div className="option-list">
              {paymentOptions.map((option) => (
                <label key={option.id} className={details.paymentMethod === option.id ? "option is-selected" : "option"}>
                  <input type="radio" name="payment" checked={details.paymentMethod === option.id} onChange={() => setDetails({ ...details, paymentMethod: option.id })} />
                  <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                </label>
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="review-grid">
              <div><h3>Contact</h3><p>{details.firstName} {details.surname}<br />{details.email}<br />{details.phone}</p><button type="button" className="text-link" onClick={() => setStep(0)}>Edit</button></div>
              <div><h3>Delivery</h3><p>{shipping.label}<br />{details.streetAddress}<br />{details.postalCode} {details.city}</p><button type="button" className="text-link" onClick={() => setStep(1)}>Edit</button></div>
              <div><h3>Payment</h3><p>{paymentOptions.find((option) => option.id === details.paymentMethod)?.label}</p><button type="button" className="text-link" onClick={() => setStep(2)}>Edit</button></div>
            </div>
          )}
          <div className="checkout-actions">
            {step > 0 && <button type="button" className="button button-ghost" onClick={() => setStep(step - 1)}>Back</button>}
            <button className="button button-primary button-lg">{step < 3 ? "Continue" : `Place order · ${formatCzk(subtotal + shippingCost + codFee)}`}</button>
          </div>
          {step === 3 && <p className="muted">This is a demo store. No payment is taken and nothing is shipped.</p>}
        </form>
        <aside className="order-summary checkout-summary" aria-label="Order summary">
          <h2>Order summary</h2>
          <ul className="summary-lines">
            {enriched.map(({ item, product }) => (
              <li key={product.id}>
                <span className="summary-thumb"><ProductImage product={product} size="thumb" /><b>{item.quantity}</b></span>
                <span><strong>{product.name}</strong><small>{product.brand}</small></span>
                <Money value={product.price * item.quantity} />
              </li>
            ))}
          </ul>
          <dl>
            <div><dt>Subtotal</dt><dd><Money value={subtotal} /></dd></div>
            <div><dt>Shipping</dt><dd>{shippingCost === 0 ? "Free" : formatCzk(shippingCost)}</dd></div>
            {codFee > 0 && <div><dt>Cash on delivery</dt><dd>{formatCzk(codFee)}</dd></div>}
            <div className="summary-total"><dt>Total</dt><dd><Money value={subtotal + shippingCost + codFee} /></dd></div>
          </dl>
        </aside>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------- Thank you */

export function ThankYouPage() {
  const state = useAppState();
  const orderId = state.lastOrderId ?? "VIT-DEMO";
  const firstName = state.profile.firstName;
  const purchased = findProductsByIds(state.profile.purchases.slice(-4));
  useDocumentTitle("Thank you");

  return (
    <main id="main" className="thank-you">
      <section className="thank-you-hero">
        <span className="thank-you-check"><CheckIcon size={28} /></span>
        <h1>{firstName ? `Thank you, ${firstName}!` : "Thank you for your order!"}</h1>
        <p>Order <strong>{orderId}</strong> is confirmed. We will email you when it ships{state.profile.email ? ` to ${state.profile.email}` : ""}.</p>
        <PersonalizationZone zoneId="thank_you_next_best_action" fallback="Join Vitaly Club and get free shipping on your next order." className="notice notice-brand" />
        <div className="hero-actions">
          <Link to="/" className="button button-primary">Continue shopping</Link>
          <Link to="/review" className="button button-ghost">Review your products</Link>
        </div>
      </section>
      {purchased.length > 0 && (
        <section className="thank-you-items">
          <h2>In this order</h2>
          <ul>
            {purchased.map((product) => (
              <li key={product.id}><ProductImage product={product} size="thumb" /><span><small>{product.brand}</small><strong>{product.name}</strong></span></li>
            ))}
          </ul>
        </section>
      )}
      <LifecycleSlots compact />
      <ProductRail title="Customers also bought" strategy="post_purchase" limit={8} />
    </main>
  );
}

export function NotFound() {
  return (
    <main id="main" className="narrow">
      <EmptyState title="Page not found" body="The page you are looking for has moved or no longer exists." action={{ label: "Back to the homepage", to: "/" }} />
    </main>
  );
}
