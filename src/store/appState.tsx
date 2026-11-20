import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { personas } from "../data/personas";
import type { ProfileApiScenario } from "../data/profileApiScenarios";
import { setMeiroConsentState, setMeiroEventSink, setMeiroSdkCallSink, trackEvent } from "../integrations/meiro/meiroClient";
import { fetchMeiroProfile, getMeiroProfileApiStatus, getMptUserIdCookie, getProfileApiIdentifier } from "../integrations/meiro/meiroProfileApi";
import type { CartItem, ConsentState, CustomerProfile, MeiroSdkCall, PersonalizationDecision, ProfileApiStatus, TrackingEvent } from "../types";
import { cartItemCount, cartTotal, findProductById } from "../utils/productLookup";
import { loadLocal, saveLocal } from "../utils/storage";

const defaultConsent: ConsentState = {
  necessary: true,
  analytics: true,
  personalization: true,
  marketing: false,
};

const defaultProfile: CustomerProfile = {
  lifecycleStage: "new_visitor",
  customerType: "anonymous",
  recentlyViewedCategories: [],
  recommendedTags: [],
  purchases: [],
};

export type AppState = {
  cart: CartItem[];
  consent: ConsentState;
  profile: CustomerProfile;
  personaId: string;
  recentEvents: TrackingEvent[];
  meiroSdkCalls: MeiroSdkCall[];
  personalizationDecisions: PersonalizationDecision[];
  profileApiStatus: ProfileApiStatus;
  recentlyViewed: string[];
  wishlist: string[];
  watchdog: string[];
  lastOrderId?: string;
};

type AppContextValue = AppState & {
  setConsent: (consent: ConsentState) => void;
  addToCart: (productId: string, quantity?: number, options?: { openDrawer?: boolean }) => void;
  removeFromCart: (productId: string) => void;
  toggleWishlist: (productId: string) => void;
  requestBackInStock: (productId: string, email?: string) => void;
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  viewProduct: (productId: string) => void;
  setPersona: (personaId: string) => void;
  applyProfileApiScenario: (scenario: ProfileApiScenario) => void;
  updateProfile: (profile: Partial<CustomerProfile>) => void;
  completeOrder: () => string;
  recordPersonalizationDecision: (decision: PersonalizationDecision) => void;
  clearDebugHistory: () => void;
};

/** Profiles saved before the Profile API fix may hold vip_tier placeholders such as "none". */
function withoutPlaceholderTier(profile: CustomerProfile): CustomerProfile {
  if (profile.vipTier && /^(none|no[ _-]?purchase|n\/a|null|-)$/i.test(String(profile.vipTier).trim())) {
    const { vipTier: _drop, ...rest } = profile;
    return rest as CustomerProfile;
  }
  return profile;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => loadLocal("esc_cart", []));
  const [consent, setConsentState] = useState<ConsentState>(() => loadLocal("esc_consent", defaultConsent));
  const [profile, setProfile] = useState<CustomerProfile>(() => withoutPlaceholderTier(loadLocal("esc_profile", defaultProfile)));
  const [personaId, setPersonaId] = useState(() => loadLocal("esc_persona", "anonymous_new"));
  const [recentEvents, setRecentEvents] = useState<TrackingEvent[]>(() => loadLocal("esc_events", []));
  const [meiroSdkCalls, setMeiroSdkCalls] = useState<MeiroSdkCall[]>(() => loadLocal("esc_meiro_sdk_calls", []));
  const [personalizationDecisions, setPersonalizationDecisions] = useState<PersonalizationDecision[]>(() => loadLocal("esc_personalization_decisions", []));
  const [profileApiStatus, setProfileApiStatus] = useState<ProfileApiStatus>({ state: "idle" });
  const [mptUserId, setMptUserId] = useState(() => getMptUserIdCookie());
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => loadLocal("esc_recently_viewed", []));
  const [wishlist, setWishlist] = useState<string[]>(() => loadLocal("esc_wishlist", []));
  const [watchdog, setWatchdog] = useState<string[]>(() => loadLocal("esc_watchdog", []));
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | undefined>(() => loadLocal("esc_last_order", undefined));

  useEffect(() => saveLocal("esc_cart", cart), [cart]);
  useEffect(() => saveLocal("esc_consent", consent), [consent]);
  useEffect(() => saveLocal("esc_profile", profile), [profile]);
  useEffect(() => saveLocal("esc_persona", personaId), [personaId]);
  useEffect(() => saveLocal("esc_events", recentEvents), [recentEvents]);
  useEffect(() => saveLocal("esc_meiro_sdk_calls", meiroSdkCalls), [meiroSdkCalls]);
  useEffect(() => saveLocal("esc_personalization_decisions", personalizationDecisions), [personalizationDecisions]);
  useEffect(() => saveLocal("esc_recently_viewed", recentlyViewed), [recentlyViewed]);
  useEffect(() => saveLocal("esc_last_order", lastOrderId), [lastOrderId]);
  useEffect(() => saveLocal("esc_wishlist", wishlist), [wishlist]);
  useEffect(() => saveLocal("esc_watchdog", watchdog), [watchdog]);

  useEffect(() => {
    setMeiroEventSink((event) => setRecentEvents((events) => [event, ...events].slice(0, 30)));
    setMeiroSdkCallSink((call) => setMeiroSdkCalls((calls) => [call, ...calls].slice(0, 30)));
  }, []);

  useEffect(() => setMeiroConsentState(consent), [consent]);

  useEffect(() => {
    const refreshMptUserId = () => {
      const next = getMptUserIdCookie();
      setMptUserId((current) => (current === next ? current : next));
    };

    refreshMptUserId();
    const interval = window.setInterval(refreshMptUserId, 1500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const config = getMeiroProfileApiStatus();
    const identifier = getProfileApiIdentifier(profile, mptUserId);
    let cancelled = false;

    if (!consent.personalization) {
      setProfileApiStatus({ state: "disabled", message: "Personalization consent is off." });
      return;
    }

    if (!config.enabled) {
      setProfileApiStatus({ state: "disabled", message: "Profile API is disabled." });
      return;
    }

    if (personaId.startsWith("profile_api:")) {
      setProfileApiStatus({
        state: "loaded",
        identifierType: "scenario",
        identifierValue: personaId.replace("profile_api:", ""),
        updatedAt: profile.profileApiUpdatedAt ?? new Date().toISOString(),
      });
      return;
    }

    if (!identifier) {
      setProfileApiStatus({ state: "idle", message: "Waiting for an email, phone, or supported identifier." });
      return;
    }

    setProfileApiStatus({ state: "loading", identifierType: identifier.identifierType, identifierValue: identifier.identifierValue });

    fetchMeiroProfile(identifier.identifierType, identifier.identifierValue)
      .then((result) => {
        if (cancelled) return;
        if (Object.keys(result.attributes).length === 0) {
          setProfileApiStatus({
            state: "empty",
            identifierType: identifier.identifierType,
            identifierValue: identifier.identifierValue,
            updatedAt: new Date().toISOString(),
          });
          return;
        }

        setProfile((current) => ({ ...current, ...result.profilePatch }));
        setProfileApiStatus({
          state: "loaded",
          identifierType: identifier.identifierType,
          identifierValue: identifier.identifierValue,
          updatedAt: new Date().toISOString(),
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setProfileApiStatus({
          state: "error",
          identifierType: identifier.identifierType,
          identifierValue: identifier.identifierValue,
          message: error instanceof Error ? error.message : "Profile API request failed.",
          updatedAt: new Date().toISOString(),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [consent.personalization, personaId, profile.email, profile.phone, mptUserId]);

  const setConsent = (next: ConsentState) => {
    setConsentState(next);
    trackEvent("consent_updated", { consent: next });
  };

  const addToCart = (productId: string, quantity = 1, options: { openDrawer?: boolean } = {}) => {
    const product = findProductById(productId);
    if (!product) return;
    const items = cart;
    const exists = items.find((item) => item.productId === productId);
    const next = exists
      ? items.map((item) => (item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item))
      : [...items, { productId, quantity, cartOpener: items.length === 0 }];
    setCart(next);
    trackEvent("product_added_to_cart", {
      product_id: product.id,
      product_name: product.title,
      brand: product.brand,
      category: product.category,
      price: product.price,
      quantity,
      currency: "CZK",
      cart_value: cartTotal(next),
      cart_size: cartItemCount(next),
      cart_opener: next.find((item) => item.cartOpener)?.productId,
    });
    if (options.openDrawer !== false) setCartDrawerOpen(true);
  };

  const toggleWishlist = (productId: string) => {
    const product = findProductById(productId);
    if (!product) return;
    const adding = !wishlist.includes(productId);
    setWishlist((items) => (adding ? [productId, ...items] : items.filter((item) => item !== productId)));
    if (adding) {
      trackEvent("wishlist_added", {
        product_id: product.id,
        product_name: product.title,
        brand: product.brand,
        category: product.category,
        price: product.price,
        currency: "CZK",
        value: product.price,
      });
    }
  };

  const requestBackInStock = (productId: string, email?: string) => {
    const product = findProductById(productId);
    if (!product) return;
    setWatchdog((items) => (items.includes(productId) ? items : [productId, ...items]));
    trackEvent("back_in_stock_requested", {
      form_id: product.stockStatus === "preorder" ? "launch_notify" : "watchdog_back_in_stock",
      email: email || profile.email,
      product_id: product.id,
      product_name: product.title,
      brand: product.brand,
      category: product.category,
      price: product.price,
    });
  };

  const removeFromCart = (productId: string) => {
    const product = findProductById(productId);
    setCart((items) => items.filter((item) => item.productId !== productId));
    if (product) trackEvent("product_removed_from_cart", { product_id: product.id, product_name: product.title, brand: product.brand, category: product.category, price: product.price, quantity: cart.find((item) => item.productId === productId)?.quantity ?? 1, currency: "CZK" });
  };

  const setQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return removeFromCart(productId);
    setCart((items) => items.map((item) => (item.productId === productId ? { ...item, quantity } : item)));
  };

  const clearCart = () => setCart([]);

  const viewProduct = (productId: string) => {
    const product = findProductById(productId);
    if (!product) return;
    setRecentlyViewed((items) => [productId, ...items.filter((item) => item !== productId)].slice(0, 8));
    setProfile((current) => ({
      ...current,
      recentlyViewedCategories: [product.category, ...current.recentlyViewedCategories].slice(0, 8),
    }));
  };

  const setPersona = (nextPersonaId: string) => {
    const persona = personas.find((item) => item.id === nextPersonaId);
    if (!persona) return;
    setPersonaId(nextPersonaId);
    setProfile({ ...defaultProfile, ...persona.profilePatch });
    if (persona.consentPatch) setConsentState((current) => ({ ...current, ...persona.consentPatch, necessary: true }));
  };

  const applyProfileApiScenario = (scenario: ProfileApiScenario) => {
    setPersonaId(`profile_api:${scenario.id}`);
    setConsentState((current) => ({ ...current, necessary: true, analytics: true, personalization: true }));
    setProfile({
      ...defaultProfile,
      ...scenario.profilePatch,
      profileApiUpdatedAt: new Date().toISOString(),
      profileApiAttributes: scenario.profilePatch.profileApiAttributes ?? {},
    });
    setProfileApiStatus({
      state: "loaded",
      identifierType: "scenario",
      identifierValue: scenario.id,
      updatedAt: new Date().toISOString(),
    });
    trackEvent("profile_updated", {
      source: "profile_api_scenario",
      scenario_id: scenario.id,
      profile_patch: scenario.profilePatch,
    });
  };

  const updateProfile = (patch: Partial<CustomerProfile>) => {
    setProfile((current) => ({ ...current, ...patch }));
    trackEvent("profile_updated", { profile_patch: patch });
  };

  const completeOrder = () => {
    const orderId = `VIT-${100001 + Math.floor(Math.random() * 899999)}`;
    setLastOrderId(orderId);
    setProfile((current) => ({ ...current, lifecycleStage: "post_purchase", purchases: [...current.purchases, ...cart.map((item) => item.productId)] }));
    setCart([]);
    return orderId;
  };

  const recordPersonalizationDecision = (decision: PersonalizationDecision) => {
    setPersonalizationDecisions((decisions) => {
      const withoutSameZone = decisions.filter((item) => item.zoneId !== decision.zoneId);
      return [decision, ...withoutSameZone].slice(0, 20);
    });
  };

  const clearDebugHistory = () => {
    setRecentEvents([]);
    setMeiroSdkCalls([]);
    setPersonalizationDecisions([]);
  };

  const value = useMemo(
    () => ({
      cart,
      consent,
      profile,
      personaId,
      recentEvents,
      meiroSdkCalls,
      personalizationDecisions,
      profileApiStatus,
      recentlyViewed,
      wishlist,
      watchdog,
      cartDrawerOpen,
      setCartDrawerOpen,
      toggleWishlist,
      requestBackInStock,
      lastOrderId,
      setConsent,
      addToCart,
      removeFromCart,
      setQuantity,
      clearCart,
      viewProduct,
      setPersona,
      applyProfileApiScenario,
      updateProfile,
      completeOrder,
      recordPersonalizationDecision,
      clearDebugHistory,
    }),
    [cart, consent, profile, personaId, recentEvents, meiroSdkCalls, personalizationDecisions, profileApiStatus, recentlyViewed, wishlist, watchdog, cartDrawerOpen, lastOrderId],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}
