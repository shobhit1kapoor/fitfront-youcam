import type { ImageDimensions, YouCamImage } from "./types";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MIN_SHORT_SIDE = 384;
export const MIN_LONG_SIDE = 512;
export const MAX_LONG_SIDE = 4096;

export class ImageValidationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ImageValidationError";
    this.code = code;
  }
}

export function normalizeImageContentType(
  contentType: string,
  fileName = "image.jpg"
): YouCamImage["contentType"] {
  const normalized = contentType.toLowerCase();
  if (normalized === "image/png" || fileName.toLowerCase().endsWith(".png")) {
    return "image/png";
  }
  if (
    normalized === "image/jpeg" ||
    normalized === "image/jpg" ||
    /\.jpe?g$/i.test(fileName)
  ) {
    return "image/jpg";
  }
  throw new ImageValidationError(
    "unsupported_image_type",
    "Choose a JPG or PNG image."
  );
}

export function getImageDimensions(bytes: Uint8Array): ImageDimensions {
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      width: view.getUint32(16),
      height: view.getUint32(20),
    };
  }

  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const sofMarkers = new Set([
      0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
      0xce, 0xcf,
    ]);
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      if (sofMarkers.has(marker)) {
        return {
          height: (bytes[offset + 5] << 8) | bytes[offset + 6],
          width: (bytes[offset + 7] << 8) | bytes[offset + 8],
        };
      }
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
        continue;
      }
      const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (segmentLength < 2) break;
      offset += segmentLength + 2;
    }
  }

  throw new ImageValidationError(
    "invalid_image",
    "The selected file is not a readable JPG or PNG image."
  );
}

export function validateImage(
  bytes: Uint8Array,
  contentType: string,
  fileName: string
): YouCamImage {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
    throw new ImageValidationError(
      "image_too_large",
      "Images must be smaller than 10 MB."
    );
  }

  const normalizedType = normalizeImageContentType(contentType, fileName);
  const { width, height } = getImageDimensions(bytes);
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);

  if (shortSide < MIN_SHORT_SIDE || longSide < MIN_LONG_SIDE) {
    throw new ImageValidationError(
      "image_too_small",
      "Use an image of at least 512 × 384 pixels."
    );
  }
  if (longSide > MAX_LONG_SIDE) {
    throw new ImageValidationError(
      "image_too_large_dimensions",
      "The longest image side must not exceed 4096 pixels."
    );
  }

  return {
    bytes,
    contentType: normalizedType,
    fileName: sanitizeFileName(fileName, normalizedType),
  };
}

function sanitizeFileName(
  fileName: string,
  contentType: YouCamImage["contentType"]
) {
  const extension = contentType === "image/png" ? ".png" : ".jpg";
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 60);
  return `${base || "fitfront-image"}${extension}`;
}
