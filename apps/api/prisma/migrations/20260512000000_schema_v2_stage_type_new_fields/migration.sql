-- ============================================================
-- Migration: Schema V2
-- - Replace ProjectStatus enum (3) with ProjectStage enum (10)
-- - Replace ProjectType enum (3) with new ProjectType enum (7)
-- - Add new fields: status (string), priority, region,
--   notification, issueStrategic, bpoNotes, bpoLastModified, comment
-- ============================================================

-- ------------------------------------------------------------
-- 1. Create new ProjectStage enum
-- ------------------------------------------------------------
CREATE TYPE "ProjectStage" AS ENUM (
  'OBC',
  'CENTRALIZED_PLANNING',
  'TVV',
  'KOMITE_INVESTASI',
  'RKAP',
  'SKAI',
  'RENDAN',
  'LAKDAN',
  'KONSTRUKSI',
  'COD'
);

-- ------------------------------------------------------------
-- 2. Add stage column (nullable for now, fill then constrain)
-- ------------------------------------------------------------
ALTER TABLE "Project" ADD COLUMN "stage" "ProjectStage";

UPDATE "Project" SET "stage" = CASE
  WHEN "status" = 'ENERGIZED'        THEN 'COD'::"ProjectStage"
  WHEN "status" = 'CONSTRUCTION'     THEN 'KONSTRUKSI'::"ProjectStage"
  WHEN "status" = 'PRE_CONSTRUCTION' THEN 'OBC'::"ProjectStage"
  ELSE                                     'OBC'::"ProjectStage"
END;

ALTER TABLE "Project" ALTER COLUMN "stage" SET NOT NULL;

-- ------------------------------------------------------------
-- 3. Convert status column from enum to String
--    Add temp text column, copy mapped value, drop enum col
-- ------------------------------------------------------------
ALTER TABLE "Project" ADD COLUMN "statusText" TEXT NOT NULL DEFAULT 'On-track';

UPDATE "Project" SET "statusText" = CASE
  WHEN "status" = 'ENERGIZED'        THEN 'Completed'
  WHEN "status" = 'CONSTRUCTION'     THEN 'On-track'
  WHEN "status" = 'PRE_CONSTRUCTION' THEN 'On-track'
  ELSE                                     'On-track'
END;

ALTER TABLE "Project" DROP COLUMN "status";
ALTER TABLE "Project" RENAME COLUMN "statusText" TO "status";

-- Drop old ProjectStatus enum
DROP TYPE "ProjectStatus";

-- ------------------------------------------------------------
-- 4. Replace ProjectType enum
--    Rename old → create new → migrate data → drop old
-- ------------------------------------------------------------
ALTER TYPE "ProjectType" RENAME TO "ProjectTypeOld";

CREATE TYPE "ProjectType" AS ENUM (
  'GI',
  'TRANS',
  'KIT',
  'KIT_EBT',
  'KIT_NONEBT',
  'FSRU',
  'KIT_RELOKASI'
);

ALTER TABLE "Project" ADD COLUMN "typeNew" "ProjectType";

UPDATE "Project" SET "typeNew" = CASE
  WHEN "type" = 'SUBSTATION'        THEN 'GI'::"ProjectType"
  WHEN "type" = 'TRANSMISSION_LINE' THEN 'TRANS'::"ProjectType"
  WHEN "type" = 'POWER_PLANT'       THEN 'KIT'::"ProjectType"
  ELSE                                    'KIT'::"ProjectType"
END;

ALTER TABLE "Project" ALTER COLUMN "typeNew" SET NOT NULL;
ALTER TABLE "Project" DROP COLUMN "type";
ALTER TABLE "Project" RENAME COLUMN "typeNew" TO "type";

DROP TYPE "ProjectTypeOld";

-- ------------------------------------------------------------
-- 5. Add new fields
-- ------------------------------------------------------------
ALTER TABLE "Project" ADD COLUMN "priority"        TEXT;
ALTER TABLE "Project" ADD COLUMN "region"          TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ADD COLUMN "notification"    TEXT;
ALTER TABLE "Project" ADD COLUMN "issueStrategic"  TEXT;
ALTER TABLE "Project" ADD COLUMN "bpoNotes"        TEXT;
ALTER TABLE "Project" ADD COLUMN "bpoLastModified" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "comment"         TEXT;

-- ------------------------------------------------------------
-- 6. Update indexes: drop old status indexes, add stage indexes
-- ------------------------------------------------------------
DROP INDEX IF EXISTS "Project_status_idx";
DROP INDEX IF EXISTS "Project_province_status_idx";
DROP INDEX IF EXISTS "Project_type_subtype_idx";

CREATE INDEX "Project_stage_idx"          ON "Project"("stage");
CREATE INDEX "Project_region_idx"         ON "Project"("region");
CREATE INDEX "Project_type_idx"           ON "Project"("type");
CREATE INDEX "Project_province_stage_idx" ON "Project"("province", "stage");

-- ------------------------------------------------------------
-- 7. Make previously required fields gracefully nullable
--    (island, gridSystem, province, subtype may be empty in Excel)
-- ------------------------------------------------------------
ALTER TABLE "Project" ALTER COLUMN "island"     SET DEFAULT '';
ALTER TABLE "Project" ALTER COLUMN "gridSystem" SET DEFAULT '';
ALTER TABLE "Project" ALTER COLUMN "province"   SET DEFAULT '';
ALTER TABLE "Project" ALTER COLUMN "subtype"    SET DEFAULT '';
