import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { keystoneContext } from "@/features/keystone/context";
import {
  FITFRONT_DEMO_IMAGE_ID,
  FITFRONT_DEMO_IMAGE_PATH,
  FITFRONT_FULLBODY_DEMO_IMAGE_ID,
  FITFRONT_FULLBODY_DEMO_IMAGE_PATH,
  getGarmentCategory,
  type YouCamGarmentCategory,
} from "../catalog";
import { YouCamError } from "../errors";
import type { YouCamImage } from "../types";
import { MAX_IMAGE_BYTES, validateImage } from "../validation";

type CatalogImage = {
  image?: { url?: string | null } | null;
  imagePath?: string | null;
};

type CatalogVariant = {
  id: string;
  primaryImage?: CatalogImage | null;
};

type CatalogProduct = {
  id: string;
  title: string;
  handle?: string | null;
  productImages?: CatalogImage[] | null;
  productVariants?: CatalogVariant[] | null;
};

type ProductQuery = {
  findOne(args: Record<string, unknown>): Promise<CatalogProduct | null>;
};

function productQuery() {
  const context = keystoneContext as unknown as {
    sudo(): { query: { Product: ProductQuery } };
  };
  return context.sudo().query.Product;
}

export async function getTrustedGarmentImage(
  productId: string,
  variantId?: string | null,
) {
  const product = await productQuery().findOne({
    where: { id: productId },
    query: `
      id
      title
      handle
      productImages(orderBy: { order: asc }) {
        image { url }
        imagePath
      }
      productVariants {
        id
        primaryImage { image { url } imagePath }
      }
    `,
  });

  const garmentCategory = product ? getGarmentCategory(product) : null;
  if (!product || !garmentCategory) {
    throw new YouCamError(
      "unsupported_product",
      "Virtual try-on is not available for this product yet.",
      400,
    );
  }

  const selectedVariant = variantId
    ? product.productVariants?.find((variant) => variant.id === variantId)
    : null;
  const catalogImage: CatalogImage | undefined =
    selectedVariant?.primaryImage || product.productImages?.[0];

  if (!catalogImage) {
    throw new YouCamError(
      "missing_garment_image",
      "This product does not have a garment image for virtual try-on.",
      400,
    );
  }

  return {
    ...(await loadCatalogImage(catalogImage, `${product.handle}-garment`)),
    garmentCategory,
  };
}

export async function getDemoImage(
  demoImageId: string,
  garmentCategory: YouCamGarmentCategory,
) {
  const expected =
    garmentCategory === "upper_body"
      ? {
          id: FITFRONT_DEMO_IMAGE_ID,
          path: FITFRONT_DEMO_IMAGE_PATH,
          name: "fitfront-demo-model",
        }
      : {
          id: FITFRONT_FULLBODY_DEMO_IMAGE_ID,
          path: FITFRONT_FULLBODY_DEMO_IMAGE_PATH,
          name: "fitfront-fullbody-demo-model",
        };
  if (demoImageId !== expected.id) {
    throw new YouCamError("invalid_demo_image", "Unknown demo image.", 400);
  }
  return loadLocalPublicImage(expected.path, expected.name);
}

async function loadCatalogImage(image: CatalogImage, fileName: string) {
  if (image.imagePath?.startsWith("/")) {
    return loadLocalPublicImage(image.imagePath, fileName);
  }

  const imageUrl = image.image?.url;
  if (!imageUrl) {
    throw new YouCamError(
      "missing_garment_image",
      "This product does not have a garment image for virtual try-on.",
      400,
    );
  }

  const url = new URL(imageUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new YouCamError(
      "invalid_garment_image",
      "Invalid garment image.",
      400,
    );
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new YouCamError(
      "garment_image_unavailable",
      "The garment image could not be loaded.",
      502,
    );
  }
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_IMAGE_BYTES) {
    throw new YouCamError(
      "garment_image_too_large",
      "The garment image is too large.",
      400,
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return validateImage(
    bytes,
    response.headers.get("content-type") || "",
    `${fileName}${extensionFromType(response.headers.get("content-type"))}`,
  );
}

async function loadLocalPublicImage(publicPath: string, fileName: string) {
  const publicRoot = path.resolve(process.cwd(), "public");
  const absolutePath = path.resolve(publicRoot, publicPath.replace(/^\/+/, ""));
  if (!absolutePath.startsWith(`${publicRoot}${path.sep}`)) {
    throw new YouCamError(
      "invalid_image_path",
      "Invalid catalog image path.",
      400,
    );
  }
  const bytes = new Uint8Array(await readFile(absolutePath));
  return validateImage(bytes, "", `${fileName}${path.extname(absolutePath)}`);
}

function extensionFromType(contentType: string | null) {
  return contentType?.includes("png") ? ".png" : ".jpg";
}

export async function imageFromBrowserFile(file: File): Promise<YouCamImage> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return validateImage(bytes, file.type, file.name);
}
