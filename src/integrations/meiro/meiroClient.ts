import type { MeiroSdkCall, TrackingEvent } from "../../types";
import type { TrackedEventName } from "./eventSchemas";
import { getMeiroConfigStatus, getMeiroEndpoint, getMeiroScriptUrl } from "./meiroConfig";

const enabled = import.meta.env.VITE_MEIRO_SDK_ENABLED !== "false";
const debug = import.meta.env.VITE_MEIRO_DEBUG !== "false";
let analyticsConsent = true;
let sdkInitialized = false;
let currentConsent = {
  analytics: true,
  personalization: true,
  marketing: false,
};

type MptConsentValue = "granted" | "denied";
type MptCommand = "config" | "consent" | "event" | "set" | "get";
type MptEventName =
  | "add_payment_info"
  | "add_shipping_info"
  | "add_to_cart"
  | "add_to_wishlist"
  | "begin_checkout"
  | "click"
  | "file_download"
  | "first_visit"
  | "form_start"
  | "form_submit"
  | "generate_lead"
  | "login"
  | "page_view"
  | "purchase"
  | "remove_from_cart"
  | "search"
  | "select_item"
  | "select_promotion"
  | "sign_up"
  | "view_cart"
  | "view_item"
  | "view_item_list"
  | "view_promotion"
  | "view_search_results";

const eventNameMap: Record<TrackedEventName, MptEventName | undefined> = {
  page_view: "page_view",
  product_view: "view_item",
  category_view: "view_item_list",
  product_list_view: "view_item_list",
  search_submitted: "search",
  search_result_clicked: "select_item",
  product_added_to_cart: "add_to_cart",
  product_removed_from_cart: "remove_from_cart",
  cart_view: "view_cart",
  checkout_started: "begin_checkout",
  checkout_contact_submitted: "begin_checkout",
  checkout_shipping_submitted: "add_shipping_info",
  checkout_payment_submitted: "add_payment_info",
  checkout_step_completed: "begin_checkout",
  order_completed: "purchase",
  newsletter_signup: "sign_up",
  user_registered: "sign_up",
  user_logged_in: "login",
  profile_updated: "generate_lead",
  recommendation_viewed: "view_item_list",
  recommendation_clicked: "select_item",
  personalization_viewed: "view_promotion",
  personalization_clicked: "select_promotion",
  review_submitted: "form_submit",
  consent_updated: undefined,
};

declare global {
  interface Window {
    mpt?: {
      (...args: unknown[]): void;
      q?: unknown[][];
    };
  }
}

type EventSink = (event: TrackingEvent) => void;
let eventSink: EventSink | undefined;
type SdkCallSink = (call: MeiroSdkCall) => void;
let sdkCallSink: SdkCallSink | undefined;
let pendingSdkCalls: MeiroSdkCall[] = [];

function recordSdkCall(command: MptCommand, label: string, payload?: unknown) {
  const call = {
    command,
    label,
    payload,
    timestamp: new Date().toISOString(),
  };

  if (sdkCallSink) {
    sdkCallSink(call);
  } else {
    pendingSdkCalls = [call, ...pendingSdkCalls].slice(0, 30);
  }
}

function sdkCallLabel(command: MptCommand, args: unknown[]) {
  if (command === "event") return String(args[0] ?? "event");
  if (command === "set") return "shared fields";
  if (command === "consent") return "consent state";
  if (command === "config") return "sdk config";
  return String(args[0] ?? command);
}

function getMpt() {
  window.mpt =
    window.mpt ||
    function mptQueue() {
      (window.mpt!.q = window.mpt!.q || []).push(Array.prototype.slice.call(arguments));
    };

  return window.mpt;
}

function callMpt(command: MptCommand, ...args: unknown[]) {
  recordSdkCall(command, sdkCallLabel(command, args), args[1] ?? args[0]);
  getMpt()(command, ...args);
}

function getMptEventName(eventName: TrackedEventName) {
  return eventNameMap[eventName];
}

function withoutEmptyValues(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function sdkContextPayload() {
  return withoutEmptyValues({
    page_title: document.title,
    url: window.location.href,
    referrer: document.referrer,
  });
}

function nestedRecord(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function checkoutSharedPayload(payload: Record<string, unknown>) {
  const contact = nestedRecord(payload, "contact");
  const shipping = nestedRecord(payload, "shipping");
  const payment = nestedRecord(payload, "payment");

  return withoutEmptyValues({
    checkout_contact_email: contact.email,
    checkout_contact_phone: contact.phone,
    checkout_contact_first_name: contact.first_name,
    checkout_contact_surname: contact.surname,
    shipping_street_address: shipping.street_address,
    shipping_apartment_or_company: shipping.apartment_or_company,
    shipping_city: shipping.city,
    shipping_postal_code: shipping.postal_code,
    shipping_country: shipping.country,
    shipping_speed: shipping.shipping_speed,
    payment_method: payment.payment_method,
  });
}

function toSdkItem(payload: Record<string, unknown>) {
  return withoutEmptyValues({
    item_id: payload.product_id,
    item_name: payload.product_name,
    item_category: payload.category,
    price: payload.price,
    quantity: payload.quantity,
  });
}

function toSdkItems(payload: Record<string, unknown>) {
  if (Array.isArray(payload.items)) {
    return payload.items
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      .map(toSdkItem);
  }

  if (payload.product_id || payload.product_name) {
    return [toSdkItem(payload)];
  }

  return undefined;
}

function buildMptEventPayload(mptEventName: MptEventName, payload: Record<string, unknown>) {
  const items = toSdkItems(payload);
  const value = payload.total_value ?? payload.cart_value ?? payload.value ?? payload.price;
  const base = sdkContextPayload();

  if (mptEventName === "page_view") return base;

  if (mptEventName === "search") {
    return withoutEmptyValues({
      ...base,
      search_term: payload.search_query,
      result_count: payload.result_count,
    });
  }

  if (mptEventName === "login" || mptEventName === "sign_up") {
    return withoutEmptyValues({
      ...base,
      email: payload.email,
      email_domain: payload.email_domain,
      method: payload.method ?? "demo_store",
    });
  }

  if (mptEventName === "purchase") {
    return withoutEmptyValues({
      ...base,
      transaction_id: payload.order_id,
      email: payload.email,
      phone: payload.phone,
      currency: payload.currency ?? "EUR",
      value,
      items,
    });
  }

  if (mptEventName === "add_shipping_info") {
    const shipping = nestedRecord(payload, "shipping");
    return withoutEmptyValues({
      ...base,
      currency: payload.currency ?? "EUR",
      value,
      items,
      shipping_tier: shipping.shipping_speed,
    });
  }

  if (mptEventName === "add_payment_info") {
    const payment = nestedRecord(payload, "payment");
    return withoutEmptyValues({
      ...base,
      currency: payload.currency ?? "EUR",
      value,
      items,
      payment_type: payment.payment_method,
    });
  }

  if (mptEventName === "view_cart" || mptEventName === "begin_checkout" || mptEventName === "add_to_cart" || mptEventName === "remove_from_cart") {
    return withoutEmptyValues({
      ...base,
      currency: payload.currency ?? "EUR",
      value,
      items,
    });
  }

  if (mptEventName === "view_item" || mptEventName === "select_item" || mptEventName === "view_item_list") {
    return withoutEmptyValues({
      ...base,
      item_list_name: payload.category ?? payload.source ?? payload.strategy,
      items,
    });
  }

  if (mptEventName === "view_promotion" || mptEventName === "select_promotion") {
    return withoutEmptyValues({
      ...base,
      promotion_id: payload.zone_id ?? payload.rule_id,
      promotion_name: payload.decision ?? payload.strategy,
    });
  }

  return base;
}

function loadMptScript() {
  const scriptUrl = getMeiroScriptUrl();
  const existing = document.querySelector<HTMLScriptElement>(`script[data-meiro-mpt="true"]`);
  if (existing) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = scriptUrl;
  script.dataset.meiroMpt = "true";
  document.head.appendChild(script);
}

function initializeMeiroSdk() {
  if (!enabled || sdkInitialized) return;
  sdkInitialized = true;

  callMpt("config", {
    collection_endpoint: getMeiroEndpoint(),
    link_tracking: { enabled: true },
    tracking_rules: {
      enabled: true,
      storage_allowlist: {
        local_storage: ["esc_consent", "esc_persona", "esc_profile"],
        session_storage: ["checkout_step"],
      },
    },
  });

  callMpt("consent", toMptConsent(currentConsent));
  loadMptScript();

  if (debug) {
    console.info("[Meiro Demo SDK Config]", getMeiroConfigStatus());
  }
}

function consentValue(granted: boolean): MptConsentValue {
  return granted ? "granted" : "denied";
}

function toMptConsent(consent: { analytics: boolean; marketing?: boolean; personalization?: boolean }) {
  const analyticsOrMarketing = consent.analytics || Boolean(consent.marketing);
  return {
    storage_persistence: consentValue(analyticsOrMarketing),
    user_id: consentValue(consent.analytics || Boolean(consent.personalization)),
    session_id: consentValue(analyticsOrMarketing),
  };
}

export function setMeiroEventSink(sink: EventSink) {
  eventSink = sink;
}

export function setMeiroSdkCallSink(sink: SdkCallSink) {
  sdkCallSink = sink;
  pendingSdkCalls.reverse().forEach((call) => sdkCallSink?.(call));
  pendingSdkCalls = [];
}

export function setMeiroConsentState(consent: { analytics: boolean; marketing?: boolean; personalization?: boolean }) {
  currentConsent = {
    analytics: consent.analytics,
    personalization: Boolean(consent.personalization),
    marketing: Boolean(consent.marketing),
  };
  analyticsConsent = consent.analytics;
  if (enabled) {
    initializeMeiroSdk();
    callMpt("consent", toMptConsent(currentConsent));
  }
}

export function trackEvent(eventName: TrackedEventName, payload: Record<string, unknown> = {}) {
  if (!analyticsConsent && eventName !== "consent_updated") {
    if (debug) {
      console.info("[Meiro Demo Event Suppressed]", eventName, {
        reason: "analytics_consent_disabled",
        timestamp: new Date().toISOString(),
      });
    }
    return;
  }

  const event: TrackingEvent = {
    event_name: eventName,
    timestamp: new Date().toISOString(),
    page_url: window.location.href,
    referrer: document.referrer,
    ...payload,
  };

  eventSink?.(event);

  if (!enabled || debug) {
    console.info("[Meiro Demo Event]", eventName, event);
  }

  if (enabled) {
    initializeMeiroSdk();
    const mptEventName = getMptEventName(eventName);
    if (!mptEventName) {
      if (debug) {
        console.info("[Meiro Demo Event Not Forwarded]", eventName, {
          reason: "no_supported_mpt_event_name",
          timestamp: event.timestamp,
        });
      }
      return;
    }

    callMpt("set", { ...sdkContextPayload(), ...checkoutSharedPayload(payload) });
    callMpt("event", mptEventName, buildMptEventPayload(mptEventName, payload));
  }
}

export function identifyUser(userPayload: Record<string, unknown>) {
  if (enabled) {
    initializeMeiroSdk();
    callMpt("set", userPayload);
  }

  if (!enabled || debug) {
    console.info("[Meiro Demo Identify]", userPayload);
  }
}

export function trackPageView(payload: Record<string, unknown>) {
  trackEvent("page_view", payload);
}
