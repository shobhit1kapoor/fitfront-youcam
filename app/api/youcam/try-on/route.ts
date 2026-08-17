import { NextRequest, NextResponse } from "next/server";
import { toSafeError, YouCamError } from "@/features/youcam/errors";
import {
  getDemoImage,
  getTrustedGarmentImage,
  imageFromBrowserFile,
} from "@/features/youcam/server/catalog";
import {
  assertSessionQuota,
  createPendingJob,
  markJobStarted,
  markJobStatus,
} from "@/features/youcam/server/jobs";
import {
  attachSessionCookie,
  getOrCreateSession,
} from "@/features/youcam/server/session";
import {
  assertFreeBudget,
  createClothTask,
  uploadImages,
} from "@/features/youcam/server/youcam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = getOrCreateSession(request);
  let pendingJob: { id: string } | null = null;
  let taskStarted = false;

  try {
    const formData = await request.formData();
    const productId = stringField(formData, "productId");
    const variantId = optionalStringField(formData, "variantId");
    const demoImageId = optionalStringField(formData, "demoImageId");
    const consent = optionalStringField(formData, "consent");

    if (!productId) {
      throw new YouCamError(
        "missing_product",
        "Choose a product to try on.",
        400,
      );
    }
    if (consent !== "true") {
      throw new YouCamError(
        "consent_required",
        "Consent is required before a photo can be sent to YouCam.",
        400,
      );
    }

    await assertSessionQuota(session.hash);
    await assertFreeBudget();

    const garmentImage = await getTrustedGarmentImage(productId, variantId);
    const sourceValue = formData.get("sourceImage");
    const sourceImage = demoImageId
      ? await getDemoImage(demoImageId, garmentImage.garmentCategory)
      : sourceValue instanceof File
        ? await imageFromBrowserFile(sourceValue)
        : await Promise.reject(
            new YouCamError(
              "missing_source_image",
              "Choose the demo model or upload a photo.",
              400,
            ),
          );

    const job = await createPendingJob(session.hash, productId);
    pendingJob = job;
    const [srcFileId, refFileId] = await uploadImages([
      sourceImage,
      garmentImage,
    ]);
    const taskId = await createClothTask(
      srcFileId,
      refFileId,
      garmentImage.garmentCategory,
    );
    await markJobStarted(job.id, taskId);
    taskStarted = true;

    const response = NextResponse.json(
      { taskId, status: "running" },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
    if (session.isNew) attachSessionCookie(response, session.value);
    return response;
  } catch (error) {
    if (pendingJob) {
      await markJobStatus(
        pendingJob.id,
        taskStarted ? "error" : "aborted",
      ).catch(() => undefined);
    }
    const safe = toSafeError(error);
    const response = NextResponse.json(
      { status: "error", errorCode: safe.errorCode, message: safe.message },
      { status: safe.status, headers: { "Cache-Control": "no-store" } },
    );
    if (session.isNew) attachSessionCookie(response, session.value);
    return response;
  }
}

function stringField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function optionalStringField(formData: FormData, name: string) {
  return stringField(formData, name) || null;
}
