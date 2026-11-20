import type { AppState } from "../../store/appState";
import type { PersonalizationDecision, PersonalizationZoneId } from "../../types";
import { formatProfileDate } from "../../utils/format";
import { findProductById } from "../../utils/productLookup";

type DecisionInput = Omit<PersonalizationDecision, "personaId" | "timestamp">;

const decision = (input: DecisionInput, state: AppState): PersonalizationDecision => ({
  ...input,
  personaId: state.personaId,
  timestamp: new Date().toISOString(),
});

function hasJourney(state: AppState, name: string) {
  const normalized = name.toLowerCase();
  return state.profile.journeyMembership?.some((item) => item.toLowerCase().includes(normalized));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(value);
}

function normalizedAction(action?: string) {
  return action?.toLowerCase().replaceAll("-", "_").trim();
}

function heroCopyForNextBestAction(action?: string) {
  const normalized = normalizedAction(action);
  if (!normalized) return undefined;

  if (normalized.includes("reorder") || normalized.includes("replenish")) return "Time to restock your daily essentials.";
  if (normalized.includes("recover_cart") || normalized.includes("cart")) return "Your basket is saved and ready when you are.";
  if (normalized.includes("review")) return "How are your new favourites working for you?";
  if (normalized.includes("vip") || normalized.includes("perk") || normalized.includes("early_access")) return "Vitaly Club early access is open.";
  if (normalized.includes("complete_profile")) return "Tell us your goals and we will tailor your picks.";
  if (normalized.includes("browse") || normalized.includes("new_arrivals")) return "New arrivals picked for your routine.";

  return "Your personal picks are ready.";
}

function heroReasonForNextBestAction(action?: string) {
  return action ? `Profile attributes supplied next_best_action (${action}); storefront mapped it to shopper-facing copy.` : "Profile attributes supplied next_best_action.";
}

export function getPersonalizationDecision(zoneId: PersonalizationZoneId, state: AppState): PersonalizationDecision {
  if (!state.consent.personalization) {
    return decision(
      {
        zoneId,
        decision: "suppressed",
        ruleId: "consent.personalization_disabled",
        reason: "Personalization consent is off, so the fallback content is shown.",
      },
      state,
    );
  }

  const profile = state.profile;
  const cartItemIds = [...state.cart.map((item) => item.productId), ...(profile.cartItemIds ?? [])];
  const cartMagnesium = cartItemIds.map((id) => findProductById(id)).find((product) => product?.category === "Magnesium");
  const favoriteCategory = profile.categoryAffinity ?? profile.preferredCategory ?? profile.lastPurchasedCategory;
  const profileSource = profile.profileApiUpdatedAt ? "Profile API" : "local profile";

  if (zoneId === "homepage_hero") {
    const nextBestHero = heroCopyForNextBestAction(profile.nextBestAction);
    if (nextBestHero) {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: nextBestHero,
          ruleId: "profile_api.next_best_action.hero",
          reason: heroReasonForNextBestAction(profile.nextBestAction),
        },
        state,
      );
    }
    if (profile.lifecycleStage === "lapsed_customer" || hasJourney(state, "win-back") || Boolean(profile.daysSinceLastPurchase && profile.daysSinceLastPurchase >= 60)) {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: `${profile.firstName ? `${profile.firstName}, ` : ""}welcome back. Your ${favoriteCategory ?? "favourite"} picks are waiting, with 10 % off your next order.`,
          ruleId: "profile_api.lapsed_customer.hero",
          reason: "Profile attributes indicate a lapsed or win-back customer.",
        },
        state,
      );
    }
    if (profile.hasActiveCart || profile.highIntent) {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: "Still deciding? Your basket is saved, and we ship today.",
          ruleId: "profile_api.active_cart.hero",
          reason: "Profile attributes indicate active cart or high intent.",
        },
        state,
      );
    }
    if (profile.vipTier && ["gold", "platinum"].includes(profile.vipTier.toLowerCase())) {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: "Vitaly Club early access is open.",
          ruleId: "profile_api.vip_hero",
          reason: "Profile attributes supplied a high-value vip_tier.",
        },
        state,
      );
    }
    if (profile.firstName) {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: `${profile.firstName}, your wellness routine, refilled.`,
          ruleId: "profile.first_name_greeting",
          reason: "Registered profile has a first name.",
        },
        state,
      );
    }
    if (state.personaId === "fitness_enthusiast") {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: "Train hard, recover smarter.",
          ruleId: "persona.fitness_enthusiast.hero",
          reason: "Selected demo persona has Sports nutrition affinity and high intent.",
        },
        state,
      );
    }
    if (state.personaId === "family_health") {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: "Healthy habits for the whole family.",
          ruleId: "persona.family_health.hero",
          reason: "Selected demo persona shops kids' vitamins and probiotics.",
        },
        state,
      );
    }
    if (state.personaId === "cart_abandoner") {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: "You left something in your basket. It is still here.",
          ruleId: "persona.cart_abandoner.hero",
          reason: "Selected demo persona is in a cart abandonment lifecycle.",
        },
        state,
      );
    }
  }

  if (zoneId === "homepage_top_banner") {
    if (profile.vipTier) {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: `Vitaly Club ${profile.vipTier}: free shipping on every order and early access to new VITALY Select launches.`,
          ruleId: "profile_api.vip_top_banner",
          reason: "Profile attributes supplied vip_tier.",
        },
        state,
      );
    }
    if (profile.predictedReorderDate) {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: `Running low? Your refill is due around ${formatProfileDate(profile.predictedReorderDate)}.`,
          ruleId: "profile_api.reorder_top_banner",
          reason: "Profile attributes supplied predicted_reorder_date.",
        },
        state,
      );
    }
    if (profile.marketingConsent) {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: "Thanks for subscribing. Look out for member offers in your inbox.",
          ruleId: "profile_api.marketing_consent_banner",
          reason: "Profile attributes supplied marketing_consent.",
        },
        state,
      );
    }
  }

  if (zoneId === "homepage_recommendation_rail") {
    if (profile.nextBestProductIds?.length) {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: "Picked for you",
          ruleId: "profile_api.next_best_product_title",
          reason: "Profile attributes supplied next_best_product_ids.",
        },
        state,
      );
    }
    if (profile.recommendedTags.length > 0 || favoriteCategory) {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: favoriteCategory ? `More ${favoriteCategory.toLowerCase()} you might like` : "Recommended for you",
          ruleId: "profile_api.affinity_recommendation_title",
          reason: "Profile attributes supplied recommendation or category affinity fields.",
        },
        state,
      );
    }
    if (state.personaId === "fitness_enthusiast") {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: "Fuel for your next training block",
          ruleId: "persona.fitness_enthusiast.recommendation_title",
          reason: "Fitness persona recommends sports nutrition and recovery products.",
        },
        state,
      );
    }
    if (profile.recentlyViewedCategories.filter((category) => category === "Magnesium").length >= 3) {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: "Comparing magnesium? These are customer favourites",
          ruleId: "behavior.magnesium_browse_depth",
          reason: "Visitor viewed three or more Magnesium products.",
        },
        state,
      );
    }
  }

  if (zoneId === "category_intro_banner" && favoriteCategory) {
    return decision(
      {
        zoneId,
        decision: "personalized",
        content: `Because you like ${favoriteCategory.toLowerCase()}, we have put our most-loved picks first.`,
        ruleId: "profile_api.category_affinity_intro",
        reason: "Profile attributes supplied category affinity.",
      },
      state,
    );
  }

  if (zoneId === "cart_abandonment_banner" && cartMagnesium) {
    return decision(
      {
        zoneId,
        decision: "personalized",
        content: `Good choice. Pair your ${cartMagnesium.name} with Vitamin D3 for better absorption.`,
        ruleId: "cart.contains_magnesium",
        reason: "Cart contains a Magnesium product.",
      },
      state,
    );
  }

  if (zoneId === "cart_abandonment_banner" && (profile.hasActiveCart || profile.lastAbandonedCartValue)) {
    return decision(
      {
        zoneId,
        decision: "personalized",
        content: profile.lastAbandonedCartValue
          ? `Welcome back. We saved your ${formatMoney(profile.lastAbandonedCartValue)} basket.`
          : "Welcome back. Your basket from last time is saved.",
        ruleId: "profile_api.cart_recovery_banner",
        reason: "Profile attributes supplied active-cart or abandoned-cart fields.",
      },
      state,
    );
  }

  if (zoneId === "cart_discount_banner" && (profile.discountAffinity || state.personaId === "discount_sensitive")) {
    return decision(
      {
        zoneId,
        decision: "personalized",
        content: "Use code VITALY10 for 10 % off today. Ends at midnight.",
        ruleId: profile.discountAffinity ? "profile_api.discount_affinity.cart_discount" : "persona.discount_sensitive.cart_discount",
        reason: profile.discountAffinity ? "Profile attributes indicate discount affinity." : "Selected persona is discount-sensitive.",
      },
      state,
    );
  }

  if (zoneId === "checkout_reassurance_banner") {
    return decision(
      {
        zoneId,
        decision: "personalized",
        content: profile.vipTier
          ? `Vitaly Club ${profile.vipTier}: shipping is on us.`
          : profile.email
            ? `Welcome back. We have prefilled your details for ${profile.email}.`
            : "Secure checkout. Orders before 2 pm ship today.",
        ruleId: profile.vipTier || profile.email ? "profile.checkout_reassurance" : "route.checkout_reassurance",
        reason: profile.vipTier || profile.email ? "Known profile fields can personalize checkout reassurance." : "Checkout route always receives a reassurance message.",
      },
      state,
    );
  }

  if (zoneId === "account_lifecycle_banner") {
    return decision(
      {
        zoneId,
        decision: "personalized",
        content: profile.vipTier
          ? `${profile.vipTier} tier profile: ${profile.purchaseCount ?? 0} orders, ${profile.lifetimeValue ? formatMoney(profile.lifetimeValue) : "value still syncing"}.`
          : `Your stage: ${profile.lifecycleStage.replaceAll("_", " ")}.`,
        ruleId: profile.vipTier ? "profile_api.vip_lifecycle_banner" : "profile.lifecycle_banner",
        reason: profile.vipTier ? "Profile attributes supplied VIP tier and value fields." : "Account page can explain the current lifecycle stage.",
      },
      state,
    );
  }

  if (zoneId === "thank_you_next_best_action") {
    return decision(
      {
        zoneId,
        decision: "personalized",
        content: profile.nextBestAction ?? (profile.lastPurchasedCategory ? `Customers who buy ${profile.lastPurchasedCategory.toLowerCase()} also love these.` : "Join Vitaly Club and get free shipping on your next order."),
        ruleId: profile.nextBestAction || profile.lastPurchasedCategory ? "profile_api.thank_you_next_best_action" : "lifecycle.post_purchase_next_best_action",
        reason: profile.nextBestAction || profile.lastPurchasedCategory ? "Profile attributes supplied next action or purchase category." : "Thank-you page demonstrates post-purchase activation.",
      },
      state,
    );
  }

  return decision(
    {
      zoneId,
      decision: "fallback",
      ruleId: "fallback.default_content",
      reason: "No local personalization rule matched for this zone.",
    },
    state,
  );
}

export function getPersonalization(zoneId: PersonalizationZoneId, state: AppState): string | undefined {
  return getPersonalizationDecision(zoneId, state).content;
}
