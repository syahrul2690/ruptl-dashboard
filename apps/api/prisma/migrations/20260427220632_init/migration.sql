-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PIC', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ENERGIZED', 'CONSTRUCTION', 'PRE_CONSTRUCTION');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('POWER_PLANT', 'SUBSTATION', 'TRANSMISSION_LINE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL,
    "subtype" TEXT NOT NULL,
    "ruptlCode" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL,
    "codTargetRUPTL" TEXT,
    "codKontraktual" TEXT,
    "codEstimasi" TEXT,
    "issueType" TEXT NOT NULL DEFAULT 'None',
    "progressPlan" INTEGER NOT NULL DEFAULT 0,
    "progressRealisasi" INTEGER NOT NULL DEFAULT 0,
    "deviasi" INTEGER NOT NULL DEFAULT 0,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "island" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "gridSystem" TEXT NOT NULL,
    "capacity" DOUBLE PRECISION,
    "capacityUnit" TEXT,
    "circuitLength" DOUBLE PRECISION,
    "voltageLevel" TEXT,
    "lineFromId" TEXT,
    "lineToId" TEXT,
    "detail" TEXT,
    "urgencyCategory" TEXT[],
    "relatedProjects" TEXT[],
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "diff" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_ruptlCode_key" ON "Project"("ruptlCode");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_province_idx" ON "Project"("province");

-- CreateIndex
CREATE INDEX "Project_island_idx" ON "Project"("island");

-- CreateIndex
CREATE INDEX "Project_type_subtype_idx" ON "Project"("type", "subtype");

-- CreateIndex
CREATE INDEX "Project_province_status_idx" ON "Project"("province", "status");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
