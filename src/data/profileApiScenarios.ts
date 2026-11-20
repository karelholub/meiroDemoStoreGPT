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
      categoryAffinity: "Magnesium",
      vipTier: "gold",
      lifetimeValue: 14820,
      purchaseCount: 9,
      predictedReorderDate: "2026-12-02",
      lastPurchasedSku: "natima-3020",
      lastPurchasedCategory: "Magnesium",
      recommendedTags: ["sleep", "stress", "vitaly select"],
      nextBestProductIds: ["natima-12433", "natima-11552", "natima-8366"],
      nextBestAction: "reorder: Magnesium Bisglycinate runs out in 12 days",
      marketingConsent: true,
      journeyMembership: ["vip", "replenishment"],
      profileApiUpdatedAt: now(),
      profileApiAttributes: {
        vip_tier: "gold",
        lifetime_value: 684,
        purchase_count: 9,
        predicted_reorder_date: "2026-12-02",
        last_purchased_sku: "natima-3020",
        next_best_product_ids: ["natima-12433", "natima-11552", "natima-8366"],
        next_best_action: "reorder: Magnesium Bisglycinate runs out in 12 days",
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
      categoryAffinity: "Omega-3",
      highIntent: true,
      hasActiveCart: true,
      lastAbandonedCartValue: 1398,
      cartItemIds: ["natima-19437", "natima-6459"],
      discountAffinity: true,
      recommendedTags: ["heart", "brain", "immunity", "bundle"],
      nextBestProductIds: ["natima-8201", "natima-6072"],
      journeyMembership: ["abandoned-cart", "discount-sensitive"],
      profileApiUpdatedAt: now(),
      profileApiAttributes: {
        has_active_cart: true,
        last_abandoned_cart_value: 1398,
        cart_item_ids: ["natima-19437", "natima-6459"],
        discount_affinity: true,
        next_best_product_ids: ["natima-8201", "natima-6072"],
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
      categoryAffinity: "Herbs & adaptogens",
      purchases: ["natima-8366"],
      lastPurchasedSku: "natima-8366",
      lastPurchasedCategory: "Herbs & adaptogens",
      deliveryStatus: "delivered",
      repeatBuyer: true,
      hasLeftReview: false,
      referralCode: "VITALY-MIRA-15",
      recommendedTags: ["stress", "focus", "balance"],
      nextBestAction: "review: ask for a review, then reveal the referral code",
      journeyMembership: ["post-purchase", "review-referral"],
      profileApiUpdatedAt: now(),
      profileApiAttributes: {
        delivery_status: "delivered",
        repeat_buyer: true,
        has_left_review: false,
        referral_code: "VITALY-MIRA-15",
        last_purchased_sku: "natima-8366",
        next_best_action: "review: ask for a review, then reveal the referral code",
      },
    },
  },
];
