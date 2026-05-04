-- Change progress fields from Int to Float
ALTER TABLE "Project" ALTER COLUMN "progressPlan" TYPE DOUBLE PRECISION;
ALTER TABLE "Project" ALTER COLUMN "progressRealisasi" TYPE DOUBLE PRECISION;
ALTER TABLE "Project" ALTER COLUMN "deviasi" TYPE DOUBLE PRECISION;

-- Create ProjectProgress table
CREATE TABLE "ProjectProgress" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "plan" DOUBLE PRECISION NOT NULL,
    "actual" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectProgress_pkey" PRIMARY KEY ("id")
);

-- Unique constraint (one row per project per month)
CREATE UNIQUE INDEX "ProjectProgress_projectId_yearMonth_key" ON "ProjectProgress"("projectId", "yearMonth");

-- Index
CREATE INDEX "ProjectProgress_projectId_idx" ON "ProjectProgress"("projectId");

-- Foreign key
ALTER TABLE "ProjectProgress" ADD CONSTRAINT "ProjectProgress_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
