import { NextRequest, NextResponse } from "next/server";
import { toSafeError, YouCamError } from "@/features/youcam/errors";
import { findOwnedJob, markJobStatus } from "@/features/youcam/server/jobs";
import { getExistingSessionHash } from "@/features/youcam/server/session";
import { pollClothTask } from "@/features/youcam/server/youcam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const sessionHash = getExistingSessionHash(request);
    if (!sessionHash) {
      throw new YouCamError(
        "task_not_found",
        "This try-on task is not available in this browser session.",
        404
      );
    }
    const { taskId } = await context.params;
    if (!/^[A-Za-z0-9_-]{16,300}$/.test(taskId)) {
      throw new YouCamError("invalid_task_id", "Invalid try-on task.", 400);
    }

    const job = await findOwnedJob(taskId, sessionHash);
    const result = await pollClothTask(taskId);
    if (result.status !== job.status) {
      await markJobStatus(job.id, result.status);
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const safe = toSafeError(error);
    return NextResponse.json(
      { status: "error", errorCode: safe.errorCode, message: safe.message },
      { status: safe.status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
