import type { CartItem, Product } from "../../types";

export const productPayload = (product: Product) => ({
  product_id: product.id,
  product_name: product.name,
  category: product.category,
  price: product.price,
  tags: product.tags,
});

export const cartPayload = (items: CartItem[], products: Product[]) => {
  const enriched = items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product ? { item, product } : undefined;
    })
    .filter(Boolean) as { item: CartItem; product: Product }[];

  return {
    cart_size: enriched.reduce((sum, { item }) => sum + item.quantity, 0),
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
