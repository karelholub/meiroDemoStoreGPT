import type { AppState } from "../../store/appState";
import type { PersonalizationDecision, PersonalizationZoneId } from "../../types";
import { formatProfileDate } from "../../utils/format";

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
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
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
  const hasMondayKit = cartItemIds.includes("monday-survival-kit");
  const favoriteCategory = profile.categoryAffinity ?? profile.preferredCategory ?? profile.lastPurchasedCategory;
  const profileSource = profile.profileApiUpdatedAt ? "Profile API" : "local profile";

  if (zoneId === "homepage_hero") {
    if (profile.nextBestAction) {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: profile.nextBestAction,
          ruleId: "profile_api.next_best_action.hero",
          reason: `${profileSource} supplied next_best_action.`,
        },
        state,
      );
    }
    if (profile.lifecycleStage === "lapsed_customer" || hasJourney(state, "win-back") || Boolean(profile.daysSinceLastPurchase && profile.daysSinceLastPurchase >= 60)) {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: `${profile.firstName ? `${profile.firstName}, ` : ""}we saved your ${favoriteCategory ?? "favorite"} supplies for a calmer comeback.`,
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
          content: "Your supplies are still waiting. A rare unfinished task with a simple button.",
          ruleId: "profile_api.active_cart.hero",
          reason: "Profile attributes indicate active cart or high intent.",
        },
        state,
      );
    }
    if (profile.firstName) {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: `${profile.firstName}, we kept the supplies discreetly ready.`,
          ruleId: "profile.first_name_greeting",
          reason: "Registered profile has a first name.",
        },
        state,
      );
    }
    if (state.personaId === "marketing_burnout") {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: "Still recovering from the attribution meeting?",
          ruleId: "persona.marketing_burnout.hero",
          reason: "Selected demo persona has Marketing Therapy affinity and high intent.",
        },
        state,
      );
    }
    if (state.personaId === "parenting_chaos") {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: "Supplies for people who have already negotiated with a child before 7 AM.",
          ruleId: "persona.parenting_chaos.hero",
          reason: "Selected demo persona has Parenting & Chaos affinity.",
        },
        state,
      );
    }
    if (state.personaId === "cart_abandoner") {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: "Your cart is still waiting. Unlike most meetings, it has a clear purpose.",
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
          content: `${profile.vipTier} tier unlocked: early access and improbably composed packaging are ready.`,
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
          content: `Reorder reminder: your next replenishment window is ${formatProfileDate(profile.predictedReorderDate)}.`,
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
          content: "You are opted in for gentle lifecycle nudges and fictional launch notes.",
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
          content: "Meiro next-best products for this profile",
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
          content: favoriteCategory ? `Picked for your ${favoriteCategory} affinity` : "Recommended from your Meiro profile tags",
          ruleId: "profile_api.affinity_recommendation_title",
          reason: "Profile attributes supplied recommendation or category affinity fields.",
        },
        state,
      );
    }
    if (state.personaId === "marketing_burnout") {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: "Recommended for your current dashboard fatigue level",
          ruleId: "persona.marketing_burnout.recommendation_title",
          reason: "Marketing burnout persona recommends analytics and meeting recovery products.",
        },
        state,
      );
    }
    if (profile.recentlyViewedCategories.filter((category) => category === "Sleep & Recovery").length >= 3) {
      return decision(
        {
          zoneId,
          decision: "personalized",
          content: "Because your nervous system has opened several tabs",
          ruleId: "behavior.sleep_recovery_depth",
          reason: "Visitor viewed three or more Sleep & Recovery products.",
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
        content: `Your profile leans toward ${favoriteCategory}; this category can shift around that affinity.`,
        ruleId: "profile_api.category_affinity_intro",
        reason: "Profile attributes supplied category affinity.",
      },
      state,
    );
  }

  if (zoneId === "cart_abandonment_banner" && hasMondayKit) {
    return decision(
      {
        zoneId,
        decision: "personalized",
        content: "Your Monday Survival Kit is doing more planning than your calendar.",
        ruleId: "cart.contains_monday_survival_kit",
        reason: "Cart contains Monday Survival Kit.",
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
          ? `Your previous ${formatMoney(profile.lastAbandonedCartValue)} cart can be rebuilt from Meiro cart attributes.`
          : "Meiro says this profile has an active cart, so this slot is ready for recovery messaging.",
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
        content: "A small nudge: bundles currently look more emotionally responsible.",
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
          ? `${profile.vipTier} checkout lane active. Still simulated, now slightly more ceremonious.`
          : profile.email
            ? `Checkout is prefilled for ${profile.email}. The payment remains fictional.`
            : "Checkout is simulated. The relief, regrettably, is still plausible.",
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
          : `Lifecycle stage: ${profile.lifecycleStage.replaceAll("_", " ")}. Meiro would make this useful.`,
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
        content: profile.nextBestAction ?? (profile.lastPurchasedCategory ? `Next best action: cross-sell from ${profile.lastPurchasedCategory}.` : "Next best action: recommend recovery before the next meeting starts."),
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
