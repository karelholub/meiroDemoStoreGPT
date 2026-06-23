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
const events = read("src/integrations/meiro/eventSchemas.ts");
const meiroClient = read("src/integrations/meiro/meiroClient.ts");
const meiroConfig = read("src/integrations/meiro/meiroConfig.ts");
const profileApiScenarios = read("src/data/profileApiScenarios.ts");
const netlify = read("netlify.toml");

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
  "review_submitted: \"form_submit\"",
].forEach((mapping) => {
  assert(meiroClient.includes(mapping), `Meiro event mapping exists: ${mapping}`);
});
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
assert(app.includes("profileFieldValue"), "playbooks can show populated Profile API field values");
assert(app.includes("configuredProfileApiFields"), "configured Profile API fields are grouped separately");
assert(app.includes("optionalProfileApiFields"), "optional Profile API placeholders are grouped separately");
assert(app.includes('trackEvent("review_submitted"'), "review form submits a tracking event");
assert(app.includes("review_text_length"), "review event sends review text length only");

assert(netlify.includes('from = "/*"') && netlify.includes('to = "/index.html"'), "Netlify SPA redirect is configured");

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
