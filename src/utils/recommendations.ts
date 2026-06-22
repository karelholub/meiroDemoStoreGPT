import { products } from "../data/products";
import type { AppState } from "../store/appState";
import type { Product, RecommendationStrategy } from "../types";

export function recommendProducts(
  strategy: RecommendationStrategy,
  state: AppState,
  options: { currentProductId?: string; category?: string; limit?: number } = {},
): Product[] {
  const limit = options.limit ?? 4;
  const current = products.find((product) => product.id === options.currentProductId);
  let scored = products.filter((product) => product.id !== options.currentProductId);
  const profileCategory = state.profile.categoryAffinity ?? state.profile.preferredCategory ?? state.profile.lastPurchasedCategory;
  const purchasedIds = new Set([...(state.profile.purchases ?? []), state.profile.lastPurchasedSku].filter(Boolean));

  if (strategy === "recently_viewed") {
    return [state.profile.lastViewedProductId, ...state.recentlyViewed]
      .filter((id): id is string => Boolean(id))
      .filter((id, index, ids) => ids.indexOf(id) === index)
      .map((id) => products.find((product) => product.id === id))
      .filter(Boolean)
      .slice(0, limit) as Product[];
  }

  if (strategy === "same_category" && (options.category || current?.category)) {
    scored = scored.filter((product) => product.category === (options.category ?? current?.category));
  }

  if (strategy === "similar_tags" && current) {
    scored = scored.sort(
      (a, b) =>
        b.recommendationTags.filter((tag) => current.recommendationTags.includes(tag)).length -
        a.recommendationTags.filter((tag) => current.recommendationTags.includes(tag)).length,
    );
  }

  if (strategy === "cart_cross_sell") {
    const profileCartItems = state.profile.cartItemIds ?? [];
    const activeCartIds = [...state.cart.map((item) => item.productId), ...profileCartItems];
    const cartTags = activeCartIds.flatMap((productId) => products.find((product) => product.id === productId)?.recommendationTags ?? []);
    scored = scored
      .filter((product) => !activeCartIds.includes(product.id))
      .sort((a, b) => scoreTagOverlap(b, cartTags) - scoreTagOverlap(a, cartTags));
  }

  if (strategy === "next_best_product") {
    if (state.profile.nextBestProductIds?.length) {
      const nextBest = state.profile.nextBestProductIds
        .map((id) => products.find((product) => product.id === id || product.slug === id))
        .filter(Boolean)
        .slice(0, limit) as Product[];
      if (nextBest.length > 0) return nextBest;
    }

    const tags = [...state.profile.recommendedTags, ...(profileCategory ? [profileCategory] : [])];
    scored = scored.sort(
      (a, b) =>
        scoreTagOverlap(b, tags) + categoryBoost(b, profileCategory) + b.popularityScore / 100 -
        (scoreTagOverlap(a, tags) + categoryBoost(a, profileCategory) + a.popularityScore / 100),
    );
  }

  if (strategy === "frequently_bought_together") {
    scored = scored.sort((a, b) => b.popularityScore + b.marginScore - (a.popularityScore + a.marginScore));
  }

  if (strategy === "high_margin_bestsellers") {
    scored = scored.sort((a, b) => b.marginScore * 1.4 + b.popularityScore - (a.marginScore * 1.4 + a.popularityScore));
  }

  if (strategy === "post_purchase") {
    scored = scored.filter((product) => !purchasedIds.has(product.id)).sort((a, b) => categoryBoost(b, profileCategory) + b.popularityScore / 100 - (categoryBoost(a, profileCategory) + a.popularityScore / 100));
  }

  return scored.slice(0, limit);
}

function scoreTagOverlap(product: Product, tags: string[]) {
  const normalizedTags = tags.map((tag) => tag.toLowerCase());
  return product.recommendationTags.filter((tag) => normalizedTags.includes(tag.toLowerCase())).length;
}

function categoryBoost(product: Product, category?: string) {
  return category && product.category.toLowerCase() === category.toLowerCase() ? 2 : 0;
}
