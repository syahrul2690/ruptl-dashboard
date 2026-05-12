# Execution Plan: Align Database Schema with Excel Import

## Summary

Refactor the database schema, API, and frontend to match the structure of the **"ALL" sheet** in the PLN Excel dashboard. Three major changes:

1. **Replace `ProjectStatus` (3 values) with `ProjectStage` (10 values)** from the Excel's `ACTUAL STAGE` column
2. **Add new columns** to the `Project` model that exist in the Excel but are missing from the DB
3. **Adjust urgency categories** to match the Excel's `URGENSI` values

---

## Phase 1: Database Schema Changes

### 1.1 Replace `ProjectStatus` enum with `ProjectStage` enum

**Current** (3 values):
```
ENERGIZED | CONSTRUCTION | PRE_CONSTRUCTION
```

**New** — based on Excel's `ACTUAL STAGE` (10 values):
```
OBC                  → "01. OBC"
CENTRALIZED_PLANNING → "02. Centralized Planning (CP)"
TVV                  → "03. Tim Verifikasi Validasi (TVV)"
KOMITE_INVESTASI     → "04. Komite Investasi (KI)"
RKAP                 → "05. RKAP"
SKAI                 → "06. SKAI"
RENDAN               → "07. Procurement Planning (RENDAN)"
LAKDAN               → "08. Procurement (LAKDAN)"
KONSTRUKSI           → "09. Konstruksi"
COD                  → "10. COD"
```

### 1.2 Add `ProjectStatus` as a SEPARATE field (Excel's `STATUS` column)

The Excel has a **separate** `STATUS` column with values: `Leading`, `Lagging`, `On-track`, `Completed`, `Cancelled`, `Terminasi`, `Started`. This represents the **progress status**, while `ACTUAL STAGE` is the **project lifecycle stage**.

We rename the existing `status` field to `stage` (the 10-value enum) and add a **new** `status` field as a string for the progress status:

| DB Field | Prisma Type | Maps to Excel Column |
|---|---|---|
| `stage` | `ProjectStage` (enum) | `ACTUAL STAGE` |
| `status` | `String` | `STATUS` (Leading/Lagging/On-track/etc.) |

### 1.3 Add new columns to `Project` model

| New Field | Prisma Type | Maps to Excel Column | Notes |
|---|---|---|---|
| `stage` | `ProjectStage` | `ACTUAL STAGE` | Replaces old `status` enum purpose |
| `status` | `String` | `STATUS` | Leading/Lagging/On-track/Completed/Cancelled/Terminasi/Started |
| `priority` | `String?` | `Prioritas` | P0, P0', (PRB), etc. |
| `region` | `String` | `REGION` | JAMALI/SUMATERA/SULAWESI/KALIMANTAN/MAPA/NUSRA |
| `notification` | `String?` | `NOTIFIKASI` | NON KONSTRUKSI / green / red / orange |
| `issueStrategic` | `String?` | `Issue Strategis` | Free text, specific issue description |
| `bpoNotes` | `String?` | `Keterangan BPO` | Free text notes |
| `bpoLastModified` | `DateTime?` | `Last Modified Keterangan BPO` | Timestamp |
| `comment` | `String?` | `Comment` | Free text |

**Already existing** (no change needed):
- `name` → `NAMA PROYEK`
- `ruptlCode` → `RUPTL CODE`
- `type` / `subtype` → derived from `TIPE PROYEK`
- `capacity` / `capacityUnit` → `KAPASITAS` / `SATUAN`
- `province` → `LOKASI`
- `gridSystem` → `SISTEM KELISTRIKAN`
- `codTargetRUPTL` → `COD RUPTL`
- `codKontraktual` → `COD KONTRAKTUAL`
- `codEstimasi` → `COD ESTIMASI`
- `issueType` → `Tipe Issue`
- `progressPlan` → `RENCANA PROGRESS KONSTRUKSI (%)`
- `progressRealisasi` → `REALISASI PROGRESS KONSTRUKSI (%)`
- `deviasi` → `DEVIASI`
- `urgencyCategory` → `URGENSI`

### 1.4 Update `ProjectType` enum

**Current:**
```
POWER_PLANT | SUBSTATION | TRANSMISSION_LINE
```

**New** — based on Excel's `TIPE PROYEK`:
```
GI          → Gardu Induk (was SUBSTATION)
TRANS       → Transmisi (was TRANSMISSION_LINE)
KIT_EBT     → KIT-EBT (new)
KIT_NONEBT  → KIT-NONEBT (new)
KIT         → KIT (was POWER_PLANT)
FSRU        → FSRU (new)
KIT_RELOKASI → KIT (RELOKASI) (new)
```

### 1.5 Adjust urgency categories

**Current** `URGENCY_OPTIONS` (7 values):
```
Kehandalan Sistem, RUPTL, Penurunan BPP, Pemenuhan EBT,
Kerawanan Sistem, Demand KTT, Evakuasi Daya
```

**New** — based on Excel's `URGENSI` unique values (13 values):
```
RUPTL, Pemenuhan EBT, NON LIST, Kerawanan Sistem,
Keandalan Sistem, Evakuasi Daya, KTT, Interkoneksi,
Penurunan BPP, Keandalan, Demand KTT, RUPTL /RKAP 2025,
keandalan
```

**Normalized** (deduplicate case variations, merge similar):
```
RUPTL, Pemenuhan EBT, NON LIST, Kerawanan Sistem,
Keandalan Sistem, Evakuasi Daya, KTT, Interkoneksi,
Penurunan BPP, Demand KTT
```

> Note: `keandalan` / `Keandalan` merged into `Keandalan Sistem`. `RUPTL /RKAP 2025` merged into `RUPTL`.

---

## Phase 2: Prisma Migration

### 2.1 Migration SQL strategy

Since we're renaming/replacing enums, a multi-step migration is needed:

```
1. Create new ProjectStage enum
2. Add new columns (stage, status as String, priority, region, notification, etc.)
3. Migrate old status data → stage: map PRE_CONSTRUCTION → OBC, CONSTRUCTION → KONSTRUKSI, ENERGIZED → COD
4. Migrate old status → new status string: map PRE_CONSTRUCTION → 'On-track', CONSTRUCTION → 'On-track', ENERGIZED → 'Completed'
5. Update ProjectType enum (add new values, map old to new)
6. Drop old ProjectStatus enum
7. Make stage NOT NULL
```

### Files to change:
- `apps/api/prisma/schema.prisma`

---

## Phase 3: API Backend Changes

### 3.1 DTOs
| File | Change |
|---|---|
| `apps/api/src/projects/dto/create-project.dto.ts` | Update `status` to String, add `stage` as `ProjectStage` enum, add new optional fields (`priority`, `region`, `notification`, `issueStrategic`, `bpoNotes`, `comment`) |
| `apps/api/src/projects/dto/update-project.dto.ts` | Inherits from CreateProjectDto (PartialType) — no direct change |
| `apps/api/src/projects/dto/list-projects.dto.ts` | Add `stage` filter, update `status` to String, add `region` filter |

### 3.2 Projects Service
| File | Change |
|---|---|
| `apps/api/src/projects/projects.service.ts` | Update `findAll` to support `stage` and `region` filters. Update `SLIM_SELECT` to include new fields. |

### 3.3 Import Service
| File | Change |
|---|---|
| `apps/api/src/import/import.service.ts` | Replace `STATUS_MAP` with `STAGE_MAP` (10 stages). Replace `TYPE_MAP` with new 7-type mapping. Map Excel columns to new DB fields. Normalize urgency values on import. |

### 3.4 Analytics Service
| File | Change |
|---|---|
| `apps/api/src/analytics/analytics.service.ts` | Replace `byStatus` groupBy with `byStage`. Update raw SQL queries that reference `status = 'ENERGIZED'` to use `stage = 'COD'`. Add `byRegion` groupBy. Update track metrics. |

---

## Phase 4: Frontend Changes

### 4.1 Types & Constants
| File | Change |
|---|---|
| `apps/web/src/lib/types.ts` | Replace `ProjectStatus` type with `ProjectStage` (10 values). Add `status` as string. Replace `STATUS_CONFIG` with `STAGE_CONFIG` (10 stages with colors/labels). Update `URGENCY_OPTIONS` to new 10 values. Update `URGENCY_COLORS`. Add new fields to `Project` and `ProjectSlim` interfaces. Update `ProjectType` to 7 values. |

### 4.2 Pages & Components
| File | Change |
|---|---|
| `apps/web/src/pages/DataProyekPage.tsx` | Update table columns: show `stage` instead of `status`. Update filter dropdowns (10 stages, 7 types). Update edit modal with new fields. Use `STAGE_CONFIG` for styling. |
| `apps/web/src/pages/InputPage.tsx` | Update form: new type options, stage dropdown, new fields (priority, region, notification). Update `TYPE_OPTIONS`, `STATUS_OPTIONS`. |
| `apps/web/src/pages/MapPage.tsx` | Update filter logic to use `stage` instead of `status`. |
| `apps/web/src/components/FilterBar.tsx` | Update `STATUS_PILLS` to `STAGE_PILLS` (10 stages). Update urgency pills. |
| `apps/web/src/components/MapPanel.tsx` | Update `nodeColor()` to use `STAGE_CONFIG`. Update tooltip HTML. |
| `apps/web/src/components/DetailPanel.tsx` | Update status display → stage display. Update edit form with new fields. Update urgency section. |
| `apps/web/src/context/ProjectStatsContext.tsx` | Update to read `byStage` instead of `byStatus`. |

---

## Phase 5: Import Excel Mapping

The import service needs to map Excel columns → DB fields:

| Excel Column | DB Field | Transformation |
|---|---|---|
| `NAMA PROYEK` | `name` | Trim |
| `RUPTL CODE` | `ruptlCode` | Trim |
| `STATUS` | `status` | Direct string: Leading/Lagging/On-track/etc. |
| `ACTUAL STAGE` | `stage` | Map "01. OBC" → `OBC`, "09. Konstruksi" → `KONSTRUKSI`, etc. |
| `TIPE PROYEK` | `type` | Map "GI" → `GI`, "TRANS" → `TRANS`, "KIT-EBT" → `KIT_EBT`, etc. |
| `Prioritas` | `priority` | Trim, nullable |
| `KAPASITAS` | `capacity` | parseFloat, nullable |
| `SATUAN` | `capacityUnit` | Trim |
| `LOKASI` | `province` | Trim |
| `REGION` | `region` | Trim |
| `SISTEM KELISTRIKAN` | `gridSystem` | Trim |
| `URGENSI` | `urgencyCategory` | Single string → `[string]` array. Normalize casing. |
| `COD RUPTL` | `codTargetRUPTL` | String(year) |
| `COD KONTRAKTUAL` | `codKontraktual` | String, nullable |
| `COD ESTIMASI` | `codEstimasi` | String, nullable |
| `Keterangan BPO` | `bpoNotes` | Trim, nullable |
| `Last Modified BPO` | `bpoLastModified` | Parse datetime, nullable |
| `Tipe Issue` | `issueType` | Direct string |
| `Issue Strategis` | `issueStrategic` | Trim, nullable |
| `RENCANA PROGRESS (%)` | `progressPlan` | parseFloat |
| `REALISASI PROGRESS (%)` | `progressRealisasi` | parseFloat |
| `DEVIASI` | `deviasi` | parseFloat |
| `NOTIFIKASI` | `notification` | Trim, nullable |
| `Comment` | `comment` | Trim, nullable |

---

## Execution Order

- [x] **Step 1** — Prisma schema + migration
- [x] **Step 2** — API: DTOs, Projects Service, Analytics Service
- [x] **Step 3** — API: Import Service rewrite (sheet selection, column mapping, validation)
- [x] **Step 4** — Frontend: types.ts (enums, constants, interfaces)
- [x] **Step 5** — Frontend: all pages & components
- [x] **Step 6** — Frontend: InputPage.tsx import UI (column guide, template, preview)
- [x] **Step 7** — Test import with Excel file locally (1,661 TRANS rows valid; 3,936 non-TRANS await user-added lat/lng in col AS/AT)
- [ ] **Step 8** — Commit, push, deploy to VPS

---

## Risk & Notes

- **Data migration**: Existing 70 rows in VPS (and 3 locally) will be mapped: `PRE_CONSTRUCTION` → stage `OBC`, `CONSTRUCTION` → `KONSTRUKSI`, `ENERGIZED` → `COD`. This is a best-effort mapping.
- **Type migration**: `POWER_PLANT` → `KIT`, `SUBSTATION` → `GI`, `TRANSMISSION_LINE` → `TRANS`.
- **No data loss**: The migration adds columns and maps values; nothing is deleted.
- **Backward compatibility**: This is a breaking change. All existing data will be migrated in the same deploy.
- **lat/lng in columns AS/AT**: User will populate Latitude (AS) and Longitude (AT) in the Excel before importing. Required for non-Transmission Line projects.
- **Relationships in AU/AV/AW**: Related Projects (AU), Line From (AV), Line To (AW) use RUPTL Codes. Resolved to DB IDs in Pass 2.
- **Upsert by ruptlCode**: Re-importing the same Excel is safe — existing projects are updated, not duplicated.
- **5,597 rows**: Import runs in a loop with individual upserts. May take 30–60s on VPS.
