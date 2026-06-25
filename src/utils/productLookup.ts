import { products } from "../data/products";
import type { CartItem, Product } from "../types";

export type EnrichedCartItem = {
  item: CartItem;
  product: Product;
};

const productsById = new Map(products.map((product) => [product.id, product]));
const productsBySlug = new Map(products.map((product) => [product.slug, product]));

export function findProductById(id?: string) {
  return id ? productsById.get(id) : undefined;
}

export function findProductByIdOrSlug(value?: string) {
  return value ? productsById.get(value) ?? productsBySlug.get(value) : undefined;
}

export function findProductsByIds(ids: readonly string[] = []) {
  return ids.map((id) => findProductById(id)).filter((product): product is Product => Boolean(product));
}

export function findProductsByIdsOrSlugs(ids: readonly string[] = []) {
  return ids.map((id) => findProductByIdOrSlug(id)).filter((product): product is Product => Boolean(product));
}

export function enrichCartItems(items: readonly CartItem[]): EnrichedCartItem[] {
  return items
    .map((item) => {
      const product = findProductById(item.productId);
      return product ? { item, product } : undefined;
    })
    .filter((entry): entry is EnrichedCartItem => Boolean(entry));
}

export function cartItemCount(items: readonly CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartTotal(items: readonly CartItem[]) {
  return enrichCartItems(items).reduce((sum, { item, product }) => sum + item.quantity * product.price, 0);
}
