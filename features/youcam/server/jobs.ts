import "server-only";

import { randomUUID } from "node:crypto";
import { keystoneContext } from "@/features/keystone/context";
import { YouCamError } from "../errors";
import { isSessionQuotaExceeded, MAX_TASKS_PER_DAY } from "../quota";

type VirtualTryOnJob = {
  id: string;
  taskId: string;
  sessionHash: string;
  productId: string;
  status: string;
  createdAt?: string;
};

type VirtualTryOnTaskQuery = {
  findMany(args: Record<string, unknown>): Promise<Array<Pick<VirtualTryOnJob, "id">>>;
  createOne(args: Record<string, unknown>): Promise<Pick<VirtualTryOnJob, "id" | "taskId">>;
  updateOne(args: Record<string, unknown>): Promise<Partial<VirtualTryOnJob> | null>;
  findOne(args: Record<string, unknown>): Promise<VirtualTryOnJob | null>;
};

function taskQuery(): VirtualTryOnTaskQuery {
  const context = keystoneContext as unknown as {
    sudo(): { query: { VirtualTryOnTask: VirtualTryOnTaskQuery } };
  };
  return context.sudo().query.VirtualTryOnTask;
}

export async function assertSessionQuota(sessionHash: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tasks = await taskQuery().findMany({
    where: {
      sessionHash: { equals: sessionHash },
      createdAt: { gte: since },
      status: { in: ["running", "success", "error"] },
    },
    take: MAX_TASKS_PER_DAY,
    query: "id",
  });

  if (isSessionQuotaExceeded(tasks.length)) {
    throw new YouCamError(
      "session_limit",
      "This browser has used its three free try-ons for the last 24 hours.",
      429
    );
  }
}

export async function createPendingJob(sessionHash: string, productId: string) {
  return taskQuery().createOne({
    data: {
      taskId: `pending_${randomUUID()}`,
      sessionHash,
      productId,
      status: "uploading",
    },
    query: "id taskId",
  });
}

export async function markJobStarted(id: string, taskId: string) {
  return taskQuery().updateOne({
    where: { id },
    data: { taskId, status: "running" },
    query: "id taskId status",
  });
}

export async function markJobStatus(id: string, status: string) {
  return taskQuery().updateOne({
    where: { id },
    data: { status },
    query: "id status",
  });
}

export async function findOwnedJob(taskId: string, sessionHash: string) {
  const job = await taskQuery().findOne({
    where: { taskId },
    query: "id taskId sessionHash productId status createdAt",
  });
  if (!job || job.sessionHash !== sessionHash) {
    throw new YouCamError(
      "task_not_found",
      "This try-on task is not available in this browser session.",
      404
    );
  }
  return job;
}
