import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputPath = path.join(root, "data/meiro_profile_seed_1500.csv");
const rowCount = Number(process.env.PROFILE_SEED_ROWS || 1500);
const generatedAt = "2026-06-24T08:00:00.000Z";

const categories = [
  "Work & Meetings",
  "Parenting & Chaos",
  "Sleep & Recovery",
  "Existential Wellness",
  "Marketing Therapy",
  "Tiny Dopamine",
  "Gifts for People Who Say I'm Fine",
];

const productsByCategory = {
  "Work & Meetings": ["monday-survival-kit", "executive-decision-dice", "meeting-email-mug", "quarterly-planning-flask", "legacy-system-incense", "calendar-boundary-rope"],
  "Parenting & Chaos": ["parenting-chaos-first-aid", "bedtime-negotiation-toolkit", "school-morning-calculator", "fake-calm-spray", "snack-diplomacy-kit", "tiny-sock-locator"],
  "Sleep & Recovery": ["strategic-nap-pillow", "low-battery-human-charger", "nervous-system-blanket", "do-not-perform-mask", "strategic-silence-diffuser", "midnight-thoughts-tray"],
  "Existential Wellness": ["premium-overthinking-blanket", "personalized-regret-journal", "introvert-recovery-tent", "emotionally-available-notebook", "ambient-dread-paperweight", "meaning-of-life-coaster"],
  "Marketing Therapy": ["attribution-anxiety-blanket", "cookie-apocalypse-kit", "consent-banner-stress-ball", "roas-optimism-spray", "segment-naming-generator", "dashboard-shame-shield"],
  "Tiny Dopamine": ["tiny-dopamine-pack", "five-minute-victory-badge", "inbox-zero-candle", "unsubscribe-stress-ball", "micro-joy-receipt", "compliment-emergency-card"],
  "Gifts for People Who Say I'm Fine": ["im-fine-care-parcel", "subtext-reading-glasses", "deluxe-boundary-bell", "quietly-spiraling-tea", "polite-collapse-kit", "emotional-support-invoice"],
};

const firstNames = ["Alex", "Jamie", "Taylor", "Morgan", "Casey", "Riley", "Jordan", "Avery", "Quinn", "Sam", "Dana", "Robin", "Chris", "Nina", "Maya", "Leo", "Iris", "Tomas", "Eva", "Noah"];
const surnames = ["Novak", "Kral", "Dvorak", "Svoboda", "Urban", "Baker", "Reed", "Stone", "Fischer", "Miller", "Brown", "Walker", "Young", "King", "Lopez", "Garcia", "Nielsen", "Klein", "Weber", "Hart"];
const cities = [
  ["Prague", "11000", "CZ"],
  ["Brno", "60200", "CZ"],
  ["Ostrava", "70200", "CZ"],
  ["Berlin", "10115", "DE"],
  ["Vienna", "1010", "AT"],
  ["Amsterdam", "1012", "NL"],
  ["Warsaw", "00001", "PL"],
  ["London", "SW1A", "GB"],
  ["Paris", "75001", "FR"],
  ["Madrid", "28001", "ES"],
];
const signupChannels = ["organic_search", "paid_social", "email", "referral", "direct", "in_store_qr", "affiliate", "demo_import"];
const nextActions = ["reorder", "recover_cart", "browse_new_arrivals", "review_last_purchase", "redeem_vip_perk", "complete_profile"];
const deliveryStatuses = ["delivered", "in_transit", "delayed", "ready_for_review", ""];
const journeySets = [
  ["prospect_nurture"],
  ["browse_abandonment"],
  ["cart_recovery"],
  ["post_purchase_loyalty"],
  ["vip_early_access"],
  ["win_back"],
  ["review_request", "post_purchase_loyalty"],
  ["discount_affinity", "cart_recovery"],
];

const columns = [
  "user_id",
  "email",
  "phone",
  "first_name",
  "surname",
  "last_purchase_contact.email",
  "last_purchase_contact.phone",
  "last_purchase_contact.first_name",
  "last_purchase_contact.surname",
  "street_address",
  "city",
  "postal_code",
  "country",
  "last_purchase_address.street_address",
  "last_purchase_address.city",
  "last_purchase_address.postal_code",
  "last_purchase_address.country",
  "customer_type",
  "lifecycle_stage",
  "vip_tier",
  "lifetime_value",
  "purchase_count",
  "average_order_value",
  "days_since_last_purchase",
  "last_purchased_category",
  "last_purchased_sku",
  "predicted_reorder_date",
  "last_viewed_product_id",
  "viewed_product_count",
  "has_active_cart",
  "last_abandoned_cart_value",
  "cart_item_ids",
  "preferred_category",
  "recently_viewed_categories",
  "journey_membership",
  "next_best_action",
  "next_best_product_ids",
  "marketing_consent",
  "push_opt_in",
  "signup_channel",
  "discount_affinity",
  "delivery_status",
  "referral_code",
  "has_left_review",
  "repeat_buyer",
  "last_seen_at",
  "source",
];

const rows = Array.from({ length: rowCount }, (_, index) => buildProfile(index + 1));
const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n") + "\n";

fs.writeFileSync(outputPath, csv);
console.log(`Generated ${path.relative(root, outputPath)} with ${rows.length} profiles.`);

function buildProfile(number) {
  const index = number - 1;
  const segment = index % 10;
  const firstName = pick(firstNames, index * 3);
  const surname = pick(surnames, index * 5);
  const city = pick(cities, index * 7);
  const category = pick(categories, index * 11);
  const secondaryCategory = pick(categories.filter((item) => item !== category), index * 13);
  const products = productsByCategory[category];
  const lastSku = pick(products, index * 17);
  const lastViewed = pick(productsByCategory[secondaryCategory], index * 19);
  const purchaseCount = purchaseCountForSegment(segment, index);
  const averageOrderValue = purchaseCount ? 24 + ((index * 7) % 95) : 0;
  const lifetimeValue = purchaseCount ? purchaseCount * averageOrderValue + ((index * 13) % 31) : 0;
  const daysSinceLastPurchase = purchaseCount ? daysSinceForSegment(segment, index) : "";
  const hasActiveCart = segment === 2 || segment === 7 || (index % 17 === 0 && segment !== 0);
  const cartItems = hasActiveCart ? unique([lastViewed, pick(products, index + 3), pick(productsByCategory[pick(categories, index + 4)], index + 9)]).slice(0, 1 + (index % 3)) : [];
  const lapsed = Number(daysSinceLastPurchase) >= 60;
  const vipTier = tierForValue(lifetimeValue);
  const predictedDate = purchaseCount ? addDays(generatedAt, Math.max(4, 18 + (index % 45))) : "";
  const deliveryStatus = purchaseCount ? pick(deliveryStatuses, index * 23) : "";
  const hasLeftReview = purchaseCount ? index % 4 === 0 : false;
  const marketingConsent = index % 5 !== 0;
  const discountAffinity = index % 6 === 0 ? "high" : index % 6 === 1 ? "medium" : index % 6 === 2 ? "low" : "";
  const journeys = segment === 0 ? ["prospect_nurture"] : lapsed ? ["win_back"] : pick(journeySets, index * 29);
  const lifecycleStage = lifecycleFor({ segment, purchaseCount, hasActiveCart, lapsed, vipTier });
  const userId = `seed-${String(number).padStart(4, "0")}`;
  const phone = `+420777${String(100000 + number).slice(-6)}`;
  const email = `${firstName}.${surname}.${String(number).padStart(4, "0")}@example.test`.toLowerCase();
  const streetAddress = `${100 + (index % 850)} ${pick(["Calm Street", "Boundary Lane", "Nap Avenue", "Dashboard Road", "Tiny Victory Square"], index)}`;

  return {
    user_id: userId,
    email,
    phone,
    first_name: firstName,
    surname,
    "last_purchase_contact.email": purchaseCount ? email : "",
    "last_purchase_contact.phone": purchaseCount ? phone : "",
    "last_purchase_contact.first_name": purchaseCount ? firstName : "",
    "last_purchase_contact.surname": purchaseCount ? surname : "",
    street_address: streetAddress,
    city: city[0],
    postal_code: city[1],
    country: city[2],
    "last_purchase_address.street_address": purchaseCount ? streetAddress : "",
    "last_purchase_address.city": purchaseCount ? city[0] : "",
    "last_purchase_address.postal_code": purchaseCount ? city[1] : "",
    "last_purchase_address.country": purchaseCount ? city[2] : "",
    customer_type: purchaseCount || index % 3 === 0 ? "registered" : "anonymous",
    lifecycle_stage: lifecycleStage,
    vip_tier: vipTier,
    lifetime_value: lifetimeValue || "",
    purchase_count: purchaseCount,
    average_order_value: averageOrderValue || "",
    days_since_last_purchase: daysSinceLastPurchase,
    last_purchased_category: purchaseCount ? category : "",
    last_purchased_sku: purchaseCount ? lastSku : "",
    predicted_reorder_date: predictedDate,
    last_viewed_product_id: lastViewed,
    viewed_product_count: 1 + (index % 23),
    has_active_cart: String(hasActiveCart),
    last_abandoned_cart_value: hasActiveCart ? 18 + ((index * 11) % 140) : "",
    cart_item_ids: cartItems.join("|"),
    preferred_category: category,
    recently_viewed_categories: unique([category, secondaryCategory, pick(categories, index * 31)]).join("|"),
    journey_membership: journeys.join("|"),
    next_best_action: pick(nextActions, index * 37),
    next_best_product_ids: unique([pick(products, index + 1), lastViewed, pick(productsByCategory[secondaryCategory], index + 2)]).join("|"),
    marketing_consent: String(marketingConsent),
    push_opt_in: String(index % 4 === 0),
    signup_channel: pick(signupChannels, index * 41),
    discount_affinity: discountAffinity,
    delivery_status: deliveryStatus,
    referral_code: purchaseCount ? `ESC-${firstName.slice(0, 3).toUpperCase()}-${String(number).padStart(4, "0")}` : "",
    has_left_review: String(hasLeftReview),
    repeat_buyer: String(purchaseCount >= 2),
    last_seen_at: addDays(generatedAt, -(index % 30)),
    source: "google_sheet_seed",
  };
}

function purchaseCountForSegment(segment, index) {
  if (segment === 0) return 0;
  if (segment === 1) return 1;
  if (segment === 2) return 1 + (index % 2);
  if (segment === 3) return 2 + (index % 4);
  if (segment === 4) return 6 + (index % 10);
  if (segment === 5) return 12 + (index % 22);
  if (segment === 6) return 1 + (index % 3);
  if (segment === 7) return 2 + (index % 7);
  if (segment === 8) return 1 + (index % 5);
  return 3 + (index % 12);
}

function daysSinceForSegment(segment, index) {
  if (segment === 4 || segment === 5) return index % 14;
  if (segment === 6) return 65 + (index % 160);
  if (segment === 8) return 30 + (index % 45);
  return index % 60;
}

function lifecycleFor({ segment, purchaseCount, hasActiveCart, lapsed, vipTier }) {
  if (!purchaseCount) return "new_visitor";
  if (hasActiveCart) return "active_cart";
  if (lapsed) return "lapsed_customer";
  if (vipTier === "gold" || vipTier === "platinum") return "high_value_customer";
  if (segment === 8) return "post_purchase";
  return purchaseCount > 1 ? "repeat_customer" : "first_time_buyer";
}

function tierForValue(value) {
  if (!value) return "bronze";
  if (value >= 1800) return "platinum";
  if (value >= 800) return "gold";
  if (value >= 220) return "silver";
  return "bronze";
}

function addDays(isoDate, days) {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function pick(items, index) {
  return items[Math.abs(index) % items.length];
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function csvCell(value) {
  const text = value === undefined || value === null ? "" : String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}
