-- AlterEnum
ALTER TYPE "ProjectType" ADD VALUE 'KOMBINASI';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "amendmentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "codEstimasiYear" INTEGER,
ADD COLUMN     "codTargetYear" INTEGER,
ADD COLUMN     "eotCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openIssues" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overdueIssues" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uip" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "voCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "issueType" SET DEFAULT 'Tidak ada Issue';

-- CreateIndex
CREATE INDEX "Project_uip_idx" ON "Project"("uip");
