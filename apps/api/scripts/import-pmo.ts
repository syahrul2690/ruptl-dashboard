/**
 * One-off importer for the PMO source workbook ("Update Data PMO.xlsx").
 * Reads only the 4 sheets needed, aggregates per ProjectCode, and upserts
 * into the Project table (ProjectCode is reused as ruptlCode — the app had
 * no real PMO-sourced data yet, so there is no collision to reconcile).
 *
 * Usage: pnpm --filter api exec ts-node -r tsconfig-paths/register scripts/import-pmo.ts <path-to-xlsx>
 */
import * as XLSX from 'xlsx';
import { PrismaClient, ProjectType, ProjectStage, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const NEEDED_SHEETS = [
  'pmo_project_profile',
  'pmo_ruptl_profile',
  'pmo_pmk_project_issue',
  'pmo_pmk_contract_amd',
];

// ── PMO ProjectType → app ProjectType ──────────────────────────────────────
const TYPE_MAP: Record<string, ProjectType> = {
  'Gardu Induk': ProjectType.GI,
  'Pembangkit':  ProjectType.KIT,
  'Transmisi':   ProjectType.TRANS,
  'Kombinasi':   ProjectType.KOMBINASI,
};

// ── PMO ProjectState → app ProjectStage (approximate; original label kept in `status`) ──
const STAGE_MAP: Record<string, ProjectStage> = {
  'Perencanaan':     ProjectStage.OBC,
  'Pra-Pelaksanaan': ProjectStage.RENDAN,
  'Pelaksanaan':     ProjectStage.KONSTRUKSI,
  'Penyelesaian':    ProjectStage.KONSTRUKSI,
  'Selesai':         ProjectStage.COD,
  'Terminasi':       ProjectStage.COD,
};

// ── Province → island ──────────────────────────────────────────────────────
const PROVINCE_ISLAND: Record<string, string> = {
  'Aceh': 'Sumatera', 'Sumatera Utara': 'Sumatera', 'Sumatera Barat': 'Sumatera',
  'Riau': 'Sumatera', 'Kepulauan Riau': 'Sumatera', 'Jambi': 'Sumatera',
  'Bengkulu': 'Sumatera', 'Sumatera Selatan': 'Sumatera', 'Kepulauan Bangka Belitung': 'Sumatera',
  'Lampung': 'Sumatera',
  'DKI Jakarta': 'Jawa', 'Jawa Barat': 'Jawa', 'Banten': 'Jawa', 'Jawa Tengah': 'Jawa',
  'DI Yogyakarta': 'Jawa', 'Jawa Timur': 'Jawa',
  'Bali': 'Nusa Tenggara', 'Nusa Tenggara Barat': 'Nusa Tenggara', 'Nusa Tenggara Timur': 'Nusa Tenggara',
  'Kalimantan Barat': 'Kalimantan', 'Kalimantan Tengah': 'Kalimantan', 'Kalimantan Selatan': 'Kalimantan',
  'Kalimantan Timur': 'Kalimantan', 'Kalimantan Utara': 'Kalimantan',
  'Sulawesi Utara': 'Sulawesi', 'Gorontalo': 'Sulawesi', 'Sulawesi Tengah': 'Sulawesi',
  'Sulawesi Barat': 'Sulawesi', 'Sulawesi Selatan': 'Sulawesi', 'Sulawesi Tenggara': 'Sulawesi',
  'Maluku': 'Maluku', 'Maluku Utara': 'Maluku',
  'Papua Barat': 'Papua', 'Papua': 'Papua', 'Papua Selatan': 'Papua', 'Papua Tengah': 'Papua',
  'Papua Pegunungan': 'Papua', 'Papua Barat Daya': 'Papua',
};

function excelDate(v: any): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === 'number' && v > 20000 && v < 60000) {
    return new Date(Date.UTC(1899, 11, 30) + v * 86400000);
  }
  return null;
}

function num(v: any): number | null {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function mode<T extends string | number>(vals: T[]): T | null {
  if (!vals.length) return null;
  const cnt = new Map<T, number>();
  for (const v of vals) cnt.set(v, (cnt.get(v) ?? 0) + 1);
  let best: T = vals[0], bestN = 0;
  for (const [k, n] of cnt) if (n > bestN) { best = k; bestN = n; }
  return best;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) { console.error('Usage: import-pmo.ts <path-to-xlsx>'); process.exit(1); }

  console.log('Reading workbook (this can take a minute for a 30MB file)…');
  const wb = XLSX.readFile(filePath, { sheets: NEEDED_SHEETS, cellDates: false });

  const sheet = (name: string) => {
    const ws = wb.Sheets[name];
    if (!ws) throw new Error(`Sheet not found: ${name}`);
    return XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });
  };

  const projects = sheet('pmo_project_profile');
  const assets    = sheet('pmo_ruptl_profile');
  const issues    = sheet('pmo_pmk_project_issue');
  const amds      = sheet('pmo_pmk_contract_amd');
  console.log(`  projects=${projects.length} assets=${assets.length} issues=${issues.length} amendments=${amds.length}`);

  // ── Aggregate assets per project ───────────────────────────────────────
  type AssetAgg = {
    provinces: string[]; mwSum: number; mvaSum: number; kmSum: number;
    lat: number | null; lng: number | null; categories: string[];
    targetYears: number[]; estYears: number[];
  };
  const byProject = new Map<string, AssetAgg>();
  const now = new Date();

  for (const a of assets) {
    const code = String(a.ProjectCode ?? '').trim();
    if (!code) continue;
    let agg = byProject.get(code);
    if (!agg) {
      agg = { provinces: [], mwSum: 0, mvaSum: 0, kmSum: 0, lat: null, lng: null, categories: [], targetYears: [], estYears: [] };
      byProject.set(code, agg);
    }
    const type = String(a.AssetType ?? '').trim();
    const prov = String(a.Province ?? '').trim();
    if (prov) agg.provinces.push(prov);
    if (a.Category) agg.categories.push(String(a.Category).trim());
    if (agg.lat === null) {
      const lat = num(a.StartLatitude), lng = num(a.StartLongitude);
      if (lat !== null && lng !== null) { agg.lat = lat; agg.lng = lng; }
    }
    if (type === 'Pembangkit') { const v = num(a.UnitCapacity); if (v) agg.mwSum += v; }
    if (type === 'Gardu Induk') { const v = num(a.MVAOutput);   if (v) agg.mvaSum += v; }
    if (type === 'Transmisi')  { const v = num(a.CircuitLength); if (v) agg.kmSum += v; }

    const ty = num(a.RUPTLCOD);
    if (ty && ty > 2000 && ty < 2060) agg.targetYears.push(ty);
    const actual = excelDate(a.ActualCOD) ?? excelDate(a.EstimatedCOD);
    if (actual) agg.estYears.push(actual.getUTCFullYear());
  }

  // ── Aggregate issues per project ───────────────────────────────────────
  const issueAgg = new Map<string, { open: number; overdue: number }>();
  for (const r of issues) {
    const code = String(r.ProjectCode ?? '').trim();
    if (!code) continue;
    const cur = issueAgg.get(code) ?? { open: 0, overdue: 0 };
    if (String(r.IssueStatus ?? '').trim() === 'Open') {
      cur.open++;
      const target = excelDate(r.TargetSolvedDate);
      if (target && target < now) cur.overdue++;
    }
    issueAgg.set(code, cur);
  }

  // ── Aggregate amendments per project ───────────────────────────────────
  const amdAgg = new Map<string, { total: number; eot: number; vo: number }>();
  for (const r of amds) {
    const code = String(r.ProjectCode ?? '').trim();
    if (!code) continue;
    const cur = amdAgg.get(code) ?? { total: 0, eot: 0, vo: 0 };
    cur.total++;
    const t = String(r.AmendmentType ?? '');
    if (t.includes('Durasi Pekerjaan')) cur.eot++;
    if (t.includes('Nilai Kontrak')) cur.vo++;
    amdAgg.set(code, cur);
  }

  // ── National-level snapshot (issue category mix, amendment type mix,
  //    COD pipeline by year) — not reducible to a single project's row ────
  const issueByCategory = new Map<string, number>();
  for (const r of issues) {
    if (String(r.IssueStatus ?? '').trim() !== 'Open') continue;
    const cat = String(r.IssueCategory ?? '').trim() || 'Lainnya';
    issueByCategory.set(cat, (issueByCategory.get(cat) ?? 0) + 1);
  }
  const amendmentByType = new Map<string, number>();
  for (const r of amds) {
    const t = String(r.AmendmentType ?? '').trim() || 'Lainnya';
    amendmentByType.set(t, (amendmentByType.get(t) ?? 0) + 1);
  }
  const codPipeline = new Map<number, number>();
  const codSlippage = new Map<number, number>(); // (estYear - targetYear), clamped to [-3, 8]
  let codWithTargetOnly = 0;
  for (const agg of byProject.values()) {
    const cur = agg.estYears.length ? mode(agg.estYears) : null;
    if (cur) codPipeline.set(cur, (codPipeline.get(cur) ?? 0) + 1);
    const tgt = agg.targetYears.length ? mode(agg.targetYears) : null;
    if (tgt && cur) {
      const d = Math.max(-3, Math.min(8, cur - tgt));
      codSlippage.set(d, (codSlippage.get(d) ?? 0) + 1);
    } else if (tgt && !cur) {
      codWithTargetOnly++;
    }
  }

  // ── Ensure a system user for createdById ───────────────────────────────
  const email = process.env.ADMIN_EMAIL || 'admin@pln.local';
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@1234', 12);
    user = await prisma.user.create({
      data: { email, passwordHash, name: 'Administrator', role: Role.ADMIN },
    });
  }

  // ── Upsert projects ─────────────────────────────────────────────────────
  let inserted = 0, skipped = 0;
  for (const p of projects) {
    const code = String(p.ProjectCode ?? '').trim();
    if (!code) { skipped++; continue; }

    const typeRaw = String(p.ProjectType ?? '').trim();
    const type = TYPE_MAP[typeRaw];
    if (!type) { skipped++; continue; }

    const stateRaw = String(p.ProjectState ?? '').trim();
    const stage = STAGE_MAP[stateRaw] ?? ProjectStage.OBC;

    const agg = byProject.get(code);
    const province = agg ? (mode(agg.provinces) ?? '') : '';
    const island = PROVINCE_ISLAND[province] ?? '';
    const subtype = agg ? (mode(agg.categories) ?? '') : '';

    let capacity: number | null = null;
    let capacityUnit: string | null = null;
    let circuitLength: number | null = null;
    if (agg) {
      if (type === ProjectType.KIT && agg.mwSum > 0)  { capacity = Math.round(agg.mwSum * 100) / 100; capacityUnit = 'MW'; }
      if (type === ProjectType.GI  && agg.mvaSum > 0) { capacity = Math.round(agg.mvaSum * 100) / 100; capacityUnit = 'MVA'; }
      if (type === ProjectType.TRANS && agg.kmSum > 0) circuitLength = Math.round(agg.kmSum * 100) / 100;
      if (type === ProjectType.KOMBINASI) {
        if (agg.mwSum > 0)  { capacity = Math.round(agg.mwSum * 100) / 100; capacityUnit = 'MW'; }
        else if (agg.mvaSum > 0) { capacity = Math.round(agg.mvaSum * 100) / 100; capacityUnit = 'MVA'; }
        if (agg.kmSum > 0) circuitLength = Math.round(agg.kmSum * 100) / 100;
      }
    }

    const codTargetYear   = agg ? mode(agg.targetYears) : null;
    const codEstimasiYear = agg ? mode(agg.estYears)    : null;

    const planProgress   = num(p.PlanProgress);
    const actualProgress = num(p.ActualProgress);
    const progressPlan      = planProgress   !== null ? Math.round(planProgress   * 10000) / 100 : 0;
    const progressRealisasi = actualProgress !== null ? Math.round(actualProgress * 10000) / 100 : 0;
    const deviasi = (planProgress !== null && actualProgress !== null)
      ? Math.round((actualProgress - planProgress) * 10000) / 100 : 0;

    const iss = issueAgg.get(code) ?? { open: 0, overdue: 0 };
    const amd = amdAgg.get(code) ?? { total: 0, eot: 0, vo: 0 };

    const name = String(p.DisplayName ?? p.ProjectName ?? code).trim();

    const data = {
      name, type, subtype,
      ruptlCode: code,
      stage,
      status: stateRaw || 'On-track',
      uip: String(p.UIPName ?? '').trim(),
      region: String(p.Region ?? '').trim(),
      province, island,
      lat: agg?.lat ?? null, lng: agg?.lng ?? null,
      capacity, capacityUnit, circuitLength,
      progressPlan, progressRealisasi, deviasi,
      codTargetYear, codEstimasiYear,
      openIssues: iss.open, overdueIssues: iss.overdue,
      amendmentCount: amd.total, eotCount: amd.eot, voCount: amd.vo,
      updatedById: user.id,
    };

    try {
      await prisma.project.upsert({
        where: { ruptlCode: code },
        update: data,
        create: { ...data, createdById: user.id },
      });
      inserted++;
      if (inserted % 250 === 0) console.log(`  ...${inserted} upserted`);
    } catch (e: any) {
      skipped++;
      console.error(`  skip ${code}: ${e.message?.slice(0, 120)}`);
    }
  }

  console.log(`✔ Done. inserted/updated=${inserted} skipped=${skipped} total=${projects.length}`);

  // ── Persist national snapshot ────────────────────────────────────────────
  const snapshot = {
    issueByCategory:  [...issueByCategory].sort((a, b) => b[1] - a[1]).map(([category, count]) => ({ category, count })),
    amendmentByType:  [...amendmentByType].sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, count })),
    codPipeline:      [...codPipeline].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count })),
    codSlippage:      [...codSlippage].sort((a, b) => a[0] - b[0]).map(([years, count]) => ({ years, count })),
    codWithTargetOnly,
    sourceFile: filePath.split('/').pop(),
    importedAt: new Date().toISOString(),
  };
  await prisma.analyticsSnapshot.upsert({
    where: { key: 'pmo' },
    update: { data: snapshot },
    create: { key: 'pmo', data: snapshot },
  });
  console.log('✔ Snapshot saved (issue categories, amendment types, COD pipeline/slippage)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
