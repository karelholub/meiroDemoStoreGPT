export type StockStatus = "in_stock" | "low_stock" | "fake_sold_out";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  longDescription: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  tags: string[];
  personalityTags: string[];
  recommendationTags: string[];
  stockStatus: StockStatus;
  popularityScore: number;
  marginScore: number;
};

export type Category = {
  slug: string;
  name: string;
  description: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
  cartOpener?: boolean;
};

export type ConsentState = {
  necessary: true;
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
};

export type CustomerProfile = {
  email?: string;
  phone?: string;
  surname?: string;
  firstName?: string;
  currentLifeSituation?: string;
  preferredCategory?: string;
  lifecycleStage: string;
  customerType: "anonymous" | "registered";
  categoryAffinity?: string;
  highIntent?: boolean;
  recentlyViewedCategories: string[];
  recommendedTags: string[];
  purchases: string[];
  vipTier?: string;
  lifetimeValue?: number;
  purchaseCount?: number;
  predictedReorderDate?: string;
  daysSinceLastPurchase?: number;
  lastPurchasedSku?: string;
  lastPurchasedCategory?: string;
  hasLeftReview?: boolean;
  repeatBuyer?: boolean;
  referralCode?: string;
  nextBestProductIds?: string[];
  nextBestAction?: string;
  profileApiAttributes?: Record<string, unknown>;
  profileApiUpdatedAt?: string;
};

export type ProfileApiStatus = {
  state: "idle" | "disabled" | "missing_token" | "loading" | "loaded" | "empty" | "error";
  identifierType?: string;
  identifierValue?: string;
  message?: string;
  updatedAt?: string;
};

export type DemoPersona = {
  id: string;
  name: string;
  description: string;
  profilePatch: Partial<CustomerProfile>;
  consentPatch?: Partial<ConsentState>;
};

export type TrackingEvent = {
  event_name: string;
  timestamp: string;
  [key: string]: unknown;
};

export type RecommendationStrategy =
  | "recently_viewed"
  | "same_category"
  | "similar_tags"
  | "frequently_bought_together"
  | "high_margin_bestsellers"
  | "next_best_product"
  | "cart_cross_sell"
  | "post_purchase";

export type PersonalizationZoneId =
  | "homepage_hero"
  | "homepage_top_banner"
  | "homepage_recommendation_rail"
  | "category_intro_banner"
  | "product_detail_cross_sell"
  | "cart_abandonment_banner"
  | "cart_discount_banner"
  | "checkout_reassurance_banner"
  | "thank_you_next_best_action"
  | "account_lifecycle_banner";

export type PersonalizationDecision = {
  zoneId: PersonalizationZoneId;
  decision: "personalized" | "fallback" | "suppressed";
  content?: string;
  ruleId: string;
  reason: string;
  personaId: string;
  timestamp: string;
};

export type MeiroSdkCall = {
  command: "config" | "consent" | "event" | "set" | "get";
  label: string;
  timestamp: string;
  payload?: unknown;
};
