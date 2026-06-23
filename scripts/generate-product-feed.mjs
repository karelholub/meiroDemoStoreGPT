import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const siteUrl = process.env.SITE_URL || process.env.URL || "https://dmostoregpt.netlify.app";
const productsSource = fs.readFileSync(path.join(root, "src/data/products.ts"), "utf8");
const categoriesSource = fs.readFileSync(path.join(root, "src/data/categories.ts"), "utf8");

const categorySlugs = Object.fromEntries(
  [...categoriesSource.matchAll(/slug: "([^"]+)",\s+name: "([^"]+)"/g)].map((match) => [match[2], match[1]]),
);

const baseDescriptions = {
  work: "A composed little object for surviving workplace rituals while appearing beautifully prepared.",
  chaos: "Designed for tiny domestic emergencies, large feelings, and the mysterious physics of school mornings.",
  sleep: "A softer way to tell your body the day has technically ended.",
  wellness: "For people who say they are fine with the confidence of a collapsing spreadsheet.",
  marketing: "A premium salve for dashboards, segments, acronyms, and performance optimism.",
  dopamine: "A compact spark of relief, wrapped with entirely too much dignity.",
  gifts: "The thoughtful gift that says: I noticed the subtext and brought supplies.",
};

const rows = [...productsSource.matchAll(/make\("([^"]+)", "([^"]+)", "([^"]+)", (\d+), \[([^\]]*)\], "([^"]+)", (\d+), (\d+)\)/g)].map((match) => {
  const [, id, name, category, price, tagsSource, copyKey, popularityScore, marginScore] = match;
  const priceNumber = Number(price);
  const popularity = Number(popularityScore);
  const tags = [...tagsSource.matchAll(/"([^"]+)"/g)].map((tagMatch) => tagMatch[1]);
  const categorySlug = categorySlugs[category] || id;
  const stockStatus = popularity > 90 ? "low_stock" : popularity < 38 ? "out_of_stock" : "in_stock";

  return {
    id,
    sku: id,
    title: name,
    description: `${baseDescriptions[copyKey]} Finished in calm packaging, restrained copy, and enough plausible utility to anchor a very real customer journey.`,
    link: `${siteUrl}/product/${id}`,
    imageLink: `${siteUrl}/assets/products/${categorySlug}.jpg`,
    price: `${priceNumber.toFixed(2)} EUR`,
    salePrice: popularity > 86 ? `${priceNumber.toFixed(2)} EUR` : undefined,
    compareAtPrice: popularity > 86 ? `${(priceNumber + 18).toFixed(2)} EUR` : undefined,
    availability: stockStatus === "out_of_stock" ? "out of stock" : stockStatus === "low_stock" ? "limited availability" : "in stock",
    condition: "new",
    brand: "Existential Supplies Co.",
    productType: category,
    googleProductCategory: "Home & Garden",
    tags,
    customLabels: [stockStatus, `margin_${marginScore}`, `popularity_${popularity}`],
  };
});

const generatedAt = new Date().toISOString();
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Existential Supplies Co. Product Feed</title>
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
      <g:price>${escapeXml(product.compareAtPrice || product.price)}</g:price>${product.salePrice ? `\n      <g:sale_price>${escapeXml(product.salePrice)}</g:sale_price>` : ""}
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
