-- DropIndex
DROP INDEX "Contribution_groupMemberId_cycleNumber_key";

-- AlterTable
ALTER TABLE "ChitGroup" ADD COLUMN     "organizerEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "totalMembers" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "Contribution" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "isArrear" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Contribution_groupMemberId_cycleNumber_idx" ON "Contribution"("groupMemberId", "cycleNumber");
