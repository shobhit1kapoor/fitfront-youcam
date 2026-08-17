type ProductSpec = {
  title: string;
  handle: string;
  description: string;
  category: string;
  color: string;
  imageExtension: "png";
  prices: { eur: number; gbp: number; usd: number };
};

export const expandedCategories = [
  { name: "Outerwear", handle: "outerwear", isActive: true },
  { name: "Skirts", handle: "skirts", isActive: true },
  { name: "Dresses", handle: "dresses", isActive: true },
  { name: "Jumpsuits", handle: "jumpsuits", isActive: true },
  { name: "Suits", handle: "suits", isActive: true },
];

const specs: ProductSpec[] = [
  {
    title: "Cobalt Structured Blazer",
    handle: "cobalt-structured-blazer",
    description:
      "A clean single-breasted blazer with precise tailoring and a vivid cobalt finish.",
    category: "outerwear",
    color: "Cobalt",
    imageExtension: "png",
    prices: { eur: 7200, gbp: 6500, usd: 7900 },
  },
  {
    title: "Ivory Silk Blouse",
    handle: "ivory-silk-blouse",
    description:
      "A softly draped ivory blouse designed for polished workwear and effortless layering.",
    category: "shirts",
    color: "Ivory",
    imageExtension: "png",
    prices: { eur: 4100, gbp: 3700, usd: 4500 },
  },
  {
    title: "Indigo Straight-Leg Jeans",
    handle: "indigo-straight-leg-jeans",
    description:
      "Classic high-rise straight-leg denim in a versatile deep indigo wash.",
    category: "pants",
    color: "Indigo",
    imageExtension: "png",
    prices: { eur: 5000, gbp: 4500, usd: 5500 },
  },
  {
    title: "Burgundy Pleated Midi Skirt",
    handle: "burgundy-pleated-midi-skirt",
    description:
      "A flowing knife-pleat midi skirt in rich burgundy with graceful everyday movement.",
    category: "skirts",
    color: "Burgundy",
    imageExtension: "png",
    prices: { eur: 4400, gbp: 4000, usd: 4800 },
  },
  {
    title: "Emerald Wrap Midi Dress",
    handle: "emerald-wrap-midi-dress",
    description:
      "An elegant emerald wrap dress with a defined waist and softly flared midi skirt.",
    category: "dresses",
    color: "Emerald",
    imageExtension: "png",
    prices: { eur: 6200, gbp: 5600, usd: 6800 },
  },
  {
    title: "Sand Utility Jumpsuit",
    handle: "sand-utility-jumpsuit",
    description:
      "A modern sand-toned utility jumpsuit with a belted waist and relaxed straight leg.",
    category: "jumpsuits",
    color: "Sand",
    imageExtension: "png",
    prices: { eur: 6900, gbp: 6200, usd: 7600 },
  },
  {
    title: "Midnight Tailored Pantsuit",
    handle: "midnight-tailored-pantsuit",
    description:
      "A refined midnight two-piece pantsuit combining a tailored jacket and straight trousers.",
    category: "suits",
    color: "Midnight",
    imageExtension: "png",
    prices: { eur: 11800, gbp: 10600, usd: 12900 },
  },
];

const sizes = ["S", "M", "L", "XL"];

export const expandedProducts = specs.map((spec) => ({
  title: spec.title,
  subtitle: null,
  description: [{ type: "paragraph", children: [{ text: spec.description }] }],
  handle: spec.handle,
  isGiftcard: false,
  status: "published",
  imageExtension: spec.imageExtension,
  productCategories: { connect: [{ handle: spec.category }] },
  productCollections: {
    connect: [{ handle: "new-arrivals" }, { handle: "trending" }],
  },
  productOptions: {
    create: [
      {
        title: "Size",
        productOptionValues: {
          create: sizes.map((value) => ({ value })),
        },
      },
      {
        title: "Color",
        productOptionValues: { create: [{ value: spec.color }] },
      },
    ],
  },
  variants: sizes.map((size) => ({
    title: `${size} / ${spec.color}`,
    prices: [
      { currencyCode: "eur", amount: spec.prices.eur, regionCode: "eu" },
      { currencyCode: "gbp", amount: spec.prices.gbp, regionCode: "uk" },
      { currencyCode: "usd", amount: spec.prices.usd, regionCode: "na" },
    ],
    options: [{ value: size }, { value: spec.color }],
    inventoryQuantity: 50,
    manageInventory: true,
  })),
}));
