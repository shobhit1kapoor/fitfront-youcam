import assert from "node:assert/strict";
import test from "node:test";
import { findClothV4Cost, getBalance, hasFreeBudget } from "./budget";
import {
  getDemoImageForCategory,
  getGarmentCategory,
  getSupportedProductHandles,
  isSupportedVirtualTryOnProduct,
} from "./catalog";
import { safeProviderMessage, toSafeError } from "./errors";
import { isSessionQuotaExceeded } from "./quota";
import { buildPresignedUploadHeaders } from "./upload";
import {
  getImageDimensions,
  ImageValidationError,
  MAX_IMAGE_BYTES,
  validateImage,
} from "./validation";

test("reads PNG dimensions and accepts a supported image", () => {
  const png = pngHeader(768, 1024);
  assert.deepEqual(getImageDimensions(png), { width: 768, height: 1024 });
  const image = validateImage(png, "image/png", "My Photo.png");
  assert.equal(image.contentType, "image/png");
  assert.equal(image.fileName, "My-Photo.png");
});

test("reads JPEG dimensions", () => {
  assert.deepEqual(getImageDimensions(jpegHeader(1024, 768)), {
    width: 1024,
    height: 768,
  });
});

test("rejects undersized and unsupported images", () => {
  assert.throws(
    () => validateImage(pngHeader(320, 480), "image/png", "tiny.png"),
    (error: unknown) =>
      error instanceof ImageValidationError && error.code === "image_too_small",
  );
  assert.throws(
    () => validateImage(new Uint8Array(32), "image/gif", "photo.gif"),
    (error: unknown) =>
      error instanceof ImageValidationError &&
      error.code === "unsupported_image_type",
  );
  assert.throws(
    () =>
      validateImage(
        new Uint8Array(MAX_IMAGE_BYTES + 1),
        "image/png",
        "too-large.png",
      ),
    (error: unknown) =>
      error instanceof ImageValidationError && error.code === "image_too_large",
  );
});

test("maps the trusted try-on catalog to upper, lower, and full body", () => {
  assert.equal(
    isSupportedVirtualTryOnProduct({ handle: "penrose-triangle-tshirt" }),
    true,
  );
  assert.equal(
    getGarmentCategory({ handle: "penrose-triangle-tshirt" }),
    "upper_body",
  );
  assert.equal(
    getGarmentCategory({ handle: "indigo-straight-leg-jeans" }),
    "lower_body",
  );
  assert.equal(
    getGarmentCategory({ handle: "emerald-wrap-midi-dress" }),
    "full_body",
  );
  assert.equal(
    isSupportedVirtualTryOnProduct({ handle: "quantum-socks" }),
    false,
  );
  assert.equal(getSupportedProductHandles().length, 12);
  assert.equal(getDemoImageForCategory("upper_body").needsFullBody, false);
  assert.equal(getDemoImageForCategory("lower_body").needsFullBody, true);
});

test("finds the conservative cloth-v4 cost and enforces the reserve", () => {
  const cost = findClothV4Cost([
    {
      amount: 12,
      run_task_url: "https://yce-api-01.makeupar.com/s2s/v2.0/task/cloth-v4",
    },
    {
      amount: 15,
      run_task_url: "https://yce-api-01.makeupar.com/s2s/v2.0/task/cloth-v4",
    },
    {
      amount: 1,
      run_task_url: "https://yce-api-01.makeupar.com/s2s/v2.0/task/other",
    },
  ]);
  assert.equal(cost, 15);
  assert.equal(getBalance([{ amount_dec: 900.5 }, { amount: 99 }]), 999.5);
  assert.equal(hasFreeBudget(115, 15, 100), true);
  assert.equal(hasFreeBudget(114.99, 15, 100), false);
  assert.equal(hasFreeBudget(10_000, Number.NaN, 100), false);
  assert.equal(findClothV4Cost([]), null);
});

test("quota and provider messages fail safely", () => {
  assert.equal(isSessionQuotaExceeded(2), false);
  assert.equal(isSessionQuotaExceeded(3), true);
  assert.match(safeProviderMessage("error_pose"), /forward-facing pose/i);
  assert.doesNotMatch(safeProviderMessage("unknown-secret-message"), /secret/i);
  assert.match(safeProviderMessage("ResultExpired"), /expired/i);
  const redacted = toSafeError(new Error("Bearer top-secret-provider-token"));
  assert.equal(redacted.errorCode, "provider_error");
  assert.doesNotMatch(JSON.stringify(redacted), /top-secret/i);
});

test("preserves every provider-required presigned upload header", () => {
  const headers = buildPresignedUploadHeaders({
    "Content-Type": "image/png",
    "x-amz-meta-source": "fitfront",
    "x-amz-content-sha256": 12345,
  });
  assert.equal(headers.get("content-type"), "image/png");
  assert.equal(headers.get("x-amz-meta-source"), "fitfront");
  assert.equal(headers.get("x-amz-content-sha256"), "12345");
});

function pngHeader(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function jpegHeader(width: number, height: number) {
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03,
    0x01,
    0x11,
    0x00,
    0x02,
    0x11,
    0x00,
    0x03,
    0x11,
    0x00,
    0xff,
    0xd9,
  ]);
}
