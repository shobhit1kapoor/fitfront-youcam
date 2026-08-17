/* eslint-disable @typescript-eslint/no-explicit-any -- Keystone's generated query surface is intentionally adapted at this seed boundary. */

import seedData from "../features/platform/onboarding/lib/seed.json";
import { keystoneContext } from "../features/keystone/context";
import { randomBytes } from "node:crypto";
import {
  expandedCategories,
  expandedProducts,
} from "./fitfront-expanded-catalog";

const context = (keystoneContext as any).sudo();

async function seed() {
  const existingUsers = await context.query.User.findMany({
    take: 1,
    query: "id",
  });
  if (!existingUsers.length) {
    await context.query.User.createOne({
      data: {
        name: "FitFront System",
        email: "system@fitfront.invalid",
        password: randomBytes(48).toString("base64url"),
        onboardingStatus: "completed",
      },
      query: "id",
    });
  }

  const existingStores = await context.query.Store.findMany({
    take: 1,
    query: "id",
  });
  if (!existingStores.length) {
    await context.query.Store.createOne({ data: seedData.store, query: "id" });
  }

  const currencies: Record<string, string> = {};
  for (const currency of seedData.currencies) {
    currencies[currency.code] = await findOrCreate(
      "Currency",
      { code: currency.code },
      currency,
    );
  }

  const countries: Record<string, string> = {};
  for (const country of seedData.countries) {
    countries[country.iso2] = await findOrCreate(
      "Country",
      { iso2: country.iso2 },
      country,
    );
  }

  const manualPayment = seedData.paymentProviders.find(
    (provider) => provider.code === "pp_system_default",
  );
  if (!manualPayment)
    throw new Error("Manual payment provider is missing from seed data.");
  const manualPaymentId = await findOrCreate(
    "PaymentProvider",
    { code: manualPayment.code },
    manualPayment,
  );
  const fulfillmentId = await findOrCreate(
    "FulfillmentProvider",
    { code: "fp_manual" },
    { code: "fp_manual", name: "Manual Fulfillment", isInstalled: true },
  );

  const regions: Record<string, string> = {};
  for (const region of seedData.regions) {
    regions[region.code] = await findOrCreate(
      "Region",
      { code: region.code },
      {
        code: region.code,
        name: region.name,
        currency: { connect: { id: currencies[region.currencyCode] } },
        taxRate: region.taxRate,
        paymentProviders: { connect: [{ id: manualPaymentId }] },
        fulfillmentProviders: { connect: [{ id: fulfillmentId }] },
        countries: {
          connect: region.countries.map((country) => ({
            id: countries[country.iso2],
          })),
        },
      },
    );
  }

  for (const option of seedData.shipping_options) {
    for (const region of seedData.regions) {
      await findOrCreate(
        "ShippingOption",
        { uniqueKey: `${option.name}-${region.code}` },
        {
          name: option.name,
          priceType: option.priceType,
          amount: option.amount,
          isReturn: option.isReturn || false,
          uniqueKey: `${option.name}-${region.code}`,
          fulfillmentProvider: { connect: { id: fulfillmentId } },
          region: { connect: { id: regions[region.code] } },
        },
      );
    }
  }

  const categories: Record<string, string> = {};
  for (const category of [...seedData.categories, ...expandedCategories]) {
    categories[category.handle] = await findOrCreate(
      "ProductCategory",
      { handle: category.handle },
      {
        title: category.name,
        handle: category.handle,
        isActive: category.isActive,
      },
    );
  }

  const collections: Record<string, string> = {};
  for (const collection of seedData.collections) {
    collections[collection.handle] = await findOrCreate(
      "ProductCollection",
      { handle: collection.handle },
      collection,
    );
  }

  const allProducts: any[] = [...seedData.products, ...expandedProducts];
  for (const product of allProducts) {
    const existing = await context.query.Product.findOne({
      where: { handle: product.handle },
      query: "id",
    });
    if (existing) continue;

    const {
      variants,
      productCollections,
      productCategories,
      subtitle,
      imageExtension,
      ...productInput
    } = product;
    const createdProduct = await context.query.Product.createOne({
      data: {
        ...productInput,
        ...(subtitle ? { subtitle } : {}),
        productCollections: {
          connect: productCollections.connect.map(
            (collection: { handle: string }) => ({
              id: collections[collection.handle],
            }),
          ),
        },
        productCategories: {
          connect: productCategories.connect.map(
            (category: { handle: string }) => ({
              id: categories[category.handle],
            }),
          ),
        },
        productImages: {
          create: [
            {
              imagePath: `/images/${product.handle}.${imageExtension || "jpeg"}`,
              altText: product.title,
            },
          ],
        },
      },
      query: `
        id
        productOptions {
          productOptionValues { id value }
        }
      `,
    });

    const optionValues = createdProduct.productOptions.flatMap(
      (option: any) => option.productOptionValues,
    );
    for (const variant of variants) {
      const matchingOptions = variant.options.map(
        (wanted: { value: string }) => {
          const match = optionValues.find(
            (option: any) => option.value === wanted.value,
          );
          if (!match)
            throw new Error(
              `Missing option ${wanted.value} for ${product.handle}`,
            );
          return { id: match.id };
        },
      );
      const validPrices = variant.prices.filter(
        (price: { currencyCode: string; regionCode: string; amount: number }) =>
          currencies[price.currencyCode] && regions[price.regionCode],
      );
      await context.query.ProductVariant.createOne({
        data: {
          title: variant.title,
          inventoryQuantity: variant.inventoryQuantity,
          manageInventory: variant.manageInventory,
          product: { connect: { id: createdProduct.id } },
          productOptionValues: { connect: matchingOptions },
          prices: {
            create: validPrices.map(
              (price: {
                currencyCode: string;
                regionCode: string;
                amount: number;
              }) => ({
                amount: price.amount,
                currency: { connect: { id: currencies[price.currencyCode] } },
                region: { connect: { id: regions[price.regionCode] } },
              }),
            ),
          },
        },
        query: "id",
      });
    }
  }

  const products = await context.query.Product.findMany({ query: "id handle" });
  console.log(`FitFront seed complete: ${products.length} products available.`);
}

async function findOrCreate(
  listKey: string,
  where: Record<string, string>,
  data: Record<string, unknown>,
) {
  const list = context.query[listKey];
  const existing = await list.findOne({ where, query: "id" });
  if (existing) return existing.id as string;
  const created = await list.createOne({ data, query: "id" });
  return created.id as string;
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await context.prisma.$disconnect();
  });
