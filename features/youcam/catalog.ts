const SUPPORTED_UPPER_BODY_HANDLES = new Set([
  "penrose-triangle-tshirt",
  "eschers-staircase-hoodie",
  "fibonacci-spiral-crop-top",
  "schrodingers-cat-tank-top",
  "paradox-puzzle-sweater",
]);

export const FITFRONT_DEMO_IMAGE_ID = "fitfront-demo-v1";
export const FITFRONT_DEMO_IMAGE_PATH = "/images/fitfront-demo-model.png";

export function isSupportedUpperBodyProduct(product: {
  handle?: string | null;
}) {
  return Boolean(
    product.handle && SUPPORTED_UPPER_BODY_HANDLES.has(product.handle)
  );
}

export function getSupportedProductHandles() {
  return [...SUPPORTED_UPPER_BODY_HANDLES];
}
