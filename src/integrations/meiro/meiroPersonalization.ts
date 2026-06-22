import type { AppState } from "../../store/appState";
import type { PersonalizationDecision, PersonalizationZoneId } from "../../types";

type DecisionInput = Omit<PersonalizationDecision, "personaId" | "timestamp">;

const decision = (input: DecisionInput, state: AppState): PersonalizationDecision => ({
  ...input,
  personaId: state.personaId,
  timestamp: new Date().toISOString(),
});

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
  const hasMondayKit = state.cart.some((item) => item.productId === "monday-survival-kit");

  if (zoneId === "homepage_hero") {
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

  if (zoneId === "homepage_recommendation_rail") {
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

  if (zoneId === "cart_discount_banner" && state.personaId === "discount_sensitive") {
    return decision(
      {
        zoneId,
        decision: "personalized",
        content: "A small nudge: bundles currently look more emotionally responsible.",
        ruleId: "persona.discount_sensitive.cart_discount",
        reason: "Selected persona is discount-sensitive.",
      },
      state,
    );
  }

  if (zoneId === "checkout_reassurance_banner") {
    return decision(
      {
        zoneId,
        decision: "personalized",
        content: "Checkout is simulated. The relief, regrettably, is still plausible.",
        ruleId: "route.checkout_reassurance",
        reason: "Checkout route always receives a reassurance message.",
      },
      state,
    );
  }

  if (zoneId === "account_lifecycle_banner") {
    return decision(
      {
        zoneId,
        decision: "personalized",
        content: `Lifecycle stage: ${profile.lifecycleStage.replaceAll("_", " ")}. Meiro would make this useful.`,
        ruleId: "profile.lifecycle_banner",
        reason: "Account page can explain the current lifecycle stage.",
      },
      state,
    );
  }

  if (zoneId === "thank_you_next_best_action") {
    return decision(
      {
        zoneId,
        decision: "personalized",
        content: "Next best action: recommend recovery before the next meeting starts.",
        ruleId: "lifecycle.post_purchase_next_best_action",
        reason: "Thank-you page demonstrates post-purchase activation.",
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
