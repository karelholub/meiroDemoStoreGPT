import type { MeiroSdkCall, TrackingEvent } from "../../types";
import type { TrackedEventName } from "./eventSchemas";
import { getMeiroConfigStatus, getMeiroEndpoint, getMeiroScriptUrl } from "./meiroConfig";

const enabled = import.meta.env.VITE_MEIRO_SDK_ENABLED !== "false";
const debug = import.meta.env.VITE_MEIRO_DEBUG !== "false";
let analyticsConsent = true;
let sdkInitialized = false;

type MptConsentValue = "granted" | "denied";
type MptCommand = "config" | "consent" | "event" | "set" | "get";

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
  analyticsConsent = consent.analytics;
  if (enabled) {
    initializeMeiroSdk();
    callMpt("consent", toMptConsent(consent));
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
    const { event_name: _eventName, ...mptPayload } = event;
    callMpt("set", {
      page_url: event.page_url,
      referrer: event.referrer,
    });
    callMpt("event", eventName, mptPayload);
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
