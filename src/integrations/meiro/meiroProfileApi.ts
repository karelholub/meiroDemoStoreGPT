import type { CustomerProfile } from "../../types";

export type ProfileIdentifierType = "user_id" | "email" | "phone" | "device_id" | "browser";

export type ProfileApiConfigStatus = {
  enabled: boolean;
  hasEndpoint: boolean;
  endpoint: string;
  preferredIdentifierType: ProfileIdentifierType;
};

export type ProfileApiResult = {
  raw: unknown;
  attributes: Record<string, unknown>;
  profilePatch: Partial<CustomerProfile>;
};

export const DEFAULT_MEIRO_PROFILE_API_PROXY_URL = "/api/meiro-profile";

export function getMeiroProfileApiStatus(): ProfileApiConfigStatus {
  return {
    enabled: import.meta.env.VITE_MEIRO_PROFILE_API_ENABLED !== "false",
    hasEndpoint: Boolean(getMeiroProfileApiEndpoint()),
    endpoint: getMeiroProfileApiEndpoint(),
    preferredIdentifierType: getPreferredIdentifierType(),
  };
}

export function getMeiroProfileApiEndpoint() {
  return import.meta.env.VITE_MEIRO_PROFILE_API_PROXY_URL || DEFAULT_MEIRO_PROFILE_API_PROXY_URL;
}

function getPreferredIdentifierType(): ProfileIdentifierType {
  const value = import.meta.env.VITE_MEIRO_PROFILE_API_IDENTIFIER_TYPE;
  return ["user_id", "email", "phone", "device_id", "browser"].includes(value) ? value : "user_id";
}

export function getProfileApiIdentifier(profile: CustomerProfile, mptUserId = getMptUserIdCookie()): { identifierType: ProfileIdentifierType; identifierValue: string } | undefined {
  const preferred = getPreferredIdentifierType();

  if (preferred === "user_id" && mptUserId) return { identifierType: "user_id", identifierValue: mptUserId };
  if (preferred === "phone" && profile.phone) return { identifierType: "phone", identifierValue: profile.phone };
  if ((preferred === "email" || preferred === "user_id") && profile.email) return { identifierType: preferred, identifierValue: profile.email };
  if (mptUserId) return { identifierType: "user_id", identifierValue: mptUserId };
  if (profile.email) return { identifierType: "user_id", identifierValue: profile.email };
  if (profile.phone) return { identifierType: "phone", identifierValue: profile.phone };

  return undefined;
}

export function getMptUserIdCookie() {
  if (typeof document === "undefined") return undefined;
  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("mpt_user_id_js="));
  const value = cookie?.split("=").slice(1).join("=");
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function fetchMeiroProfile(identifierType: ProfileIdentifierType, identifierValue: string): Promise<ProfileApiResult> {
  const url = new URL(getMeiroProfileApiEndpoint(), window.location.origin);
  url.searchParams.set("identifier_type", identifierType);
  url.searchParams.set("identifier_value", identifierValue);

  const response = await fetch(url.toString());
  const raw = await parseProfileApiResponse(response);

  if (!response.ok) {
    throw new Error(profileApiErrorMessage(response.status, raw));
  }

  const attributes = extractProfileAttributes(raw);

  return {
    raw,
    attributes,
    profilePatch: mapAttributesToCustomerProfile(attributes),
  };
}

async function parseProfileApiResponse(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return { error: body.slice(0, 500) };
  }
}

function profileApiErrorMessage(status: number, raw: unknown) {
  if (!isRecord(raw)) return `Profile API returned ${status}`;
  const message = asString(raw.error) || asString(raw.message) || `Profile API returned ${status}`;
  const code = asString(raw.code);
  return code ? `${message} (${code})` : message;
}

function extractProfileAttributes(raw: unknown): Record<string, unknown> {
  const source = Array.isArray(raw) ? raw[0] : raw;
  if (!isRecord(source)) return {};

  const data = Array.isArray(source.data) ? source.data[0] : source.data;
  const profile = isRecord(source.profile) ? source.profile : isRecord(data) && isRecord(data.profile) ? data.profile : undefined;
  const attributes =
    (isRecord(source.attributes) && source.attributes) ||
    (isRecord(profile?.attributes) && profile?.attributes) ||
    (isRecord(data) && isRecord(data.attributes) && data.attributes) ||
    source;

  const unwrapped = Object.fromEntries(Object.entries(attributes).map(([key, value]) => [key, unwrapAttributeValue(value, key)]));
  return {
    ...unwrapped,
    ...flattenAttributeFields(unwrapped),
  };
}

function mapAttributesToCustomerProfile(attributes: Record<string, unknown>): Partial<CustomerProfile> {
  const patch: Partial<CustomerProfile> = {
    profileApiAttributes: attributes,
    profileApiUpdatedAt: new Date().toISOString(),
  };

  assignString(patch, "email", read(attributes, ["email", "user_email"]));
  assignString(patch, "phone", read(attributes, ["phone", "phone_number", "mobile_phone"]));
  assignString(patch, "firstName", read(attributes, ["first_name", "firstName", "given_name"]));
  assignString(patch, "surname", read(attributes, ["surname", "last_name", "family_name"]));
  assignString(patch, "streetAddress", read(attributes, ["street_address", "address_line_1", "shipping_address", "shipping_street_address"]));
  assignString(patch, "apartmentOrCompany", read(attributes, ["apartment_or_company", "address_line_2", "shipping_address_line_2"]));
  assignString(patch, "city", read(attributes, ["city", "shipping_city"]));
  assignString(patch, "postalCode", read(attributes, ["postal_code", "zip", "shipping_postal_code"]));
  assignString(patch, "country", read(attributes, ["country", "shipping_country"]));
  assignString(patch, "currentLifeSituation", read(attributes, ["current_life_situation", "life_situation"]));
  assignString(patch, "preferredCategory", read(attributes, ["preferred_category"]));
  assignString(patch, "lifecycleStage", read(attributes, ["lifecycle_stage", "lifecycleStage"]));
  assignString(patch, "categoryAffinity", read(attributes, ["category_affinity", "last_purchased_category", "favorite_category"]));
  assignString(patch, "vipTier", read(attributes, ["vip_tier", "loyalty_tier"]));
  assignString(patch, "predictedReorderDate", read(attributes, ["predicted_reorder_date", "next_reorder_date", "reorder_date"]));
  assignString(patch, "lastPurchasedSku", read(attributes, ["last_purchased_sku", "last_purchased_product_id", "last_purchased_product_sku", "last_purchased_item_id"]));
  assignString(patch, "lastPurchasedCategory", read(attributes, ["last_purchased_category"]));
  assignString(patch, "referralCode", read(attributes, ["referral_code"]));
  assignString(patch, "nextBestAction", read(attributes, ["next_best_action"]));
  assignString(patch, "lastViewedProductId", read(attributes, ["last_viewed_product_id", "last_viewed_product", "last_browsed_product_id"]));
  assignString(patch, "signupChannel", read(attributes, ["signup_channel", "acquisition_channel"]));
  assignString(patch, "deliveryStatus", read(attributes, ["delivery_status", "last_delivery_status"]));

  assignNumber(patch, "lifetimeValue", read(attributes, ["lifetime_value", "ltv"]));
  assignNumber(patch, "purchaseCount", read(attributes, ["purchase_count", "total_orders"]));
  assignNumber(patch, "daysSinceLastPurchase", read(attributes, ["days_since_last_purchase"]));
  assignNumber(patch, "lastAbandonedCartValue", read(attributes, ["last_abandoned_cart_value", "abandoned_cart_value"]));
  assignNumber(patch, "viewedProductCount", read(attributes, ["viewed_product_count", "product_view_count"]));

  assignBoolean(patch, "highIntent", read(attributes, ["high_intent", "has_active_cart"]));
  assignBoolean(patch, "hasActiveCart", read(attributes, ["has_active_cart", "active_cart"]));
  assignBoolean(patch, "hasLeftReview", read(attributes, ["has_left_review"]));
  assignBoolean(patch, "repeatBuyer", read(attributes, ["repeat_buyer", "second_purchase"]));
  assignBoolean(patch, "pushOptIn", read(attributes, ["push_opt_in", "push_consent"]));
  assignBoolean(patch, "marketingConsent", read(attributes, ["marketing_consent", "email_marketing_consent"]));
  assignBoolean(patch, "discountAffinity", read(attributes, ["discount_affinity", "discount_sensitive", "coupon_user"]));

  assignStringArray(patch, "recentlyViewedCategories", read(attributes, ["recently_viewed_categories", "viewed_categories"]));
  assignStringArray(patch, "recommendedTags", read(attributes, ["recommended_tags", "recommendation_tags"]));
  assignStringArray(patch, "purchases", read(attributes, ["purchased_product_ids", "purchases"]));
  assignStringArray(patch, "nextBestProductIds", read(attributes, ["next_best_product_ids", "recommended_product_ids"]));
  assignStringArray(patch, "cartItemIds", read(attributes, ["cart_item_ids", "active_cart_item_ids", "abandoned_cart_item_ids"]));
  assignStringArray(patch, "journeyMembership", read(attributes, ["journey_membership", "journeys", "audiences"]));

  const customerType = asString(read(attributes, ["customer_type"]));
  if (customerType === "anonymous" || customerType === "registered") patch.customerType = customerType;
  if (!patch.customerType && (patch.email || patch.firstName)) patch.customerType = "registered";
  if (!patch.lifecycleStage && patch.vipTier) patch.lifecycleStage = "high_value_customer";

  return withoutUndefined(patch);
}

function read(attributes: Record<string, unknown>, names: string[]) {
  const lowerEntries = Object.entries(attributes).map(([key, value]) => [key.toLowerCase(), value] as const);
  for (const name of names) {
    const direct = attributes[name];
    if (direct !== undefined) return direct;
    const match = lowerEntries.find(([key]) => key === name.toLowerCase());
    if (match) return match[1];
  }
  return undefined;
}

function unwrapAttributeValue(value: unknown, attributeName?: string): unknown {
  if (Array.isArray(value)) {
    const unwrappedItems = value.map((item) => unwrapAttributeValue(item, attributeName));
    return unwrappedItems.length === 1 ? unwrappedItems[0] : unwrappedItems;
  }

  if (!isRecord(value)) return value;
  if ("value" in value) return unwrapAttributeValue(value.value, attributeName);
  if (Array.isArray(value.values)) return unwrapAttributeValue(value.values, attributeName);
  if (attributeName && attributeName in value) return unwrapAttributeValue(value[attributeName], attributeName);

  return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [key, unwrapAttributeValue(nestedValue, key)]));
}

function flattenAttributeFields(attributes: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};

  const visit = (value: unknown) => {
    if (Array.isArray(value)) return;
    if (!isRecord(value)) return;

    Object.entries(value).forEach(([key, nestedValue]) => {
      if (fields[key] === undefined && !isRecord(nestedValue) && !Array.isArray(nestedValue)) {
        fields[key] = nestedValue;
      }
      visit(nestedValue);
    });
  };

  Object.values(attributes).forEach(visit);
  return fields;
}

function assignString<T extends keyof CustomerProfile>(patch: Partial<CustomerProfile>, key: T, value: unknown) {
  const text = asString(value);
  if (text) patch[key] = text as CustomerProfile[T];
}

function assignNumber<T extends keyof CustomerProfile>(patch: Partial<CustomerProfile>, key: T, value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : undefined;
  if (typeof number === "number" && Number.isFinite(number)) patch[key] = number as CustomerProfile[T];
}

function assignBoolean<T extends keyof CustomerProfile>(patch: Partial<CustomerProfile>, key: T, value: unknown) {
  if (typeof value === "boolean") patch[key] = value as CustomerProfile[T];
  if (typeof value === "string" && ["true", "false"].includes(value.toLowerCase())) patch[key] = (value.toLowerCase() === "true") as CustomerProfile[T];
}

function assignStringArray<T extends keyof CustomerProfile>(patch: Partial<CustomerProfile>, key: T, value: unknown) {
  const items = asStringArray(value);
  if (items.length > 0) patch[key] = items as CustomerProfile[T];
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : undefined;
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(asString).filter((item): item is string => Boolean(item));
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function withoutUndefined<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as T;
}
