import "server-only";

import { safeProviderMessage, YouCamError } from "../errors";
import type { TryOnPollResponse, YouCamImage } from "../types";
import { buildPresignedUploadHeaders } from "../upload";
import {
  CLOTH_V4_TASK_PATH,
  findClothV4Cost,
  getBalance,
  hasFreeBudget,
} from "../budget";
import type { YouCamGarmentCategory } from "../catalog";

const DEFAULT_BASE_URL = "https://yce-api-01.makeupar.com";
const CLOTH_TASK_PATH = CLOTH_V4_TASK_PATH;

type UploadDescriptor = {
  file_id: string;
  requests: Array<{
    method: string;
    url: string;
    headers?: Record<string, string | number>;
  }>;
};

type ProviderData = {
  files?: UploadDescriptor[];
  task_id?: string;
  task_status?: string;
  status?: string;
  results?: { url?: string };
  result?: { url?: string };
  error_code?: string;
  error?: { code?: string };
};

type ProviderPayload = ProviderData & {
  status?: number;
  results?: Array<{ amount_dec?: number; amount?: number }>;
  result?: {
    skus?: Array<{ amount?: number; run_task_url?: string }>;
    next_token?: string;
    url?: string;
  };
  data?: ProviderData;
};

let featureCostCache: { value: number; expiresAt: number } | null = null;

function config() {
  const apiKey = process.env.YOUCAM_API_KEY;
  if (!apiKey) {
    throw new YouCamError(
      "youcam_not_configured",
      "YouCam is not configured on this deployment.",
      503,
    );
  }
  return {
    apiKey,
    baseUrl: (process.env.YOUCAM_API_BASE_URL || DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    ),
    reserve: Math.max(0, Number(process.env.YOUCAM_UNIT_RESERVE || 100)),
  };
}

async function apiJson(path: string, init?: RequestInit) {
  const { apiKey, baseUrl } = config();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as ProviderPayload;
  if (!response.ok || (payload.status && payload.status >= 400)) {
    const code =
      payload.error_code ||
      (response.status === 429 ? "TooManyRequests" : undefined) ||
      (response.status === 401 ? "InvalidApiKey" : "provider_error");
    throw new YouCamError(
      code,
      safeProviderMessage(code),
      response.status || 502,
    );
  }
  return payload;
}

export async function assertFreeBudget() {
  const { reserve } = config();
  const [balancePayload, featureCost] = await Promise.all([
    apiJson("/s2s/v1.0/client/credit"),
    getClothFeatureCost(),
  ]);
  const credits = Array.isArray(balancePayload.results)
    ? balancePayload.results
    : [];
  const balance = getBalance(credits);
  if (!hasFreeBudget(balance, featureCost, reserve)) {
    throw new YouCamError(
      "free_unit_reserve",
      `FitFront keeps ${reserve} free units in reserve; another try-on is unavailable.`,
      402,
    );
  }
  return { balance, featureCost, reserve };
}

async function getClothFeatureCost() {
  if (featureCostCache && featureCostCache.expiresAt > Date.now()) {
    return featureCostCache.value;
  }

  let startingToken: string | null = null;
  for (let page = 0; page < 20; page += 1) {
    const query = new URLSearchParams({ page_size: "20" });
    if (startingToken) query.set("starting_token", startingToken);
    const payload = await apiJson(`/s2s/v2.0/credit/feature-cost?${query}`);
    const skus = payload.result?.skus;
    if (!Array.isArray(skus)) break;
    const matchingCost = findClothV4Cost(skus);
    if (matchingCost) {
      const value = matchingCost;
      featureCostCache = { value, expiresAt: Date.now() + 10 * 60 * 1000 };
      return value;
    }
    startingToken = payload.result?.next_token || null;
    if (!startingToken) break;
  }

  throw new YouCamError(
    "feature_cost_unavailable",
    "FitFront could not verify the free-unit cost, so no units were used.",
    503,
  );
}

export async function uploadImages(images: YouCamImage[]) {
  const payload = await apiJson("/s2s/v2.0/file", {
    method: "POST",
    body: JSON.stringify({
      files: images.map((image) => ({
        content_type: image.contentType,
        file_name: image.fileName,
        file_size: image.bytes.byteLength,
      })),
    }),
  });
  const descriptors: UploadDescriptor[] =
    payload.data?.files ?? payload.files ?? [];
  if (!Array.isArray(descriptors) || descriptors.length !== images.length) {
    throw new YouCamError(
      "upload_initialization_failed",
      "YouCam could not prepare the image upload.",
      502,
    );
  }

  await Promise.all(
    descriptors.map(async (descriptor, index) => {
      const upload = descriptor.requests?.[0];
      if (!descriptor.file_id || !upload?.url || !upload.method) {
        throw new YouCamError(
          "upload_initialization_failed",
          "YouCam returned an incomplete upload request.",
          502,
        );
      }
      const headers = buildPresignedUploadHeaders(upload.headers);
      const response = await fetch(upload.url, {
        method: upload.method,
        headers,
        body: images[index].bytes,
      });
      if (!response.ok) {
        throw new YouCamError(
          "image_upload_failed",
          "An image could not be uploaded to YouCam.",
          502,
        );
      }
    }),
  );

  return descriptors.map((descriptor) => descriptor.file_id);
}

export async function createClothTask(
  srcFileId: string,
  refFileId: string,
  garmentCategory: YouCamGarmentCategory,
) {
  const payload = await apiJson(CLOTH_TASK_PATH, {
    method: "POST",
    body: JSON.stringify({
      src_file_id: srcFileId,
      ref_file_id: refFileId,
      garment_category: garmentCategory,
    }),
  });
  const taskId = payload.data?.task_id;
  if (typeof taskId !== "string" || !taskId) {
    throw new YouCamError(
      "task_creation_failed",
      "YouCam did not return a task identifier.",
      502,
    );
  }
  return taskId;
}

export async function pollClothTask(
  taskId: string,
): Promise<TryOnPollResponse> {
  const payload = await apiJson(
    `${CLOTH_TASK_PATH}/${encodeURIComponent(taskId)}`,
  );
  const data = payload.data || payload;
  const status = data.task_status || data.status;
  if (status === "success") {
    const resultUrl = data.results?.url || data.result?.url;
    if (typeof resultUrl !== "string" || !resultUrl.startsWith("https://")) {
      throw new YouCamError(
        "result_unavailable",
        "YouCam completed the task but did not return a safe result URL.",
        502,
      );
    }
    return { status: "success", resultUrl };
  }
  if (status === "error") {
    const code = data.error_code || data.error?.code || "provider_error";
    return {
      status: "error",
      errorCode: code,
      message: safeProviderMessage(code),
    };
  }
  return { status: "running" };
}
