-- CreateTable
CREATE TABLE "VirtualTryOnTask" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL DEFAULT '',
    "sessionHash" TEXT NOT NULL DEFAULT '',
    "productId" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'running',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VirtualTryOnTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VirtualTryOnTask_taskId_key" ON "VirtualTryOnTask"("taskId");

-- CreateIndex
CREATE INDEX "VirtualTryOnTask_sessionHash_idx" ON "VirtualTryOnTask"("sessionHash");
