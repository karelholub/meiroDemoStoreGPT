import { useEffect } from "react";
import { trackPageView } from "./integrations/meiro/meiroClient";
import { AppStateProvider } from "./store/appState";
import { findProductByIdOrSlug } from "./utils/productLookup";
import { AccountPage, RegisterPage, ReviewPage } from "./pages/account";
import { DebugPanel, DemoControlPage, PlaybooksPage } from "./pages/demo";
import { CartPage, CheckoutPage, HomePage, ListingPage, NotFound, ProductPage, SearchPage, ThankYouPage } from "./pages/storefront";
import { AnnouncementBar, CartDrawer, ConsentBanner, Footer, Header } from "./ui/layout";
import { usePath } from "./ui/router";

/**
 * Route table. Czech aliases (/kosik, /objednavka) are kept because the Vitaly
 * web banners on meiro-demo target those paths (free-shipping banner on
 * `/kosik`, A01 cart banner excluded on `/kosik|/objednavka`). Product URLs
 * also resolve at the root (`/<catalog-slug>/`) so catalog `link` values that
 * point at vitaly.example/<slug>/ map 1:1 onto this storefront.
 */
function Router() {
  const path = usePath();
  useEffect(() => trackPageView({ path }), [path]);

  const pathname = path.split("?")[0].replace(/\/+$/, "") || "/";
  if (pathname === "/") return <HomePage />;
  if (pathname === "/products") return <ListingPage />;
  if (pathname.startsWith("/category/")) return <ListingPage categorySlug={pathname.slice("/category/".length)} />;
  if (pathname.startsWith("/collections/")) return <ListingPage collectionSlug={pathname.slice("/collections/".length)} />;
  if (pathname.startsWith("/product/")) return <ProductPage slug={decodeURIComponent(pathname.slice("/product/".length))} />;
  if (pathname === "/cart" || pathname === "/kosik") return <CartPage />;
  if (pathname === "/checkout" || pathname === "/objednavka") return <CheckoutPage />;
  if (pathname === "/register") return <RegisterPage />;
  if (pathname === "/login") return <RegisterPage mode="login" />;
  if (pathname === "/account") return <AccountPage />;
  if (pathname === "/search") return <SearchPage />;
  if (pathname === "/playbooks") return <PlaybooksPage />;
  if (pathname === "/demo-control") return <DemoControlPage />;
  if (pathname === "/review") return <ReviewPage />;
  if (pathname === "/thank-you") return <ThankYouPage />;
  const rootProduct = findProductByIdOrSlug(decodeURIComponent(pathname.slice(1)));
  if (rootProduct) return <ProductPage slug={rootProduct.slug} />;
  return <NotFound />;
}

export function App() {
  return (
    <AppStateProvider>
      <a href="#main" className="skip-link">Skip to content</a>
      <AnnouncementBar />
      <Header />
      <Router />
      <Footer />
      <CartDrawer />
      <ConsentBanner />
      {(import.meta.env.DEV || import.meta.env.VITE_DEMO_DEBUG_ENABLED === "true") && <DebugPanel />}
    </AppStateProvider>
  );
}
