import { products } from "../data/products";
import { useAppState } from "../store/appState";
import { formatProfileDate } from "../utils/format";
import { findProductByIdOrSlug, findProductsByIds } from "../utils/productLookup";
import { ProductImage, productUrl } from "../ui/components";
import { formatCzk } from "../ui/format";
import { ArrowIcon } from "../ui/icons";
import { Link } from "../ui/router";

/**
 * Profile-driven lifecycle surfaces (replenishment, VIP / Vitaly Club, win-back).
 * They read the same Profile API attributes as before: predicted_reorder_date,
 * last_purchased_sku, vip_tier, lifetime_value, purchase_count,
 * days_since_last_purchase, journey_membership.
 */
export function LifecycleSlots({ compact = false }: { compact?: boolean }) {
  const state = useAppState();
  const { profile } = state;
  const recentCategories = profile.recentlyViewedCategories;
  const favoriteCategory = profile.categoryAffinity ?? profile.preferredCategory ?? recentCategories[0] ?? "Magnesium";
  const reorderProduct =
    findProductByIdOrSlug(profile.lastPurchasedSku) ??
    findProductsByIds(profile.purchases)[0] ??
    products.find((product) => product.category === favoriteCategory && product.brand === "VITALY Select") ??
    products[0];
  const categoryPicks = products.filter((product) => product.category === favoriteCategory && product.stockStatus !== "out_of_stock").slice(0, 3);
  const lapsed =
    state.personaId === "lapsed_customer" ||
    profile.lifecycleStage === "lapsed_customer" ||
    profile.journeyMembership?.some((item) => item.toLowerCase().includes("win-back")) ||
    Boolean(profile.daysSinceLastPurchase && profile.daysSinceLastPurchase >= 60);
  const vip = state.personaId === "high_value" || profile.lifecycleStage === "high_value_customer" || ["gold", "platinum"].includes(String(profile.vipTier ?? "").toLowerCase());
  const reorderDate = formatProfileDate(profile.predictedReorderDate);
  const reorderHint = profile.predictedReorderDate
    ? `Your refill is due around ${reorderDate}.`
    : profile.daysSinceLastPurchase
      ? `It has been ${profile.daysSinceLastPurchase} days since your last order.`
      : "Set up a refill reminder and never run out.";

  return (
    <section className={compact ? "lifecycle compact" : "lifecycle"} aria-label="Your Vitaly">
      {!compact && <h2 className="lifecycle-title">Your Vitaly</h2>}
      <div className="lifecycle-grid">
        <article className="life-card life-refill" data-slot="replenishment">
          <p className="kicker">Refill reminder</p>
          <h3>{profile.predictedReorderDate ? "Time to restock soon" : "Never run out"}</h3>
          <p>{reorderHint}</p>
          <Link to={productUrl(reorderProduct)} className="life-product">
            <ProductImage product={reorderProduct} size="thumb" />
            <span><strong>{reorderProduct.name}</strong><small>{reorderProduct.packDays ? `Lasts ${reorderProduct.packDays} days` : reorderProduct.brand}</small></span>
            <ArrowIcon size={16} />
          </Link>
        </article>
        <article className={vip ? "life-card life-club is-active" : "life-card life-club"} data-slot="vip">
          <p className="kicker">{vip ? `Vitaly Club ${profile.vipTier ?? "Gold"}` : "Vitaly Club"}</p>
          <h3>{vip ? "Early access is unlocked" : "Free shipping and early access"}</h3>
          <p>
            {profile.vipTier
              ? `${profile.purchaseCount ?? 0} orders · ${profile.lifetimeValue ? formatCzk(profile.lifetimeValue) : "value syncing"} lifetime. Free shipping on every order.`
              : "Members collect points on every order, get free shipping over CZK 990 and first access to new VITALY Select launches."}
          </p>
          <Link to={vip ? "/collections/new" : "/register"} className="text-link">{vip ? "See early-access launches" : "Join for free"} <ArrowIcon size={16} /></Link>
        </article>
        <article className={lapsed ? "life-card life-winback is-active" : "life-card life-winback"} data-slot="win-back">
          <p className="kicker">{lapsed ? "Welcome back" : `Because you like ${favoriteCategory.toLowerCase()}`}</p>
          <h3>{lapsed ? "10 % off your comeback order" : `Top ${favoriteCategory.toLowerCase()} picks`}</h3>
          <p>{lapsed && profile.daysSinceLastPurchase ? `We have missed you for ${profile.daysSinceLastPurchase} days. ` : ""}Hand-picked from our bestsellers{lapsed ? ". Code WELCOMEBACK at checkout." : "."}</p>
          <div className="life-thumbs">
            {categoryPicks.map((product) => (
              <Link key={product.id} to={productUrl(product)} aria-label={product.name}><ProductImage product={product} size="thumb" /></Link>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
