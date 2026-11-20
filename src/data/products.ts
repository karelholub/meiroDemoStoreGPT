import type { Product, StockStatus } from "../types";
import catalog from "./vitalyCatalog.json";

/**
 * Raw items exported from the "Vitaly · Products" catalog on meiro-demo
 * (catalog b50a0dd7-5fab-487c-b3a7-fbb7596801e2). `id` is the catalog
 * external id, so every `item_id` the storefront sends to Meiro matches the
 * catalog, saved feeds and product-level attributes.
 */
type CatalogItem = {
  id: string;
  slug: string;
  title: string;
  name: string;
  detail: string;
  brand: string;
  category: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  rating: number | null;
  reviewCount: number;
  packDays: number | null;
  stockQty: number | null;
  isVegan: boolean;
  isNew: boolean;
  isOnSale: boolean;
  isSecondChance: boolean;
  secondChanceReason: string | null;
  modelFamily: string | null;
  complementaryCategories: string[];
  releaseDate: string | null;
};

const categoryCopy: Record<string, { short: string; long: string; benefits: string[]; tags: string[] }> = {
  "Vitamins & minerals": {
    short: "A clean, well-absorbed daily essential for energy, immunity and long-term health.",
    long: "Chosen for bioavailable forms and sensible doses, without unnecessary fillers. Take it with a meal and build it into your morning routine.",
    benefits: ["Bioavailable, clinically studied form", "Supports immunity and energy metabolism", "No artificial colours or fillers"],
    tags: ["immunity", "energy", "daily"],
  },
  Magnesium: {
    short: "Gentle, well-tolerated magnesium for relaxed muscles, deeper sleep and steady energy.",
    long: "Chelated forms such as bisglycinate and malate are easy on the stomach and absorb well. Take the calming forms in the evening and the energising ones in the morning.",
    benefits: ["Helps reduce tiredness and fatigue", "Supports normal muscle and nerve function", "Gentle on digestion"],
    tags: ["sleep", "stress", "recovery"],
  },
  "Herbs & adaptogens": {
    short: "Standardised botanical extracts that help your body adapt to stress and stay balanced.",
    long: "Every extract is standardised for its active compounds, so each dose is consistent. Give adaptogens four to eight weeks of daily use to notice the difference.",
    benefits: ["Standardised active compounds", "Supports resilience to everyday stress", "Traditional botanicals, modern quality control"],
    tags: ["stress", "focus", "balance"],
  },
  Probiotics: {
    short: "Live cultures for gut comfort, regular digestion and a stronger immune system.",
    long: "Multi-strain formulas with a guaranteed CFU count until the end of shelf life. Best taken on an empty stomach, ideally in the morning.",
    benefits: ["Guaranteed live cultures", "Supports digestion and gut flora", "Acid-resistant delivery"],
    tags: ["gut", "immunity", "digestion"],
  },
  "Omega-3": {
    short: "High-purity EPA and DHA for heart, brain and eye health.",
    long: "Molecularly distilled for purity and tested for heavy metals. Natural lemon flavour keeps it fresh, without fishy aftertaste.",
    benefits: ["High EPA and DHA per serving", "Purity tested for heavy metals", "Supports heart and brain function"],
    tags: ["heart", "brain", "focus"],
  },
  "Sports nutrition": {
    short: "Performance and recovery support for training days and rest days alike.",
    long: "Clean sports nutrition with transparent labels: no proprietary blends, no hidden extras. Mix it into water, milk or your favourite smoothie.",
    benefits: ["Supports strength and muscle recovery", "Transparent label, no proprietary blends", "Easy to mix"],
    tags: ["fitness", "recovery", "protein"],
  },
  "Organic food": {
    short: "Certified organic pantry favourites for snacking and cooking well.",
    long: "Certified organic, made from simple ingredients and full of flavour. A small upgrade to everyday eating that adds up.",
    benefits: ["Certified organic", "Simple, recognisable ingredients", "Great for on-the-go snacking"],
    tags: ["organic", "snack", "pantry"],
  },
  Cosmetics: {
    short: "Natural care with short ingredient lists that skin understands.",
    long: "Gentle formulas based on botanical oils and extracts, dermatologically tested and free from harsh additives. Suitable for daily use.",
    benefits: ["Natural, plant-based ingredients", "Dermatologically tested", "Free from harsh additives"],
    tags: ["skincare", "natural", "selfcare"],
  },
  "Eco household": {
    short: "Plant-based cleaning and home care that is tough on dirt and kind to the planet.",
    long: "Biodegradable, plant-based formulas in recyclable packaging. Refill sizes cut plastic waste and cost.",
    benefits: ["Biodegradable plant-based formula", "Recyclable packaging and refill sizes", "Safe around kids and pets"],
    tags: ["eco", "home", "refill"],
  },
};

/**
 * Launch items carry a fixed release_date in the catalog. The demo keeps them
 * "upcoming": a date that has already passed rolls forward in 30-day steps so
 * the storefront always shows a future launch date for unreleased stock.
 */
function rollingReleaseDate(item: CatalogItem) {
  if (!item.releaseDate) return undefined;
  const date = new Date(`${item.releaseDate}T00:00:00Z`);
  if (item.stockQty !== 0) return item.releaseDate;
  const today = new Date();
  while (date <= today) date.setUTCDate(date.getUTCDate() + 30);
  return date.toISOString().slice(0, 10);
}

function stockStatus(item: CatalogItem): StockStatus {
  if (item.releaseDate && item.stockQty === 0) return "preorder";
  if (item.stockQty === 0) return "out_of_stock";
  if (item.stockQty !== null && item.stockQty <= 4) return "low_stock";
  return "in_stock";
}

function popularity(reviewCount: number) {
  return Math.min(100, Math.round((Math.log10(reviewCount + 1) / Math.log10(800)) * 100));
}

function toProduct(item: CatalogItem): Product {
  const copy = categoryCopy[item.category] ?? categoryCopy["Vitamins & minerals"];
  const isSelect = item.brand === "VITALY Select";
  const supply = item.packDays ? `One pack lasts about ${item.packDays} days.` : "";
  const secondChance = item.isSecondChance && item.secondChanceReason ? ` ${item.secondChanceReason}: the product itself is in perfect condition.` : "";
  const tags = [
    ...copy.tags,
    item.category.toLowerCase(),
    item.brand.toLowerCase(),
    ...(item.isVegan ? ["vegan"] : []),
    ...(item.isNew ? ["new"] : []),
    ...(item.isOnSale || item.compareAtPrice ? ["sale"] : []),
    ...(item.isSecondChance ? ["second chance"] : []),
    ...(isSelect ? ["vitaly select"] : []),
  ];
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    name: item.name,
    detail: item.detail,
    brand: item.brand,
    category: item.category,
    shortDescription: copy.short,
    longDescription: `${isSelect ? "Part of VITALY Select, our own line developed with pharmacists. " : ""}${copy.long} ${supply}${secondChance}`.trim(),
    benefits: isSelect ? [...copy.benefits.slice(0, 2), "Vegan capsules, made in the EU"] : copy.benefits,
    price: item.price,
    compareAtPrice: item.compareAtPrice ?? undefined,
    image: item.image,
    rating: item.rating ?? undefined,
    reviewCount: item.reviewCount,
    packDays: item.packDays ?? undefined,
    stockQty: item.stockQty ?? undefined,
    isVegan: item.isVegan,
    isNew: item.isNew,
    isSecondChance: item.isSecondChance,
    secondChanceReason: item.secondChanceReason ?? undefined,
    releaseDate: rollingReleaseDate(item),
    complementaryCategories: item.complementaryCategories,
    tags,
    personalityTags: copy.tags,
    recommendationTags: [...tags, ...item.complementaryCategories.map((category) => category.toLowerCase())],
    stockStatus: stockStatus(item),
    popularityScore: popularity(item.reviewCount),
    marginScore: isSelect ? 85 : item.isSecondChance ? 40 : 60,
  };
}

export const products: Product[] = (catalog as CatalogItem[]).map(toProduct);

export const isPurchasable = (product: Product) => product.stockStatus !== "out_of_stock";
