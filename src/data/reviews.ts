import type { Product } from "../types";

export type Review = {
  id: string;
  author: string;
  city: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  verified: boolean;
};

const authors = [
  ["Tereza", "Prague"], ["Martin", "Brno"], ["Lucie", "Ostrava"], ["Jakub", "Plzeň"], ["Eva", "Olomouc"],
  ["Petra", "Liberec"], ["Tomáš", "České Budějovice"], ["Klára", "Hradec Králové"], ["Ondřej", "Pardubice"], ["Anna", "Zlín"],
] as const;

const pools: Record<string, Array<[string, string]>> = {
  default: [
    ["Does exactly what it says", "Good quality, clear label and it arrived the next day at my pickup point. I will order again."],
    ["Great value", "Compared a few brands and this one has the best price per dose. No aftertaste, easy to take."],
    ["Part of my routine now", "I have been taking it for two months and it is now a fixed part of my morning. Would recommend."],
    ["Fast delivery, well packed", "Ordered on Monday, collected on Tuesday. Nicely packed with a small sample as a bonus."],
  ],
  Magnesium: [
    ["Finally sleeping better", "I take two capsules in the evening and fall asleep much more easily. No stomach issues unlike cheaper magnesium."],
    ["No more cramps", "Calf cramps after running are gone. The bisglycinate form really is gentler."],
    ["Best form I have tried", "Switched from oxide and the difference is noticeable. Calmer evenings and steady energy."],
  ],
  "Herbs & adaptogens": [
    ["Calmer workdays", "After about four weeks I noticed I handle stressful days better. Capsules are easy to swallow."],
    ["Standardised and honest", "I like that the label shows the exact extract strength. Feels like a quality product."],
  ],
  Probiotics: [
    ["Gut feels settled", "Took a course after antibiotics and my digestion was back to normal within a week."],
    ["Kids take it without fuss", "My children have no problem with it and we have had fewer colds this autumn."],
  ],
  "Omega-3": [
    ["No fishy burps", "The lemon flavour works and I have no aftertaste at all. High EPA per capsule too."],
    ["Quality you can taste", "Fresh, clean oil. My cardiologist was happy with my latest results."],
  ],
  "Sports nutrition": [
    ["Mixes perfectly", "No lumps in the shaker, tastes good with plain water. Recovery after leg day is noticeably better."],
    ["Clean label", "No proprietary blends, which is exactly what I want. Strength is up after six weeks."],
  ],
  Cosmetics: [
    ["Gentle on sensitive skin", "No redness, absorbs quickly and the scent is very light. Lovely product."],
    ["Short ingredient list", "Happy to find natural care that actually works. A little goes a long way."],
  ],
  "Eco household": [
    ["Cleans as well as the big brands", "Works great on the kitchen counter and smells fresh, not chemical."],
    ["Love the refill size", "Less plastic and cheaper per wash. Our laundry is soft and clean."],
  ],
  "Organic food": [
    ["Tasty and filling", "Perfect afternoon snack. Not too sweet and the ingredients are simple."],
  ],
};

function hash(text: string) {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

export function reviewsFor(product: Product, count = 3): Review[] {
  const pool = [...(pools[product.category] ?? []), ...pools.default];
  const seed = hash(product.id);
  const average = product.rating ?? 4.6;
  return Array.from({ length: Math.min(count, pool.length) }, (_, index) => {
    const [title, body] = pool[(seed + index * 3) % pool.length];
    const [author, city] = authors[(seed + index * 7) % authors.length];
    const rating = index === 2 && average < 4.8 ? 4 : 5;
    const date = new Date(Date.UTC(2026, 10, 18) - ((seed % 20) + index * 23) * 86400000);
    return { id: `${product.id}-r${index}`, author, city, rating, title, body, date: date.toISOString().slice(0, 10), verified: index !== 1 || seed % 2 === 0 };
  });
}

export function ratingDistribution(product: Product) {
  const total = product.reviewCount;
  const average = product.rating ?? 0;
  const five = Math.max(0, Math.min(1, (average - 3.8) / 1.2));
  const shares = [five, (1 - five) * 0.62, (1 - five) * 0.24, (1 - five) * 0.09, (1 - five) * 0.05];
  return shares.map((share, index) => ({ stars: 5 - index, count: Math.round(share * total) }));
}
