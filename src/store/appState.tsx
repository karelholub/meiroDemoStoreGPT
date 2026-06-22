import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { products } from "../data/products";
import { personas } from "../data/personas";
import { setMeiroConsentState, setMeiroEventSink, setMeiroSdkCallSink, trackEvent } from "../integrations/meiro/meiroClient";
import { fetchMeiroProfile, getMeiroProfileApiStatus, getProfileApiIdentifier } from "../integrations/meiro/meiroProfileApi";
import type { CartItem, ConsentState, CustomerProfile, MeiroSdkCall, PersonalizationDecision, ProfileApiStatus, TrackingEvent } from "../types";
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
  lastOrderId?: string;
};

type AppContextValue = AppState & {
  setConsent: (consent: ConsentState) => void;
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  viewProduct: (productId: string) => void;
  setPersona: (personaId: string) => void;
  updateProfile: (profile: Partial<CustomerProfile>) => void;
  completeOrder: () => string;
  recordPersonalizationDecision: (decision: PersonalizationDecision) => void;
  clearDebugHistory: () => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => loadLocal("esc_cart", []));
  const [consent, setConsentState] = useState<ConsentState>(() => loadLocal("esc_consent", defaultConsent));
  const [profile, setProfile] = useState<CustomerProfile>(() => loadLocal("esc_profile", defaultProfile));
  const [personaId, setPersonaId] = useState(() => loadLocal("esc_persona", "anonymous_new"));
  const [recentEvents, setRecentEvents] = useState<TrackingEvent[]>(() => loadLocal("esc_events", []));
  const [meiroSdkCalls, setMeiroSdkCalls] = useState<MeiroSdkCall[]>(() => loadLocal("esc_meiro_sdk_calls", []));
  const [personalizationDecisions, setPersonalizationDecisions] = useState<PersonalizationDecision[]>(() => loadLocal("esc_personalization_decisions", []));
  const [profileApiStatus, setProfileApiStatus] = useState<ProfileApiStatus>({ state: "idle" });
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => loadLocal("esc_recently_viewed", []));
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

  useEffect(() => {
    setMeiroEventSink((event) => setRecentEvents((events) => [event, ...events].slice(0, 30)));
    setMeiroSdkCallSink((call) => setMeiroSdkCalls((calls) => [call, ...calls].slice(0, 30)));
  }, []);

  useEffect(() => setMeiroConsentState(consent), [consent]);

  useEffect(() => {
    const config = getMeiroProfileApiStatus();
    const identifier = getProfileApiIdentifier(profile);
    let cancelled = false;

    if (!consent.personalization) {
      setProfileApiStatus({ state: "disabled", message: "Personalization consent is off." });
      return;
    }

    if (!config.enabled) {
      setProfileApiStatus({ state: "disabled", message: "Profile API is disabled." });
      return;
    }

    if (!config.hasToken) {
      setProfileApiStatus({ state: "missing_token", message: "Set VITE_MEIRO_PROFILE_API_TOKEN to hydrate profile attributes." });
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
  }, [consent.personalization, profile.email, profile.phone]);

  const setConsent = (next: ConsentState) => {
    setConsentState(next);
    trackEvent("consent_updated", { consent: next });
  };

  const addToCart = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setCart((items) => {
      const exists = items.find((item) => item.productId === productId);
      const next = exists
        ? items.map((item) => (item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item))
        : [...items, { productId, quantity: 1, cartOpener: items.length === 0 }];
      const total = next.reduce((sum, item) => sum + item.quantity * (products.find((p) => p.id === item.productId)?.price ?? 0), 0);
      trackEvent("product_added_to_cart", {
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        price: product.price,
        quantity: 1,
        cart_value: total,
        cart_size: next.reduce((sum, item) => sum + item.quantity, 0),
        cart_opener: next.find((item) => item.cartOpener)?.productId,
      });
      return next;
    });
  };

  const removeFromCart = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    setCart((items) => items.filter((item) => item.productId !== productId));
    if (product) trackEvent("product_removed_from_cart", { product_id: product.id, product_name: product.name });
  };

  const setQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return removeFromCart(productId);
    setCart((items) => items.map((item) => (item.productId === productId ? { ...item, quantity } : item)));
  };

  const clearCart = () => setCart([]);

  const viewProduct = (productId: string) => {
    const product = products.find((item) => item.id === productId);
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

  const updateProfile = (patch: Partial<CustomerProfile>) => {
    setProfile((current) => ({ ...current, ...patch }));
    trackEvent("profile_updated", { profile_patch: patch });
  };

  const completeOrder = () => {
    const orderId = `ESC-${100001 + Math.floor(Math.random() * 899999)}`;
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
      lastOrderId,
      setConsent,
      addToCart,
      removeFromCart,
      setQuantity,
      clearCart,
      viewProduct,
      setPersona,
      updateProfile,
      completeOrder,
      recordPersonalizationDecision,
      clearDebugHistory,
    }),
    [cart, consent, profile, personaId, recentEvents, meiroSdkCalls, personalizationDecisions, profileApiStatus, recentlyViewed, lastOrderId],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}
