import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const siteUrl = process.env.SITE_URL || process.env.URL || "https://dmostoregpt.netlify.app";
const catalog = JSON.parse(fs.readFileSync(path.join(root, "src/data/vitalyCatalog.json"), "utf8"));
const categoriesSource = fs.readFileSync(path.join(root, "src/data/categories.ts"), "utf8");
const categorySlugs = Object.fromEntries(
  [...categoriesSource.matchAll(/slug: "([^"]+)",\s+name: "([^"]+)"/g)].map((match) => [match[2], match[1]]),
);

const rows = catalog.map((item) => {
  const availability = item.releaseDate && item.stockQty === 0 ? "preorder" : item.stockQty === 0 ? "out of stock" : item.stockQty !== null && item.stockQty <= 4 ? "limited availability" : "in stock";
  const regular = item.compareAtPrice ?? item.price;
  return {
    id: item.id,
    sku: item.id,
    title: item.title,
    description: `${item.brand} ${item.name}${item.detail ? `, ${item.detail}` : ""}. ${item.category} from Vitaly.`,
    link: `${siteUrl}/product/${item.slug}`,
    imageLink: item.image,
    price: `${regular.toFixed(2)} CZK`,
    salePrice: item.compareAtPrice ? `${item.price.toFixed(2)} CZK` : undefined,
    availability,
    condition: item.isSecondChance ? "used" : "new",
    brand: item.brand,
    productType: item.category,
    categorySlug: categorySlugs[item.category] ?? item.category,
    googleProductCategory: "Health & Beauty > Health Care > Fitness & Nutrition > Vitamins & Supplements",
    tags: [item.isVegan ? "vegan" : "", item.isNew ? "new" : "", item.isSecondChance ? "second_chance" : "", item.brand === "VITALY Select" ? "vitaly_select" : ""].filter(Boolean),
    customLabels: [availability.replaceAll(" ", "_"), `pack_days_${item.packDays ?? "na"}`, `rating_${item.rating ?? "na"}`],
  };
});

const generatedAt = new Date().toISOString();
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Vitaly Product Feed</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>Catalog feed for Meiro CDP product recommendations, affinity models, and campaign personalization.</description>
    <lastBuildDate>${generatedAt}</lastBuildDate>
${rows.map(renderItem).join("\n")}
  </channel>
</rss>
`;

fs.writeFileSync(path.join(root, "public/product-feed.xml"), feed);
console.log(`Generated public/product-feed.xml with ${rows.length} products.`);

function renderItem(product) {
  return `    <item>
      <g:id>${escapeXml(product.id)}</g:id>
      <g:item_group_id>${escapeXml(product.productType)}</g:item_group_id>
      <g:mpn>${escapeXml(product.sku)}</g:mpn>
      <g:title>${escapeXml(product.title)}</g:title>
      <g:description>${escapeXml(product.description)}</g:description>
      <g:link>${escapeXml(product.link)}</g:link>
      <g:image_link>${escapeXml(product.imageLink)}</g:image_link>
      <g:availability>${escapeXml(product.availability)}</g:availability>
      <g:condition>${escapeXml(product.condition)}</g:condition>
      <g:price>${escapeXml(product.price)}</g:price>${product.salePrice ? `\n      <g:sale_price>${escapeXml(product.salePrice)}</g:sale_price>` : ""}
      <g:brand>${escapeXml(product.brand)}</g:brand>
      <g:product_type>${escapeXml(product.productType)}</g:product_type>
      <g:google_product_category>${escapeXml(product.googleProductCategory)}</g:google_product_category>
      <g:custom_label_0>${escapeXml(product.tags.join(","))}</g:custom_label_0>
      <g:custom_label_1>${escapeXml(product.customLabels[0])}</g:custom_label_1>
      <g:custom_label_2>${escapeXml(product.customLabels[1])}</g:custom_label_2>
      <g:custom_label_3>${escapeXml(product.customLabels[2])}</g:custom_label_3>
    </item>`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
