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

  if (strategy === "recently_viewed") {
    return state.recentlyViewed
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
    const cartTags = state.cart.flatMap((item) => products.find((product) => product.id === item.productId)?.recommendationTags ?? []);
    scored = scored
      .filter((product) => !state.cart.some((item) => item.productId === product.id))
      .sort((a, b) => b.recommendationTags.filter((tag) => cartTags.includes(tag)).length - a.recommendationTags.filter((tag) => cartTags.includes(tag)).length);
  }

  if (strategy === "next_best_product") {
    const tags = state.profile.recommendedTags;
    scored = scored.sort(
      (a, b) =>
        b.recommendationTags.filter((tag) => tags.includes(tag)).length + b.popularityScore / 100 -
        (a.recommendationTags.filter((tag) => tags.includes(tag)).length + a.popularityScore / 100),
    );
  }

  if (strategy === "frequently_bought_together") {
    scored = scored.sort((a, b) => b.popularityScore + b.marginScore - (a.popularityScore + a.marginScore));
  }

  if (strategy === "high_margin_bestsellers") {
    scored = scored.sort((a, b) => b.marginScore * 1.4 + b.popularityScore - (a.marginScore * 1.4 + a.popularityScore));
  }

  if (strategy === "post_purchase") {
    scored = scored.filter((product) => !state.profile.purchases.includes(product.id)).sort((a, b) => b.popularityScore - a.popularityScore);
  }

  return scored.slice(0, limit);
}
