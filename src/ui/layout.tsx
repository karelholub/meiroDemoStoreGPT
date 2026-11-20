import { useEffect, useMemo, useRef, useState } from "react";
import { categories, collections } from "../data/categories";
import { products } from "../data/products";
import { trackEvent } from "../integrations/meiro/meiroClient";
import { useAppState } from "../store/appState";
import type { ConsentState } from "../types";
import { cartItemCount, enrichCartItems } from "../utils/productLookup";
import { FreeShippingMeter, ProductImage, QuantityStepper, productUrl } from "./components";
import { FREE_SHIPPING_THRESHOLD, Money, formatCzk } from "./format";
import { BagIcon, ChevronDownIcon, CloseIcon, HeartIcon, LeafIcon, MenuIcon, PinIcon, ReturnIcon, SearchIcon, ShieldIcon, TruckIcon, UserIcon } from "./icons";
import { Logo } from "./Logo";
import { Link, navigate, usePath } from "./router";

export function searchProducts(query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return products
    .map((product) => {
      const haystack = [product.title, product.brand, product.category, ...product.tags].join(" ").toLowerCase();
      const hits = terms.filter((term) => haystack.includes(term)).length;
      return { product, score: hits === terms.length ? hits * 10 + product.popularityScore / 10 + (product.title.toLowerCase().includes(terms[0]) ? 5 : 0) : 0 };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.product);
}

const categoryCounts = Object.fromEntries(categories.map((category) => [category.name, products.filter((product) => product.category === category.name).length]));

function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => event.key === "Escape" && onEscape();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, onEscape]);
}

export function AnnouncementBar() {
  return (
    <div className="announcement">
      <div className="announcement-inner">
        <p>
          <TruckIcon size={16} /> Free shipping over {formatCzk(FREE_SHIPPING_THRESHOLD)} · free gift over CZK 1,200 · orders before 2 pm ship today
        </p>
        <nav aria-label="Utility">
          <Link to="/playbooks">Playbooks</Link>
          <Link to="/demo-control">Presenter tools</Link>
        </nav>
      </div>
    </div>
  );
}

function HeaderSearch({ onDone, autoFocus = false }: { onDone?: () => void; autoFocus?: boolean }) {
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapper = useRef<HTMLFormElement>(null);
  const suggestions = useMemo(() => searchProducts(query).slice(0, 6), [query]);
  const matchingCategories = useMemo(() => (query.trim().length > 1 ? categories.filter((category) => category.name.toLowerCase().includes(query.toLowerCase().trim())).slice(0, 3) : []), [query]);

  useEffect(() => {
    const close = (event: MouseEvent) => !wrapper.current?.contains(event.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    onDone?.();
    navigate(to);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (active >= 0 && suggestions[active]) {
      selectSuggestion(active);
      return;
    }
    if (!query.trim()) return;
    go(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const selectSuggestion = (index: number) => {
    const product = suggestions[index];
    trackEvent("search_result_clicked", { search_query: query, product_id: product.id, product_name: product.title, category: product.category, price: product.price, source: "header_suggestions" });
    go(productUrl(product));
  };

  const showPanel = open && query.trim().length > 0;

  return (
    <form className="header-search" role="search" onSubmit={submit} ref={wrapper}>
      <SearchIcon size={18} className="header-search-icon" />
      <input
        type="search"
        value={query}
        autoFocus={autoFocus}
        placeholder="Search magnesium, vitamin D, probiotics…"
        aria-label="Search products"
        aria-expanded={showPanel}
        aria-controls="search-suggestions"
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => Math.min(suggestions.length - 1, index + 1));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(-1, index - 1));
          }
          if (event.key === "Escape") setOpen(false);
        }}
      />
      {showPanel && (
        <div className="search-panel" id="search-suggestions" role="listbox">
          {matchingCategories.length > 0 && (
            <div className="search-panel-cats">
              {matchingCategories.map((category) => (
                <button type="button" key={category.slug} onClick={() => go(`/category/${category.slug}`)}>
                  {category.name}
                </button>
              ))}
            </div>
          )}
          {suggestions.length === 0 ? (
            <p className="search-panel-empty">No products match “{query}”. Try “sleep”, “omega” or “vegan”.</p>
          ) : (
            suggestions.map((product, index) => (
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={index === active ? "search-suggestion is-active" : "search-suggestion"}
                key={product.id}
                onMouseEnter={() => setActive(index)}
                onClick={() => selectSuggestion(index)}
              >
                <ProductImage product={product} size="thumb" />
                <span>
                  <small>{product.brand}</small>
                  <strong>{product.name}</strong>
                </span>
                <Money value={product.price} />
              </button>
            ))
          )}
          <button type="submit" className="search-panel-all">
            See all results for “{query}”
          </button>
        </div>
      )}
    </form>
  );
}

function MegaMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="mega" role="region" aria-label="Shop categories">
      <div className="mega-inner">
        <div className="mega-col mega-cats">
          <h3>Shop by category</h3>
          <ul>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link to={`/category/${category.slug}`} onClick={onNavigate}>
                  <img src={category.image} alt="" loading="lazy" />
                  <span>
                    <strong>{category.name}</strong>
                    <small>{categoryCounts[category.name]} products</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="mega-col">
          <h3>Collections</h3>
          <ul className="mega-links">
            {collections.map((collection) => (
              <li key={collection.slug}>
                <Link to={`/collections/${collection.slug}`} onClick={onNavigate}>{collection.name}</Link>
              </li>
            ))}
            <li><Link to="/products" onClick={onNavigate}>All products</Link></li>
          </ul>
          <h3>Shop by goal</h3>
          <ul className="mega-links">
            {[["Better sleep", "sleep"], ["Stress & focus", "stress"], ["Immunity", "immunity"], ["Gut health", "gut"], ["Training & recovery", "recovery"]].map(([label, query]) => (
              <li key={query}><Link to={`/search?q=${query}`} onClick={onNavigate}>{label}</Link></li>
            ))}
          </ul>
        </div>
        <Link to="/collections/vitaly-select" className="mega-feature" onClick={onNavigate}>
          <img src="/assets/vitaly/story-natios_horcik.jpg" alt="VITALY Select Magnesium bisglycinate" loading="lazy" />
          <span>
            <small>Our own line</small>
            <strong>VITALY Select</strong>
            <em>29 clean formulas, from CZK 29</em>
          </span>
        </Link>
      </div>
    </div>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEscape(open, onClose);
  return (
    <div className={open ? "sheet sheet-left is-open" : "sheet sheet-left"} aria-hidden={!open}>
      <div className="sheet-backdrop" onClick={onClose} />
      <aside className="sheet-panel" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="sheet-head">
          <Logo />
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close menu"><CloseIcon /></button>
        </div>
        <nav className="mobile-nav" aria-label="Mobile">
          <h3>Categories</h3>
          {categories.map((category) => (
            <Link key={category.slug} to={`/category/${category.slug}`} onClick={onClose}>{category.name}</Link>
          ))}
          <h3>Collections</h3>
          {collections.map((collection) => (
            <Link key={collection.slug} to={`/collections/${collection.slug}`} onClick={onClose}>{collection.name}</Link>
          ))}
          <h3>Account</h3>
          <Link to="/account" onClick={onClose}>My account</Link>
          <Link to="/login" onClick={onClose}>Sign in</Link>
          <Link to="/demo-control" onClick={onClose}>Presenter tools</Link>
        </nav>
      </aside>
    </div>
  );
}

export function Header() {
  const { cart, wishlist, profile, setCartDrawerOpen } = useAppState();
  const path = usePath();
  const [pathname] = path.split("?");
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const count = cartItemCount(cart);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    setMegaOpen(false);
    setMobileSearch(false);
  }, [path]);
  useEscape(megaOpen, () => setMegaOpen(false));

  const navItems = [
    { to: "/collections/vitaly-select", label: "VITALY Select" },
    { to: "/collections/new", label: "New in" },
    { to: "/collections/bestsellers", label: "Bestsellers" },
    { to: "/collections/second-chance", label: "Second chance" },
  ];
  const hoverOpenedAt = useRef(0);
  const openMega = () => {
    window.clearTimeout(closeTimer.current);
    if (!megaOpen) hoverOpenedAt.current = Date.now();
    setMegaOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setMegaOpen(false), 140);
  };

  return (
    <header className={scrolled ? "site-header is-scrolled" : "site-header"}>
      <div className="header-main">
        <button type="button" className="icon-button header-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
          <MenuIcon />
        </button>
        <Link to="/" className="header-logo" aria-label="Vitaly home">
          <Logo />
        </Link>
        <div className="header-search-slot">
          <HeaderSearch />
        </div>
        <div className="header-actions">
          <button type="button" className="icon-button header-search-toggle" aria-label="Search" onClick={() => setMobileSearch((value) => !value)}>
            <SearchIcon />
          </button>
          <Link to={profile.customerType === "registered" ? "/account" : "/login"} className="header-action" aria-label="Account">
            <UserIcon />
            <span>{profile.firstName ?? "Sign in"}</span>
          </Link>
          <Link to="/account#favourites" className="header-action header-wish" aria-label={`Favourites, ${wishlist.length} items`}>
            <HeartIcon />
            {wishlist.length > 0 && <b className="count">{wishlist.length}</b>}
          </Link>
          <button type="button" className="header-action header-bag" onClick={() => setCartDrawerOpen(true)} aria-label={`Basket, ${count} items`}>
            <BagIcon />
            {count > 0 && <b className="count">{count}</b>}
          </button>
        </div>
      </div>
      {mobileSearch && (
        <div className="header-search-mobile">
          <HeaderSearch autoFocus onDone={() => setMobileSearch(false)} />
        </div>
      )}
      <nav className="header-nav" aria-label="Primary">
        <div className="header-nav-inner" onMouseLeave={scheduleClose}>
          <button
            type="button"
            className={megaOpen ? "nav-shop is-open" : "nav-shop"}
            aria-expanded={megaOpen}
            onClick={() => {
              if (Date.now() - hoverOpenedAt.current < 500) return;
              setMegaOpen((value) => !value);
            }}
            onMouseEnter={openMega}
          >
            Shop all <ChevronDownIcon size={16} />
          </button>
          {categories.slice(0, 5).map((category) => (
            <Link key={category.slug} to={`/category/${category.slug}`} className={pathname === `/category/${category.slug}` ? "is-active" : ""} onMouseEnter={scheduleClose}>
              {category.name}
            </Link>
          ))}
          <span className="nav-divider" aria-hidden="true" />
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className={pathname === item.to ? "is-active nav-collection" : "nav-collection"} onMouseEnter={scheduleClose}>
              {item.label}
            </Link>
          ))}
          {megaOpen && (
            <div onMouseEnter={openMega}>
              <MegaMenu onNavigate={() => setMegaOpen(false)} />
            </div>
          )}
        </div>
      </nav>
      {megaOpen && <div className="mega-scrim" onClick={() => setMegaOpen(false)} />}
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}

export function CartDrawer() {
  const { cart, cartDrawerOpen, setCartDrawerOpen, setQuantity, removeFromCart } = useAppState();
  const enriched = enrichCartItems(cart);
  const subtotal = enriched.reduce((sum, { item, product }) => sum + item.quantity * product.price, 0);
  const close = () => setCartDrawerOpen(false);
  useEscape(cartDrawerOpen, close);
  useEffect(() => {
    document.body.classList.toggle("no-scroll", cartDrawerOpen);
  }, [cartDrawerOpen]);

  return (
    <div className={cartDrawerOpen ? "sheet sheet-right is-open" : "sheet sheet-right"} aria-hidden={!cartDrawerOpen}>
      <div className="sheet-backdrop" onClick={close} />
      <aside className="sheet-panel cart-drawer" role="dialog" aria-modal="true" aria-label="Basket">
        <div className="sheet-head">
          <h2>Your basket <span>({cartItemCount(cart)})</span></h2>
          <button type="button" className="icon-button" onClick={close} aria-label="Close basket"><CloseIcon /></button>
        </div>
        {enriched.length === 0 ? (
          <div className="drawer-empty">
            <BagIcon size={36} />
            <p>Your basket is empty.</p>
            <Link to="/collections/bestsellers" className="button button-primary" onClick={close}>Shop bestsellers</Link>
          </div>
        ) : (
          <>
            <FreeShippingMeter subtotal={subtotal} />
            <ul className="drawer-lines">
              {enriched.map(({ item, product }) => (
                <li key={product.id}>
                  <Link to={productUrl(product)} onClick={close}><ProductImage product={product} size="thumb" /></Link>
                  <div>
                    <small>{product.brand}</small>
                    <Link to={productUrl(product)} onClick={close} className="drawer-line-name">{product.name}</Link>
                    <div className="drawer-line-row">
                      <QuantityStepper value={item.quantity} min={0} label={`Quantity of ${product.name}`} onChange={(next) => setQuantity(product.id, next)} />
                      <Money value={product.price * item.quantity} />
                    </div>
                  </div>
                  <button type="button" className="icon-button drawer-remove" aria-label={`Remove ${product.name}`} onClick={() => removeFromCart(product.id)}><CloseIcon size={16} /></button>
                </li>
              ))}
            </ul>
            <div className="drawer-foot">
              <div className="drawer-total"><span>Subtotal</span><Money value={subtotal} /></div>
              <Link to="/checkout" className="button button-primary button-block" onClick={close}>Checkout</Link>
              <Link to="/cart" className="button button-ghost button-block" onClick={close}>View basket</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export function TrustStrip() {
  const items = [
    { icon: <TruckIcon />, title: "Ships today", body: "Order by 2 pm, weekdays and Saturdays" },
    { icon: <PinIcon />, title: "9,000+ pickup points", body: "Or courier delivery to your door" },
    { icon: <ReturnIcon />, title: "30-day returns", body: "Unopened products, no questions asked" },
    { icon: <ShieldIcon />, title: "Pharmacist advice", body: "Free consultation by chat or phone" },
  ];
  return (
    <section className="trust-strip" aria-label="Why shop with Vitaly">
      {items.map((item) => (
        <div key={item.title}>
          {item.icon}
          <span><strong>{item.title}</strong><small>{item.body}</small></span>
        </div>
      ))}
    </section>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo tone="light" />
          <p>Vitaly is a fictional health and wellness store built for Meiro CDP demos. Products and prices come from the Vitaly catalog; orders and payments are simulated.</p>
          <p className="footer-legal"><LeafIcon size={16} /> vitaly.example · Demo storefront</p>
        </div>
        <div>
          <h3>Shop</h3>
          {categories.slice(0, 6).map((category) => <Link key={category.slug} to={`/category/${category.slug}`}>{category.name}</Link>)}
        </div>
        <div>
          <h3>Collections</h3>
          {collections.map((collection) => <Link key={collection.slug} to={`/collections/${collection.slug}`}>{collection.name}</Link>)}
          <Link to="/products">All products</Link>
        </div>
        <div>
          <h3>Account</h3>
          <Link to="/register">Join Vitaly Club</Link>
          <Link to="/login">Sign in</Link>
          <Link to="/account">My account</Link>
          <Link to="/review">Write a review</Link>
        </div>
        <div>
          <h3>Demo</h3>
          <Link to="/demo-control">Presenter tools</Link>
          <Link to="/playbooks">Use-case playbooks</Link>
          <a href="/product-feed.xml">Product feed (XML)</a>
        </div>
      </div>
    </footer>
  );
}

export function ConsentBanner() {
  const { consent, setConsent } = useAppState();
  const [open, setOpen] = useState(() => {
    try {
      return !localStorage.getItem("esc_consent_seen");
    } catch {
      return true;
    }
  });
  const [draft, setDraft] = useState<ConsentState>(consent);
  const [customizing, setCustomizing] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("consent-visible", open);
    return () => document.body.classList.remove("consent-visible");
  }, [open]);

  const finish = (next: ConsentState) => {
    try {
      localStorage.setItem("esc_consent_seen", "true");
    } catch {
      /* storage unavailable: banner simply reappears next visit */
    }
    setConsent(next);
    setOpen(false);
  };

  if (!open) return null;
  const options = [
    { key: "analytics" as const, label: "Analytics", body: "Helps us understand how the store is used." },
    { key: "personalization" as const, label: "Personalisation", body: "Tailored recommendations and offers." },
    { key: "marketing" as const, label: "Marketing", body: "Relevant offers by email, push and ads." },
  ];
  return (
    <div className="consent" role="dialog" aria-label="Cookie preferences">
      <div className="consent-copy">
        <strong>We value your privacy</strong>
        <p>We use cookies to run the store, measure what works and personalise your visit. Necessary cookies are always on.</p>
      </div>
      {customizing && (
        <div className="consent-options">
          {options.map((option) => (
            <label key={option.key} className="toggle-row">
              <input type="checkbox" checked={draft[option.key]} onChange={(event) => setDraft({ ...draft, [option.key]: event.target.checked })} />
              <span><strong>{option.label}</strong><small>{option.body}</small></span>
            </label>
          ))}
        </div>
      )}
      <div className="consent-actions">
        {customizing ? (
          <>
            <button type="button" className="button button-ghost" onClick={() => setCustomizing(false)}>Back</button>
            <button type="button" className="button button-primary" onClick={() => finish({ ...draft, necessary: true })}>Save choices</button>
          </>
        ) : (
          <>
            <button type="button" className="button button-ghost" onClick={() => finish({ necessary: true, analytics: false, personalization: false, marketing: false })}>Essential only</button>
            <button type="button" className="button button-ghost" onClick={() => setCustomizing(true)}>Customise</button>
            <button type="button" className="button button-primary" onClick={() => finish({ necessary: true, analytics: true, personalization: true, marketing: true })}>Accept all</button>
          </>
        )}
      </div>
    </div>
  );
}
