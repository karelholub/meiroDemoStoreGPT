import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const DEFAULT_ENDPOINT = "https://meiro-demo.eu.pipes.meiro.io/collect/web-sdk";
const DEFAULT_PROFILES = 5000;
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_SITE_URL = "https://dmostoregpt.netlify.app";
const VERSION = "1.0.0";

const options = parseArgs(process.argv.slice(2));
const endpoint = options.endpoint ?? process.env.MEIRO_SIM_ENDPOINT ?? process.env.VITE_MEIRO_ENDPOINT ?? DEFAULT_ENDPOINT;
const profileCount = numberOption(options.profiles, "profiles", DEFAULT_PROFILES);
const batchSize = numberOption(options.batchSize, "batch-size", DEFAULT_BATCH_SIZE);
const concurrency = numberOption(options.concurrency, "concurrency", DEFAULT_CONCURRENCY);
const siteUrl = String(options.siteUrl ?? process.env.MEIRO_SIM_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/$/, "");
const dryRun = Boolean(options.dryRun);
const verbose = Boolean(options.verbose);

const products = readProducts();
const productsByCategory = groupBy(products, (product) => product.category);
const categories = Object.keys(productsByCategory);
const startedAt = Date.now();
const batches = chunk(buildEvents(profileCount), batchSize);

if (dryRun) {
  const sampleEvents = batches[0]?.slice(0, Math.min(8, batches[0].length)) ?? [];
  console.log(JSON.stringify({
    mode: "dry-run",
    endpoint,
    siteUrl,
    profiles: profileCount,
    events: batches.reduce((sum, batch) => sum + batch.length, 0),
    batches: batches.length,
    batchSize,
    concurrency,
    sampleEvents,
  }, null, 2));
  process.exit(0);
}

console.log(`Sending ${profileCount} simulated profiles (${batches.reduce((sum, batch) => sum + batch.length, 0)} events) to ${endpoint}`);
console.log(`Batch size ${batchSize}, concurrency ${concurrency}. Unique user/device/browser/session identifiers are generated per profile.`);

const result = await sendBatches(batches);
const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`Finished in ${durationSeconds}s. Sent ${result.eventsSent} events in ${result.batchesSent} batches for ${profileCount} profiles.`);
if (result.failures.length > 0) {
  console.error(`${result.failures.length} batch(es) failed:`);
  result.failures.slice(0, 10).forEach((failure) => console.error(`- batch ${failure.batchIndex}: ${failure.message}`));
  process.exitCode = 1;
}

function buildEvents(count) {
  const events = [];
  for (let index = 0; index < count; index += 1) {
    events.push(...eventsForProfile(index));
  }
  return events;
}

function eventsForProfile(index) {
  const profileNumber = index + 1;
  const profile = buildProfile(index);
  const primaryCategory = pick(categories, index * 7);
  const secondaryCategory = pick(categories.filter((category) => category !== primaryCategory), index * 11);
  const categoryProducts = productsByCategory[primaryCategory] ?? products;
  const viewedProducts = unique([
    pick(categoryProducts, index),
    pick(categoryProducts, index + 2),
    pick(productsByCategory[secondaryCategory] ?? products, index + 5),
  ]).slice(0, 2 + (index % 2));
  const willPurchase = index % 10 < 38 / 10 || index % 9 === 0;
  const cartProducts = willPurchase ? viewedProducts.slice(0, 1 + (index % Math.min(2, viewedProducts.length))) : viewedProducts.slice(0, 1);
  const searchedTerm = searchTermFor(primaryCategory, index);
  const started = Date.now() - (profileNumber % 21) * 86_400_000 - (profileNumber % 720) * 60_000;
  const basePayload = {
    method: "simulation_script",
    browser_id: profile.browserId,
    device_id: profile.deviceId,
    email: profile.email,
    phone: profile.phone,
    first_name: profile.firstName,
    surname: profile.surname,
    profile_seed: "meiro_demo_store_5000",
  };
  const events = [];
  let step = 0;

  const push = (type, payload = {}) => {
    events.push(eventEnvelope({
      type,
      profile,
      timestamp: new Date(started + step * 47_000 + (index % 17) * 1000).toISOString(),
      payload: {
        ...basePayload,
        ...payload,
      },
    }));
    step += 1;
  };

  push("page_view", pageContext("/", "Existential Supplies Co."));
  push("search", {
    ...pageContext(`/search?q=${encodeURIComponent(searchedTerm)}`, "Search | Existential Supplies Co."),
    search_query: searchedTerm,
    search_term: searchedTerm,
    result_count: categoryProducts.length,
  });
  push("view_search_results", {
    ...pageContext(`/search?q=${encodeURIComponent(searchedTerm)}`, "Search results | Existential Supplies Co."),
    search_query: searchedTerm,
    item_list_id: `search_${slugify(searchedTerm)}`,
    item_list_name: `Search: ${searchedTerm}`,
    items: categoryProducts.slice(0, 6).map((product, productIndex) => itemPayload(product, productIndex + 1)),
  });

  viewedProducts.forEach((product, productIndex) => {
    push("view_item", {
      ...pageContext(`/product/${product.slug}`, `${product.name} | Existential Supplies Co.`),
      ...productEventPayload(product),
      items: [itemPayload(product, productIndex + 1)],
    });
  });

  const cartItems = cartProducts.map((product, productIndex) => ({
    ...itemPayload(product, productIndex + 1),
    quantity: 1,
  }));
  const cartValue = cartItems.reduce((sum, item) => sum + Number(item.price), 0);

  if (cartItems.length > 0) {
    cartProducts.forEach((product, productIndex) => {
      push("add_to_cart", {
        ...pageContext(`/product/${product.slug}`, `${product.name} | Existential Supplies Co.`),
        ...productEventPayload(product),
        quantity: 1,
        cart_value: cartProducts.slice(0, productIndex + 1).reduce((sum, item) => sum + item.price, 0),
        cart_size: productIndex + 1,
        items: [itemPayload(product, productIndex + 1)],
      });
    });
    push("view_cart", {
      ...pageContext("/cart", "Cart | Existential Supplies Co."),
      cart_size: cartItems.length,
      cart_value: cartValue,
      items: cartItems,
      cart_opener: cartItems[0]?.item_id,
    });
  }

  if (willPurchase && cartItems.length > 0) {
    const orderId = `SIM-${String(profileNumber).padStart(6, "0")}`;
    push("begin_checkout", {
      ...pageContext("/checkout", "Checkout | Existential Supplies Co."),
      cart_size: cartItems.length,
      cart_value: cartValue,
      items: cartItems,
    });
    push("add_shipping_info", {
      ...pageContext("/checkout", "Checkout shipping | Existential Supplies Co."),
      street_address: profile.streetAddress,
      city: profile.city,
      postal_code: profile.postalCode,
      country: profile.country,
      shipping_speed: index % 3 === 0 ? "express_emotional_reassurance" : "standard",
      items: cartItems,
      value: cartValue,
      currency: "EUR",
    });
    push("add_payment_info", {
      ...pageContext("/checkout", "Checkout payment | Existential Supplies Co."),
      payment_method: "demo_card_0000",
      items: cartItems,
      value: cartValue,
      currency: "EUR",
    });
    push("purchase", {
      ...pageContext("/thank-you", "Thank you | Existential Supplies Co."),
      order_id: orderId,
      transaction_id: orderId,
      value: cartValue,
      total_value: cartValue,
      currency: "EUR",
      coupon: index % 6 === 0 ? "SIMULATED-CALM" : undefined,
      items: cartItems,
      product_ids: cartItems.map((item) => item.item_id),
    });
  }

  return events;
}

function eventEnvelope({ type, profile, timestamp, payload }) {
  return {
    type,
    timestamp,
    version: VERSION,
    user_id: profile.userId,
    session_id: profile.sessionId,
    device_id: profile.deviceId,
    browser_id: profile.browserId,
    inbound_user_ids: [
      `email:${profile.email}`,
      `phone:${profile.phone}`,
      `external_id:${profile.externalId}`,
    ],
    client_ids: {
      ga: profile.gaClientId,
      fb: profile.fbClientId,
      browser: profile.browserId,
      device: profile.deviceId,
    },
    browser_metrics: profile.browserMetrics,
    payload: withoutUndefined(payload),
  };
}

function buildProfile(index) {
  const number = index + 1;
  const padded = String(number).padStart(5, "0");
  const firstName = pick(["Alex", "Jamie", "Taylor", "Morgan", "Casey", "Riley", "Jordan", "Avery", "Quinn", "Mira", "Tomas", "Eva"], index * 3);
  const surname = pick(["Novak", "Kral", "Dvorak", "Urban", "Baker", "Stone", "Fischer", "Miller", "Walker", "Lopez", "Nielsen", "Weber"], index * 5);
  const city = pick([
    ["Prague", "11000", "CZ"],
    ["Brno", "60200", "CZ"],
    ["Berlin", "10115", "DE"],
    ["Vienna", "1010", "AT"],
    ["Amsterdam", "1012", "NL"],
    ["Warsaw", "00001", "PL"],
  ], index * 7);
  const namespace = `sim-${padded}`;
  const userId = `sim-user-${padded}-${stableToken(index, 6)}`;
  const browserId = `sim-browser-${padded}-${stableToken(index + 13, 8)}`;
  const deviceId = `sim-device-${padded}-${stableToken(index + 29, 8)}`;
  const externalId = `sim-external-${padded}-${stableToken(index + 41, 8)}`;
  return {
    userId,
    browserId,
    deviceId,
    externalId,
    sessionId: Buffer.from(`${Date.now()}&${browserId}&${namespace}`).toString("base64"),
    email: `${firstName}.${surname}.${padded}@sim.example.test`.toLowerCase(),
    phone: `+42077${String(1000000 + number).slice(-7)}`,
    firstName,
    surname,
    streetAddress: `${100 + (index % 800)} ${pick(["Calm Street", "Boundary Lane", "Nap Avenue", "Dashboard Road"], index)}`,
    city: city[0],
    postalCode: city[1],
    country: city[2],
    gaClientId: `GA1.2.${1000000000 + index}.${1900000000 + index}`,
    fbClientId: `fb.1.${1900000000000 + index}.${stableNumeric(index, 10)}`,
    browserMetrics: {
      color_depth: 24,
      inner_width: pick([390, 768, 1366, 1440, 1536, 1920], index),
      inner_height: pick([844, 900, 960, 1024, 1080], index + 2),
      cookies_enabled: true,
      language: pick(["en-US", "en-GB", "cs-CZ", "de-DE", "nl-NL"], index + 3),
    },
  };
}

function pageContext(pathname, pageTitle) {
  const url = `${siteUrl}${pathname}`;
  return {
    url,
    page_title: pageTitle,
    referrer: "",
    context: {
      url,
      page_title: pageTitle,
      referrer: null,
    },
  };
}

function itemPayload(product, index) {
  return {
    item_id: product.id,
    item_name: product.name,
    item_category: product.category,
    price: product.price,
    quantity: 1,
    index,
  };
}

function productEventPayload(product) {
  return {
    product_id: product.id,
    product_name: product.name,
    category: product.category,
    price: product.price,
    tags: product.tags,
  };
}

async function sendBatches(allBatches) {
  let cursor = 0;
  let batchesSent = 0;
  let eventsSent = 0;
  const failures = [];

  async function worker() {
    while (cursor < allBatches.length) {
      const batchIndex = cursor;
      cursor += 1;
      const batch = allBatches[batchIndex];
      try {
        await sendBatch(batch, batchIndex);
        batchesSent += 1;
        eventsSent += batch.length;
        if (verbose || batchesSent % 25 === 0 || batchesSent === allBatches.length) {
          console.log(`Sent batch ${batchesSent}/${allBatches.length} (${eventsSent} events)`);
        }
      } catch (error) {
        failures.push({ batchIndex, message: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return { batchesSent, eventsSent, failures };
}

async function sendBatch(batch, batchIndex) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "meiro-demo-store-simulator/1.0",
    },
    body: JSON.stringify(batch),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${response.statusText}${text ? `: ${text.slice(0, 300)}` : ""}`);
  }

  return { batchIndex, status: response.status };
}

function readProducts() {
  const source = fs.readFileSync(path.join(root, "src/data/products.ts"), "utf8");
  return [...source.matchAll(/make\("([^"]+)", "([^"]+)", "([^"]+)", ([0-9]+), \[([^\]]*)\]/g)].map((match) => ({
    id: match[1],
    slug: match[1],
    name: match[2],
    category: match[3],
    price: Number(match[4]),
    tags: [...match[5].matchAll(/"([^"]+)"/g)].map((tagMatch) => tagMatch[1]),
  }));
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--verbose") parsed.verbose = true;
    else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      parsed[toCamel(key)] = args[index + 1];
      index += 1;
    }
  }
  return parsed;
}

function numberOption(value, label, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Invalid --${label}: ${value}`);
  return Math.floor(parsed);
}

function groupBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    groups[key] = groups[key] ?? [];
    groups[key].push(item);
    return groups;
  }, {});
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function pick(items, index) {
  return items[((index % items.length) + items.length) % items.length];
}

function unique(items) {
  return [...new Map(items.map((item) => [item.id ?? item, item])).values()];
}

function searchTermFor(category, index) {
  const termsByCategory = {
    "Work & Meetings": ["meeting", "monday", "dashboard"],
    "Parenting & Chaos": ["parenting", "school morning", "snacks"],
    "Sleep & Recovery": ["sleep", "recovery", "nap"],
    "Existential Wellness": ["overthinking", "comfort", "reflection"],
    "Marketing Therapy": ["marketing", "consent", "analytics"],
    "Tiny Dopamine": ["dopamine", "reward", "tiny victory"],
    "Gifts for People Who Say “I’m Fine”": ["gift", "fine", "care parcel"],
  };
  return pick(termsByCategory[category] ?? ["meeting", "sleep", "gift"], index);
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function stableToken(seed, length) {
  return stableNumeric(seed, length).toString(36).padStart(length, "0").slice(0, length);
}

function stableNumeric(seed, length) {
  let value = BigInt(seed + 1) * 1103515245n + 12345n;
  const modulo = 10n ** BigInt(length);
  value = (value * 2654435761n) % modulo;
  return value.toString().padStart(length, "0");
}

function withoutUndefined(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
