import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const failures = [];
const pass = [];

function assert(condition, message) {
  if (condition) pass.push(message);
  else failures.push(message);
}

function extractArrayBlock(source, exportName) {
  const start = source.indexOf(`export const ${exportName}`);
  if (start === -1) return "";
  const arrayStart = source.indexOf("[", start);
  const arrayEnd = source.indexOf("];", arrayStart);
  return source.slice(arrayStart, arrayEnd + 1);
}

const app = read("src/App.tsx");
const products = read("src/data/products.ts");
const categories = read("src/data/categories.ts");
const appState = read("src/store/appState.tsx");
const events = read("src/integrations/meiro/eventSchemas.ts");
const meiroClient = read("src/integrations/meiro/meiroClient.ts");
const meiroConfig = read("src/integrations/meiro/meiroConfig.ts");
const meiroProfileApi = read("src/integrations/meiro/meiroProfileApi.ts");
const profileApiScenarios = read("src/data/profileApiScenarios.ts");
const profileApiFunction = read("netlify/functions/meiro-profile.ts");
const netlify = read("netlify.toml");
const productFeed = read("public/product-feed.xml");
const profileSeed = read("data/meiro_profile_seed_1500.csv");

const routePaths = [
  "/",
  "/products",
  "/category/",
  "/product/",
  "/cart",
  "/checkout",
  "/register",
  "/login",
  "/account",
  "/search",
  "/playbooks",
  "/demo-control",
  "/review",
  "/thank-you",
];

routePaths.forEach((route) => {
  assert(app.includes(route), `route present: ${route}`);
});

const categoryNames = [...categories.matchAll(/name: "([^"]+)"/g)].map((match) => match[1]);
assert(categoryNames.length === 7, "catalog has 7 categories");

const productRows = [...products.matchAll(/make\("([^"]+)", "([^"]+)", "([^"]+)"/g)].map((match) => ({
  id: match[1],
  name: match[2],
  category: match[3],
}));
assert(productRows.length >= 35, `catalog has at least 35 products (${productRows.length})`);
assert(!products.includes("images.unsplash.com"), "catalog uses local product imagery");

const countsByCategory = productRows.reduce((counts, product) => {
  counts[product.category] = (counts[product.category] ?? 0) + 1;
  return counts;
}, {});

categoryNames.forEach((category) => {
  assert((countsByCategory[category] ?? 0) >= 5, `category has at least 5 products: ${category}`);
});

[
  "work-meetings.jpg",
  "parenting-chaos.jpg",
  "sleep-recovery.jpg",
  "existential-wellness.jpg",
  "marketing-therapy.jpg",
  "tiny-dopamine.jpg",
  "gifts-im-fine.jpg",
].forEach((file) => {
  assert(products.includes(`/assets/products/${file}`), `catalog references product image: ${file}`);
  assert(fs.existsSync(path.join(root, "public", "assets", "products", file)), `product image asset exists: ${file}`);
});

const requiredEvents = [
  "page_view",
  "product_view",
  "category_view",
  "product_list_view",
  "search_submitted",
  "search_result_clicked",
  "product_added_to_cart",
  "product_removed_from_cart",
  "cart_view",
  "checkout_started",
  "checkout_step_completed",
  "order_completed",
  "newsletter_signup",
  "user_registered",
  "user_logged_in",
  "profile_updated",
  "recommendation_viewed",
  "recommendation_clicked",
  "personalization_viewed",
  "personalization_clicked",
  "review_submitted",
  "consent_updated",
];

requiredEvents.forEach((eventName) => {
  assert(events.includes(`"${eventName}"`), `event schema includes: ${eventName}`);
});

assert(meiroConfig.includes("https://meiro-demo.eu.pipes.meiro.io/collect/web-sdk"), "Meiro collection endpoint default is configured");
assert(meiroConfig.includes("https://meiro-demo.eu.pipes.meiro.io/mpt.js"), "Meiro SDK script default is configured");
assert(meiroClient.includes('import.meta.env.VITE_MEIRO_SDK_ENABLED !== "false"'), "Meiro SDK is enabled by default");
assert(meiroClient.includes('callMpt("config"'), "Meiro SDK config call is wired");
assert(meiroClient.includes('callMpt("consent"'), "Meiro consent call is wired");
assert(meiroClient.includes('callMpt("set"'), "Meiro shared field call is wired");
assert(meiroClient.includes('callMpt("event"'), "Meiro event call is wired");
assert(meiroClient.includes("eventNameMap"), "Meiro internal-to-canonical event name mapping exists");
assert(meiroClient.includes("buildMptEventPayload"), "Meiro SDK event payload sanitizer exists");
assert(meiroClient.includes("sdkContextPayload"), "Meiro SDK context payload uses SDK-safe field names");
assert(!meiroClient.includes("original_event_name: eventName"), "Meiro SDK events do not forward internal event names as payload fields");
[
  "product_added_to_cart: \"add_to_cart\"",
  "product_removed_from_cart: \"remove_from_cart\"",
  "product_view: \"view_item\"",
  "cart_view: \"view_cart\"",
  "checkout_started: \"begin_checkout\"",
  "order_completed: \"purchase\"",
  "search_submitted: \"search\"",
  "user_registered: \"sign_up\"",
  "profile_updated: \"generate_lead\"",
  "review_submitted: \"form_submit\"",
].forEach((mapping) => {
  assert(meiroClient.includes(mapping), `Meiro event mapping exists: ${mapping}`);
});
assert(!meiroClient.includes('profile_updated: "working_lead"'), "profile updates do not use unsupported working_lead event");
assert(meiroClient.includes("link_tracking: { enabled: true }"), "Meiro link tracking is enabled");
assert(meiroClient.includes("tracking_rules:"), "Meiro tracking rules are configured");
assert(meiroClient.includes("storage_allowlist"), "Meiro tracking rules storage allowlist is configured");

[
  "vip_replenishment",
  "cart_recovery",
  "review_referral",
].forEach((scenarioId) => {
  assert(profileApiScenarios.includes(`id: "${scenarioId}"`), `seeded Profile API scenario exists: ${scenarioId}`);
});
[
  "next_best_product_ids",
  "has_active_cart",
  "last_abandoned_cart_value",
  "delivery_status",
  "referral_code",
].forEach((attributeName) => {
  assert(profileApiScenarios.includes(attributeName), `seeded Profile API attribute exists: ${attributeName}`);
});
assert(app.includes("ProfileApiScenarioControls"), "demo-control exposes seeded Profile API controls");
assert(app.includes("applyProfileApiScenario"), "app state can apply seeded Profile API scenarios");
assert(app.includes("Configured attributes still missing values"), "demo-control shows missing configured Profile API values");
assert(app.includes("last_purchased_sku"), "Profile API proof includes last purchased SKU");
assert(app.includes("formatProfileDate") && !app.includes("Reorder on ${state.profile.predictedReorderDate}"), "Reorder dates are formatted for visible UI");
assert(app.includes("profileFieldValue"), "playbooks can show populated Profile API field values");
assert(app.includes("configuredProfileApiFields"), "configured Profile API fields are grouped separately");
assert(app.includes("optionalProfileApiFields"), "optional Profile API placeholders are grouped separately");
assert(app.includes('trackEvent("review_submitted"'), "review form submits a tracking event");
assert(app.includes("review_text_length"), "review event sends review text length only");
assert(app.includes("email: checkoutDetails.email") && app.includes("phone: checkoutDetails.phone"), "purchase event includes top-level email and phone");
assert(app.includes('trackEvent(mode === "login" ? "user_logged_in" : "user_registered", { email: form.email'), "registration event includes top-level email");
assert(app.includes('trackEvent("newsletter_signup", { email,'), "newsletter sign-up event includes top-level email");
assert(meiroClient.includes("email: payload.email") && meiroClient.includes("email_domain: payload.email_domain"), "Meiro sign-up/login SDK payload forwards email fields");
assert(meiroProfileApi.includes("mpt_user_id_js"), "Profile API identifier reads Meiro SDK user id cookie");
assert(meiroProfileApi.includes('preferred === "user_id" && mptUserId'), "Profile API user_id prefers Meiro SDK cookie");
assert(meiroProfileApi.includes("unwrapAttributeValue(value[attributeName], attributeName)") && meiroProfileApi.includes("flattenAttributeFields"), "Profile API mapper unwraps nested Meiro attribute wrappers");
assert(meiroProfileApi.includes("Object.keys(value).length === 1"), "Profile API mapper unwraps one-field attribute objects");
assert(meiroProfileApi.includes("last_purchase_contact.email") && meiroProfileApi.includes("last_purchase_address.street_address"), "Profile API mapper reads grouped purchase contact and address");
assert(meiroProfileApi.includes("assignAffinityBoolean") && meiroProfileApi.includes('"high"'), "Profile API mapper accepts affinity labels");
assert(appState.includes("setMptUserId") && appState.includes("window.setInterval(refreshMptUserId"), "app watches Meiro SDK user id cookie");
assert(!appState.includes("profile.phone, profile.profileApiUpdatedAt, mptUserId"), "Profile API hydration does not loop on updated timestamp");
assert(profileApiFunction.includes('getEnv("MEIRO_PROFILE_API_TOKEN")'), "Profile API proxy reads server-side token");
assert(profileApiFunction.includes('getEnv("VITE_MEIRO_PROFILE_API_TOKEN")'), "Profile API proxy tolerates legacy token env");
assert(profileApiFunction.includes("upstream_profile_api_error"), "Profile API proxy reports upstream errors");
assert(profileApiFunction.includes("profile_not_found"), "Profile API proxy treats upstream 404 as empty profile");
assert(meiroProfileApi.includes("profileApiErrorMessage"), "Profile API client renders proxy error messages");

assert(netlify.includes('from = "/*"') && netlify.includes('to = "/index.html"'), "Netlify SPA redirect is configured");
assert(productFeed.includes('xmlns:g="http://base.google.com/ns/1.0"'), "XML product feed uses Google Merchant-style namespace");
assert((productFeed.match(/<item>/g) || []).length === productRows.length, "XML product feed includes every product");
assert(productFeed.includes("<g:id>monday-survival-kit</g:id>"), "XML product feed includes stable product ids");
assert(productFeed.includes("<g:custom_label_0>"), "XML product feed includes recommendation labels");
assert(profileSeed.trimEnd().split("\n").length === 1501, "Profile seed CSV has 1500 sample profiles");
assert(profileSeed.startsWith("user_id,email,phone,first_name,surname"), "Profile seed CSV starts with identity columns");
assert(profileSeed.includes("last_purchase_contact.email") && profileSeed.includes("last_purchase_address.street_address"), "Profile seed CSV includes grouped purchase attributes");

[
  "README.md",
  "ROADMAP.md",
  "DEMO_SCRIPT.md",
  "MEIRO_INTEGRATION.md",
  ".github/workflows/ci.yml",
  ".github/pull_request_template.md",
].forEach((file) => {
  assert(fs.existsSync(path.join(root, file)), `required project document exists: ${file}`);
});

if (failures.length) {
  console.error("Smoke check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Smoke check passed (${pass.length} assertions).`);
