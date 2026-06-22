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

export function getProfileApiIdentifier(profile: CustomerProfile): { identifierType: ProfileIdentifierType; identifierValue: string } | undefined {
  const preferred = getPreferredIdentifierType();

  if (preferred === "phone" && profile.phone) return { identifierType: "phone", identifierValue: profile.phone };
  if ((preferred === "email" || preferred === "user_id") && profile.email) return { identifierType: preferred, identifierValue: profile.email };
  if (profile.email) return { identifierType: "user_id", identifierValue: profile.email };
  if (profile.phone) return { identifierType: "phone", identifierValue: profile.phone };

  return undefined;
}

export async function fetchMeiroProfile(identifierType: ProfileIdentifierType, identifierValue: string): Promise<ProfileApiResult> {
  const url = new URL(getMeiroProfileApiEndpoint());
  url.searchParams.set("identifier_type", identifierType);
  url.searchParams.set("identifier_value", identifierValue);

  const response = await fetch(url.toString());

  if (!response.ok) throw new Error(`Profile API returned ${response.status}`);

  const raw = await response.json();
  const attributes = extractProfileAttributes(raw);

  return {
    raw,
    attributes,
    profilePatch: mapAttributesToCustomerProfile(attributes),
  };
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

  return Object.fromEntries(Object.entries(attributes).map(([key, value]) => [key, unwrapAttributeValue(value)]));
}

function mapAttributesToCustomerProfile(attributes: Record<string, unknown>): Partial<CustomerProfile> {
  const patch: Partial<CustomerProfile> = {
    profileApiAttributes: attributes,
    profileApiUpdatedAt: new Date().toISOString(),
  };

  assignString(patch, "email", read(attributes, ["email", "user_email"]));
  assignString(patch, "phone", read(attributes, ["phone", "phone_number"]));
  assignString(patch, "firstName", read(attributes, ["first_name", "firstName", "given_name"]));
  assignString(patch, "surname", read(attributes, ["surname", "last_name", "family_name"]));
  assignString(patch, "currentLifeSituation", read(attributes, ["current_life_situation", "life_situation"]));
  assignString(patch, "preferredCategory", read(attributes, ["preferred_category"]));
  assignString(patch, "lifecycleStage", read(attributes, ["lifecycle_stage", "lifecycleStage"]));
  assignString(patch, "categoryAffinity", read(attributes, ["category_affinity", "last_purchased_category", "favorite_category"]));
  assignString(patch, "vipTier", read(attributes, ["vip_tier"]));
  assignString(patch, "predictedReorderDate", read(attributes, ["predicted_reorder_date"]));
  assignString(patch, "lastPurchasedSku", read(attributes, ["last_purchased_sku"]));
  assignString(patch, "lastPurchasedCategory", read(attributes, ["last_purchased_category"]));
  assignString(patch, "referralCode", read(attributes, ["referral_code"]));
  assignString(patch, "nextBestAction", read(attributes, ["next_best_action"]));

  assignNumber(patch, "lifetimeValue", read(attributes, ["lifetime_value", "ltv"]));
  assignNumber(patch, "purchaseCount", read(attributes, ["purchase_count", "total_orders"]));
  assignNumber(patch, "daysSinceLastPurchase", read(attributes, ["days_since_last_purchase"]));

  assignBoolean(patch, "highIntent", read(attributes, ["high_intent", "has_active_cart"]));
  assignBoolean(patch, "hasLeftReview", read(attributes, ["has_left_review"]));
  assignBoolean(patch, "repeatBuyer", read(attributes, ["repeat_buyer", "second_purchase"]));

  assignStringArray(patch, "recentlyViewedCategories", read(attributes, ["recently_viewed_categories", "viewed_categories"]));
  assignStringArray(patch, "recommendedTags", read(attributes, ["recommended_tags", "recommendation_tags"]));
  assignStringArray(patch, "purchases", read(attributes, ["purchased_product_ids", "purchases"]));
  assignStringArray(patch, "nextBestProductIds", read(attributes, ["next_best_product_ids", "recommended_product_ids"]));

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

function unwrapAttributeValue(value: unknown): unknown {
  if (!isRecord(value)) return value;
  if ("value" in value) return value.value;
  if (Array.isArray(value.values)) return value.values;
  return value;
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
