-- CreateTable
CREATE TABLE "ActionNote" (
    "id" SERIAL NOT NULL,
    "actionId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActionNote_actionId_createdAt_idx" ON "ActionNote"("actionId", "createdAt");

-- AddForeignKey
ALTER TABLE "ActionNote" ADD CONSTRAINT "ActionNote_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ActionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionNote" ADD CONSTRAINT "ActionNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
