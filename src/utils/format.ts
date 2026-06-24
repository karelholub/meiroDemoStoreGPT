const readableDate = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatProfileDate(value?: string) {
  if (!value) return undefined;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;

  return readableDate.format(date);
}

export function formatMaybeProfileDate(value: unknown) {
  if (typeof value !== "string") return value;
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  return formatProfileDate(value) ?? value;
}
