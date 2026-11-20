const czk = new Intl.NumberFormat("en-US", { style: "currency", currency: "CZK", maximumFractionDigits: 0 });

export const formatCzk = (value: number) => czk.format(value);

export function Money({ value, className }: { value: number; className?: string }) {
  return <span className={className}>{formatCzk(value)}</span>;
}

export const FREE_SHIPPING_THRESHOLD = 1500;
export const FREE_GIFT_THRESHOLD = 1200;

export const shippingOptions = [
  { id: "pickup_point", label: "Pickup point", detail: "Collect from 9,000+ pickup points, usually next day", price: 69 },
  { id: "home_delivery", label: "Home delivery", detail: "Courier to your door, 1–2 working days", price: 99 },
  { id: "express_same_day", label: "Same-day express", detail: "Prague and Brno, order before 2 pm", price: 149 },
] as const;

export const paymentOptions = [
  { id: "card_demo", label: "Card", detail: "Demo card ending 0000. No real payment is taken." },
  { id: "bank_transfer", label: "Bank transfer", detail: "We send payment details by email." },
  { id: "cash_on_delivery", label: "Cash on delivery", detail: "Pay when you collect. CZK 39 fee." },
] as const;
