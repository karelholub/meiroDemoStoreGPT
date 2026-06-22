import type { CustomerProfile } from "../types";

export type ProfileApiScenario = {
  id: string;
  name: string;
  description: string;
  profilePatch: Partial<CustomerProfile>;
};

const now = () => new Date().toISOString();

export const profileApiScenarios: ProfileApiScenario[] = [
  {
    id: "vip_replenishment",
    name: "VIP replenishment",
    description: "Gold customer with reorder timing, LTV, and next-best products.",
    profilePatch: {
      firstName: "Mira",
      customerType: "registered",
      lifecycleStage: "high_value_customer",
      categoryAffinity: "Sleep & Recovery",
      vipTier: "gold",
      lifetimeValue: 684,
      purchaseCount: 9,
      predictedReorderDate: "2026-07-01",
      lastPurchasedSku: "nervous-system-blanket",
      lastPurchasedCategory: "Sleep & Recovery",
      recommendedTags: ["sleep", "recovery", "comfort"],
      nextBestProductIds: ["strategic-nap-pillow", "low-battery-human-charger", "do-not-perform-mask"],
      nextBestAction: "Gold profile action: invite Mira into the calmest replenishment path.",
      marketingConsent: true,
      journeyMembership: ["vip", "replenishment"],
      profileApiUpdatedAt: now(),
      profileApiAttributes: {
        vip_tier: "gold",
        lifetime_value: 684,
        purchase_count: 9,
        predicted_reorder_date: "2026-07-01",
        last_purchased_sku: "nervous-system-blanket",
        next_best_product_ids: ["strategic-nap-pillow", "low-battery-human-charger", "do-not-perform-mask"],
        next_best_action: "Gold profile action: invite Mira into the calmest replenishment path.",
      },
    },
  },
  {
    id: "cart_recovery",
    name: "Cart recovery",
    description: "High-intent browser with active cart attributes and discount affinity.",
    profilePatch: {
      firstName: "Alex",
      customerType: "registered",
      lifecycleStage: "cart_abandoner",
      categoryAffinity: "Work & Meetings",
      highIntent: true,
      hasActiveCart: true,
      lastAbandonedCartValue: 148,
      cartItemIds: ["monday-survival-kit", "quarterly-planning-flask"],
      discountAffinity: true,
      recommendedTags: ["meeting", "monday", "work", "bundle"],
      nextBestProductIds: ["meeting-email-mug", "calendar-boundary-rope"],
      journeyMembership: ["abandoned-cart", "discount-sensitive"],
      profileApiUpdatedAt: now(),
      profileApiAttributes: {
        has_active_cart: true,
        last_abandoned_cart_value: 148,
        cart_item_ids: ["monday-survival-kit", "quarterly-planning-flask"],
        discount_affinity: true,
        next_best_product_ids: ["meeting-email-mug", "calendar-boundary-rope"],
      },
    },
  },
  {
    id: "review_referral",
    name: "Review and referral",
    description: "Delivered order with repeat-buyer and referral-code fields.",
    profilePatch: {
      firstName: "Nora",
      customerType: "registered",
      lifecycleStage: "post_purchase",
      categoryAffinity: "Marketing Therapy",
      purchases: ["attribution-anxiety-blanket"],
      lastPurchasedSku: "attribution-anxiety-blanket",
      lastPurchasedCategory: "Marketing Therapy",
      deliveryStatus: "delivered",
      repeatBuyer: true,
      hasLeftReview: false,
      referralCode: "MEIRO-GOLD-20",
      recommendedTags: ["marketing", "analytics", "cross-sell"],
      nextBestAction: "Next best action: ask for a review, then reveal the referral code.",
      journeyMembership: ["post-purchase", "review-referral"],
      profileApiUpdatedAt: now(),
      profileApiAttributes: {
        delivery_status: "delivered",
        repeat_buyer: true,
        has_left_review: false,
        referral_code: "MEIRO-GOLD-20",
        last_purchased_sku: "attribution-anxiety-blanket",
        next_best_action: "Next best action: ask for a review, then reveal the referral code.",
      },
    },
  },
];
