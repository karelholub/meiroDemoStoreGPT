import type { CartItem, Product } from "../../types";
import { cartItemCount, enrichCartItems } from "../../utils/productLookup";

export const productPayload = (product: Product) => ({
  product_id: product.id,
  product_name: product.name,
  category: product.category,
  price: product.price,
  tags: product.tags,
});

export const cartPayload = (items: CartItem[]) => {
  const enriched = enrichCartItems(items);
  return {
    cart_size: cartItemCount(items),
    cart_value: enriched.reduce((sum, { item, product }) => sum + item.quantity * product.price, 0),
    items: enriched.map(({ item, product }) => ({
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: product.price,
      quantity: item.quantity,
    })),
    cart_opener: enriched.find(({ item }) => item.cartOpener)?.product.id,
  };
};
