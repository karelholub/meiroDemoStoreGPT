import { useState } from "react";
import { personas } from "../data/personas";
import { profileApiScenarios } from "../data/profileApiScenarios";
import { getMeiroConfigStatus } from "../integrations/meiro/meiroConfig";
import { getMeiroProfileApiStatus } from "../integrations/meiro/meiroProfileApi";
import { useAppState } from "../store/appState";
import type { CustomerProfile } from "../types";
import { formatMaybeProfileDate, formatProfileDate } from "../utils/format";
import { Link } from "../ui/router";

/* Presenter tooling: demo control, playbooks, Profile API inspector and the floating event log. */

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
      <code className="playbook-trigger">{playbook.trigger}</code>
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
        <button type="button" className="button button-ghost" onClick={() => state.setPersona(playbook.personaId)}>Load scenario</button>
        <Link to={playbook.path} className="button button-primary">Open surface</Link>
      </div>
    </article>
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
      <p className="muted">Web push service worker: /mpt-service-worker.js. All SDK calls go through src/integrations/meiro.</p>
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

export function DemoControlPage() {
  const state = useAppState();
  const completedSignals = [
    state.recentlyViewed.length > 0,
    state.cart.length > 0,
    state.profile.customerType === "registered",
    state.profileApiStatus.state === "loaded",
    state.personaId !== "anonymous_new",
  ].filter(Boolean).length;
  return (
    <main className="page demo-control-page">
      <section className="demo-control-top">
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
            <Link to="/playbooks" className="button button-primary">Open playbooks</Link>
            <Link to="/account" className="button button-ghost">View hydrated account</Link>
          </div>
        </div>
        <DemoSignalStrip />
      </section>
      <section className="demo-control-workspace">
        <div className="demo-main-column">
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
          <ProfileApiScenarioControls />
        </div>
        <aside className="demo-side">
          <MeiroStatusCard />
          <PresenterChecklist />
          <section className="control-card">
            <h2>Use case coverage</h2>
            <p className="muted">Eight ecommerce playbooks have a visible web surface ready for Meiro journeys, catalog feeds, or Profile API attributes.</p>
            <Link to="/playbooks" className="text-link">Open playbooks</Link>
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
            <button type="button" className="button button-ghost" onClick={state.clearDebugHistory}>Clear event history</button>
          </section>
        </aside>
      </section>
      <ProfileApiInspector />
      <DebugPanel inline />
    </main>
  );
}

export function PlaybooksPage() {
  return (
    <main className="page">
      <div className="page-heading">
        <span className="eyebrow">Meiro ecommerce use cases</span>
        <h1>Eight playbooks, eight Vitaly surfaces.</h1>
        <p>Meiro handles audiences, catalog feeds, journeys and Profile API attributes. The Vitaly storefront provides the visible places where those decisions appear.</p>
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

export function DebugPanel({ inline = false }: { inline?: boolean }) {
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
