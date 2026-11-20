import type { Category } from "../types";

/**
 * Vitaly category tree. Names match the `category` field of the
 * "Vitaly · Products" catalog on meiro-demo, so catalog feeds, audiences and
 * category_affinity attributes line up with what the storefront tracks.
 */
export const categories: Category[] = [
  {
    slug: "vitamins-minerals",
    name: "Vitamins & minerals",
    description: "Everyday foundations: vitamin D, C, B-complex, zinc and iron in forms your body actually uses.",
    image: "/assets/lifestyle/vitamins-minerals.jpg",
    imageAlt: "Soft-gel and capsule supplements spilling from a bottle",
  },
  {
    slug: "magnesium",
    name: "Magnesium",
    description: "Bisglycinate, malate and L-threonate for calmer evenings, steady energy and recovery.",
    image: "/assets/lifestyle/magnesium.jpg",
    imageAlt: "Person meditating on a jetty at sunrise",
  },
  {
    slug: "herbs-adaptogens",
    name: "Herbs & adaptogens",
    description: "Ashwagandha, maca, milk thistle and tinctures for stress, focus and balance.",
    image: "/assets/lifestyle/herbs-adaptogens.jpg",
    imageAlt: "Amber dropper bottle of herbal tincture in soft daylight",
  },
  {
    slug: "probiotics",
    name: "Probiotics",
    description: "Multi-strain cultures for gut comfort, immunity and daily digestion.",
    image: "/assets/lifestyle/probiotics.jpg",
    imageAlt: "Overnight oats with fruit in a glass jar",
  },
  {
    slug: "omega-3",
    name: "Omega-3",
    description: "Fish and algae oils with high EPA and DHA for heart, brain and eyes.",
    image: "/assets/lifestyle/omega-3.jpg",
    imageAlt: "Colourful bowl of grains, vegetables and seeds",
  },
  {
    slug: "sports-nutrition",
    name: "Sports nutrition",
    description: "Creatine, proteins and amino acids that support strength and recovery.",
    image: "/assets/lifestyle/sports-nutrition.jpg",
    imageAlt: "Athlete preparing to lift a barbell in the gym",
  },
  {
    slug: "organic-food",
    name: "Organic food",
    description: "Organic snacks, superfoods and drinks for a cleaner pantry.",
    image: "/assets/lifestyle/organic-food.jpg",
    imageAlt: "Breakfast table with avocado, eggs and salad",
  },
  {
    slug: "cosmetics",
    name: "Cosmetics",
    description: "Natural skin, hair and body care with short, honest ingredient lists.",
    image: "/assets/lifestyle/cosmetics.jpg",
    imageAlt: "Tube of natural face cream on white linen",
  },
  {
    slug: "eco-household",
    name: "Eco household",
    description: "Plant-based cleaners, refills and laundry care that are kind to your home.",
    image: "/assets/lifestyle/eco-household.jpg",
    imageAlt: "Handmade soap bars wrapped in paper with dried lavender",
  },
];

export type Collection = {
  slug: string;
  name: string;
  description: string;
};

/** Merchandising collections that mirror the saved catalog feeds on the instance. */
export const collections: Collection[] = [
  { slug: "vitaly-select", name: "VITALY Select", description: "Our own line: clean formulas, vegan capsules and fair prices, developed with pharmacists." },
  { slug: "bestsellers", name: "Bestsellers", description: "The products our customers reorder most, ranked by reviews." },
  { slug: "new", name: "New in", description: "Fresh arrivals and upcoming VITALY Select launches you can pre-order." },
  { slug: "second-chance", name: "Second chance", description: "Same quality, lower price. Short-dated or damaged packaging, and we always tell you why." },
];

export function categorySlug(name: string) {
  return categories.find((category) => category.name === name)?.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
