export type YouCamGarmentCategory = "upper_body" | "lower_body" | "full_body";

const SUPPORTED_GARMENTS = new Map<string, YouCamGarmentCategory>([
  ["penrose-triangle-tshirt", "upper_body"],
  ["eschers-staircase-hoodie", "upper_body"],
  ["fibonacci-spiral-crop-top", "upper_body"],
  ["schrodingers-cat-tank-top", "upper_body"],
  ["paradox-puzzle-sweater", "upper_body"],
  ["cobalt-structured-blazer", "upper_body"],
  ["ivory-silk-blouse", "upper_body"],
  ["indigo-straight-leg-jeans", "lower_body"],
  ["burgundy-pleated-midi-skirt", "lower_body"],
  ["emerald-wrap-midi-dress", "full_body"],
  ["sand-utility-jumpsuit", "full_body"],
  ["midnight-tailored-pantsuit", "full_body"],
]);

export const FITFRONT_DEMO_IMAGE_ID = "fitfront-demo-v1";
export const FITFRONT_DEMO_IMAGE_PATH = "/images/fitfront-demo-model.png";
export const FITFRONT_FULLBODY_DEMO_IMAGE_ID = "fitfront-fullbody-demo-v1";
export const FITFRONT_FULLBODY_DEMO_IMAGE_PATH =
  "/images/fitfront-fullbody-demo-model.png";

export function getGarmentCategory(product: { handle?: string | null }) {
  return product.handle
    ? (SUPPORTED_GARMENTS.get(product.handle) ?? null)
    : null;
}

export function isSupportedVirtualTryOnProduct(product: {
  handle?: string | null;
}) {
  return Boolean(getGarmentCategory(product));
}

export function getDemoImageForCategory(category: YouCamGarmentCategory) {
  return category === "upper_body"
    ? {
        id: FITFRONT_DEMO_IMAGE_ID,
        path: FITFRONT_DEMO_IMAGE_PATH,
        needsFullBody: false,
      }
    : {
        id: FITFRONT_FULLBODY_DEMO_IMAGE_ID,
        path: FITFRONT_FULLBODY_DEMO_IMAGE_PATH,
        needsFullBody: true,
      };
}

export function getSupportedProductHandles() {
  return [...SUPPORTED_GARMENTS.keys()];
}
