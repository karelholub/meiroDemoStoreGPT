import { useEffect, useState } from "react";
import { categories } from "../data/categories";
import { products } from "../data/products";
import { identifyUser, trackEvent } from "../integrations/meiro/meiroClient";
import { useAppState } from "../store/appState";
import { formatProfileDate } from "../utils/format";
import { findProductById, findProductByIdOrSlug, findProductsByIds } from "../utils/productLookup";
import { EmptyState, PersonalizationZone, ProductGrid, ProductImage } from "../ui/components";
import { Money } from "../ui/format";
import { CheckIcon, HeartIcon, LeafIcon, Stars } from "../ui/icons";
import { Link, navigate, useDocumentTitle } from "../ui/router";
import { LifecycleSlots } from "./lifecycle";

export function RegisterPage({ mode = "register" }: { mode?: "register" | "login" }) {
  const { updateProfile, setConsent } = useAppState();
  const isLogin = mode === "login";
  useDocumentTitle(isLogin ? "Sign in" : "Join Vitaly Club");
  const [form, setForm] = useState({ email: "", firstName: "", goal: "Better sleep", preferredCategory: categories[1].name, marketing: false, personalization: true });

  return (
    <main id="main" className="auth-page">
      <section className="auth-visual">
        <img src="/assets/lifestyle/club.jpg" alt="Woman doing a core workout at home in the morning light" />
        <div>
          <p className="kicker"><LeafIcon size={16} /> Vitaly Club</p>
          <h2>{isLogin ? "Welcome back" : "Join Vitaly Club, it's free"}</h2>
          <ul>
            <li><CheckIcon size={16} /> Free shipping from CZK 990</li>
            <li><CheckIcon size={16} /> Points on every order</li>
            <li><CheckIcon size={16} /> Early access to VITALY Select launches</li>
            <li><CheckIcon size={16} /> Refill reminders that fit your routine</li>
          </ul>
        </div>
      </section>
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          const profile = {
            email: form.email,
            firstName: form.firstName,
            currentLifeSituation: form.goal,
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
        }}
      >
        <h1>{isLogin ? "Sign in" : "Create your account"}</h1>
        <p className="muted">{isLogin ? "New to Vitaly? " : "Already a member? "}<Link to={isLogin ? "/register" : "/login"}>{isLogin ? "Create an account" : "Sign in"}</Link></p>
        <label className="field">
          <span>Email</span>
          <input required type="email" autoComplete="email" placeholder="mira@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label className="field">
          <span>First name</span>
          <input required autoComplete="given-name" placeholder="Mira" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
        </label>
        <div className="field-grid">
          <label className="field">
            <span>Your main goal</span>
            <select value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })}>
              {["Better sleep", "More energy", "Stress & focus", "Immunity", "Training & recovery", "Healthy skin"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Favourite category</span>
            <select value={form.preferredCategory} onChange={(event) => setForm({ ...form, preferredCategory: event.target.value })}>
              {categories.map((category) => <option key={category.slug}>{category.name}</option>)}
            </select>
          </label>
        </div>
        <label className="check-row">
          <input type="checkbox" checked={form.marketing} onChange={(event) => setForm({ ...form, marketing: event.target.checked })} />
          <span>Send me member offers and new launches by email and push</span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={form.personalization} onChange={(event) => setForm({ ...form, personalization: event.target.checked })} />
          <span>Personalise recommendations and offers for me</span>
        </label>
        <button className="button button-primary button-lg button-block">{isLogin ? "Sign in" : "Create account"}</button>
        <p className="muted small">Demo store: signing in sends a <code>login</code> or <code>sign_up</code> event and identifies the visitor in Meiro by email.</p>
      </form>
    </main>
  );
}

export function AccountPage() {
  const state = useAppState();
  const { profile, consent, recentlyViewed, wishlist } = state;
  const favourites = findProductsByIds(wishlist);
  useDocumentTitle("My account");
  const profileApiSummary =
    state.profileApiStatus.state === "loaded" ? `Loaded via ${state.profileApiStatus.identifierType}` : state.profileApiStatus.message ?? state.profileApiStatus.state.replaceAll("_", " ");

  useEffect(() => {
    if (window.location.hash === "#favourites") document.getElementById("favourites")?.scrollIntoView();
  }, []);

  return (
    <main id="main" className="account-page">
      <header className="account-head">
        <div>
          <p className="kicker">My account</p>
          <h1>{profile.firstName ? `Hello, ${profile.firstName}` : "Welcome to Vitaly"}</h1>
          <PersonalizationZone zoneId="account_lifecycle_banner" fallback="Sign in to see your orders, favourites and refill reminders." className="account-lifecycle" />
        </div>
        {profile.customerType !== "registered" && <Link to="/login" className="button button-primary">Sign in</Link>}
      </header>

      <div className="account-stats">
        <div><span>Member status</span><strong>{profile.vipTier ? `Club ${profile.vipTier}` : profile.customerType === "registered" ? "Member" : "Guest"}</strong></div>
        <div><span>Orders</span><strong>{profile.purchaseCount ?? profile.purchases.length}</strong></div>
        <div><span>Lifetime value</span><strong>{profile.lifetimeValue !== undefined ? <Money value={profile.lifetimeValue} /> : "–"}</strong></div>
        <div><span>Next refill</span><strong>{formatProfileDate(profile.predictedReorderDate) ?? "Not set"}</strong></div>
      </div>

      <LifecycleSlots compact />

      <section className="account-section" id="favourites">
        <h2><HeartIcon size={20} /> Favourites</h2>
        {favourites.length === 0 ? <p className="muted">Tap the heart on any product to save it here.</p> : <ProductGrid items={favourites} />}
      </section>

      <section className="account-section">
        <h2>Recently viewed</h2>
        {recentlyViewed.length === 0 ? (
          <EmptyState title="Nothing viewed yet" body="Products you look at appear here, even before you sign in. Meiro merges that anonymous history into your profile when you log in." action={{ label: "Browse products", to: "/products" }} />
        ) : (
          <ProductGrid items={findProductsByIds(recentlyViewed)} />
        )}
      </section>

      <section className="account-section account-data">
        <div>
          <h2>Profile data</h2>
          <p className="muted">What Vitaly knows about this visitor. Values come from the local session and, when available, the Meiro Profile API.</p>
          <dl className="spec-list">
            <div><dt>Email</dt><dd>{profile.email ?? "Unknown visitor"}</dd></div>
            <div><dt>Phone</dt><dd>{profile.phone ?? "Not known"}</dd></div>
            <div><dt>Lifecycle</dt><dd>{profile.lifecycleStage.replaceAll("_", " ")}</dd></div>
            <div><dt>Affinity</dt><dd>{profile.categoryAffinity ?? profile.preferredCategory ?? "Still emerging"}</dd></div>
            <div><dt>Last purchase</dt><dd>{findProductByIdOrSlug(profile.lastPurchasedSku)?.name ?? profile.lastPurchasedSku ?? profile.lastPurchasedCategory ?? "Not known"}</dd></div>
            <div><dt>Active basket</dt><dd>{profile.hasActiveCart ? "Yes" : profile.lastAbandonedCartValue ? `Abandoned ${profile.lastAbandonedCartValue} CZK` : "No profile signal"}</dd></div>
            <div><dt>Consents</dt><dd>{Object.entries(consent).filter(([, enabled]) => enabled).map(([key]) => key).join(", ")}</dd></div>
            <div><dt>Journeys</dt><dd>{profile.journeyMembership?.join(", ") || "None"}</dd></div>
            <div><dt>Profile API</dt><dd>{profileApiSummary}</dd></div>
          </dl>
        </div>
        <div className="profile-api-fields">
          <h3>Profile API attributes</h3>
          <div className="code-chips">
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
            ].map(([field, value]) => (
              <code key={String(field)} className={value !== undefined ? "is-filled" : ""}>{String(field)}{value !== undefined ? `: ${String(value)}` : ""}</code>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function ReviewPage() {
  const state = useAppState();
  const reviewedProduct = findProductByIdOrSlug(state.profile.lastPurchasedSku) ?? findProductsByIds(state.profile.purchases)[0] ?? findProductById("natima-3020") ?? products[0];
  const [submitted, setSubmitted] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const reviewLocked = Boolean(state.profile.hasLeftReview);
  const referralCode = state.profile.referralCode ?? "VITALY-FRIEND-15";
  const reviewTextLength = reviewText.trim().length;
  useDocumentTitle("Write a review");

  return (
    <main id="main" className="review-page">
      <section className="review-main">
        <p className="kicker">Your opinion matters</p>
        <h1>How do you like your order?</h1>
        <div className="review-product">
          <ProductImage product={reviewedProduct} size="thumb" />
          <div>
            <small>{reviewedProduct.brand}</small>
            <strong>{reviewedProduct.name}</strong>
            <span className="muted">{state.profile.deliveryStatus ? `Delivery: ${state.profile.deliveryStatus}` : reviewedProduct.category}</span>
          </div>
        </div>
        <form
          className="review-form"
          onSubmit={(event) => {
            event.preventDefault();
            trackEvent("review_submitted", {
              form_id: "post_purchase_review",
              product_id: reviewedProduct.id,
              product_name: reviewedProduct.title,
              product_category: reviewedProduct.category,
              rating,
              last_purchased_sku: state.profile.lastPurchasedSku,
              last_purchased_category: state.profile.lastPurchasedCategory,
              delivery_status: state.profile.deliveryStatus,
              repeat_buyer: state.profile.repeatBuyer,
              referral_code: referralCode,
              review_text_length: reviewTextLength,
            });
            setSubmitted(true);
          }}
        >
          <fieldset className="rating-input">
            <legend>Your rating</legend>
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className={value <= rating ? "is-on" : ""}>
                <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} disabled={reviewLocked || submitted} />
                <Stars rating={value <= rating ? 1 : 0} size={28} />
                <span className="visually-hidden">{value} stars</span>
              </label>
            ))}
          </fieldset>
          <label className="field">
            <span>Your review</span>
            <textarea disabled={reviewLocked || submitted} maxLength={420} name="review_text" onChange={(event) => setReviewText(event.target.value)} placeholder="What did you like? How long have you been using it?" required rows={5} value={reviewText} />
            <small className="field-meta"><span>Only the rating and length are sent as an event, not the text.</span><b>{reviewTextLength}/420</b></small>
          </label>
          <button className="button button-primary button-lg" disabled={reviewLocked || submitted}>{reviewLocked ? "Review already received" : submitted ? "Thank you for your review" : "Submit review"}</button>
        </form>
      </section>
      <aside className="referral">
        <p className="kicker">Share the love</p>
        <h2>{state.profile.repeatBuyer ? "A thank-you for loyal customers" : "Give 15 %, get 15 %"}</h2>
        <p>Share your code with friends. They get 15 % off their first order and you get a CZK 150 voucher.</p>
        <div className="referral-code">{referralCode}</div>
        <div className="code-chips">
          <code>delivery_status{state.profile.deliveryStatus ? `: ${state.profile.deliveryStatus}` : ""}</code>
          <code>repeat_buyer{state.profile.repeatBuyer !== undefined ? `: ${String(state.profile.repeatBuyer)}` : ""}</code>
          <code>has_left_review{state.profile.hasLeftReview !== undefined ? `: ${String(state.profile.hasLeftReview)}` : ""}</code>
        </div>
      </aside>
    </main>
  );
}
