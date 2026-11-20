import { useEffect, useState } from "react";
import { findProductById } from "../../utils/productLookup";
import type { Product } from "../../types";
import { getMeiroProfileApiEndpoint, getMptUserIdCookie } from "./meiroProfileApi";

/**
 * Meiro recommendation engine "Vitaly · Picked for you" (key vitaly_for_you), served by the
 * web-perso Profile API endpoint. Levels: cart (bought together with the basket), viewed
 * (viewed together), purchased (complete your routine), popular (bestsellers, also for unknown visitors).
 */
export const MEIRO_ENGINE_KEY = "vitaly_for_you";
/** Product-page engine "Vitaly · Goes with this product": seeded by the viewed item (item_id), not stored on the profile. */
export const MEIRO_PRODUCT_ENGINE_KEY = "vitaly_with_product";

export type EngineItem = { product: Product; levelKey: string; source: string; rank: number };
export type EngineResult = { status: "idle" | "loading" | "ready" | "error"; personalised: boolean; items: EngineItem[]; levelKey?: string };

export const engineLevelLabels: Record<string, string> = {
  cart: "Goes with your basket",
  viewed: "Because you viewed",
  purchased: "Complete your routine",
  popular: "Bestsellers",
  item: "Bought together with this product",
  item_viewed: "Viewed together with this product",
};

type RawItem = { item_id: string; level_key?: string; source?: string; rank?: number };

export function useMeiroRecommendations(options: { itemId?: string; refreshKey?: string; enabled?: boolean; engineKey?: string } = {}): EngineResult {
  const { itemId, refreshKey = "", enabled = true, engineKey = MEIRO_ENGINE_KEY } = options;
  const [result, setResult] = useState<EngineResult>({ status: "idle", personalised: false, items: [] });

  useEffect(() => {
    if (!enabled || import.meta.env.VITE_MEIRO_PROFILE_API_ENABLED === "false") return;
    let cancelled = false;
    const url = new URL(getMeiroProfileApiEndpoint(), window.location.origin);
    url.searchParams.set("identifier_type", "user_id");
    url.searchParams.set("identifier_value", getMptUserIdCookie() ?? "anonymous-visitor");
    url.searchParams.set("recommendations", engineKey);
    if (itemId) url.searchParams.set("item_id", itemId);
    setResult((current) => ({ ...current, status: "loading" }));

    fetch(url.toString())
      .then(async (response) => {
        if (!response.ok || !(response.headers.get("content-type") ?? "").includes("json")) throw new Error(`HTTP ${response.status}`);
        const body = await response.json();
        const engine = body?.recommendations?.[engineKey];
        const items: EngineItem[] = ((engine?.items ?? []) as RawItem[])
          .map((raw) => ({ product: findProductById(raw.item_id), levelKey: raw.level_key ?? "popular", source: raw.source ?? "", rank: raw.rank ?? 0 }))
          .filter((row): row is EngineItem => Boolean(row.product) && row.product!.id !== itemId && row.product!.stockStatus !== "out_of_stock");
        if (!cancelled) setResult({ status: "ready", personalised: Boolean(engine?.personalised), items, levelKey: items[0]?.levelKey });
      })
      .catch(() => {
        if (!cancelled) setResult({ status: "error", personalised: false, items: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [itemId, refreshKey, enabled, engineKey]);

  return result;
}
