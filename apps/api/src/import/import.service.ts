import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ProjectStage, ProjectType } from '@prisma/client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// Maps Excel "ACTUAL STAGE" values → ProjectStage enum
const STAGE_MAP: Record<string, ProjectStage> = {
  '01. obc':                                ProjectStage.OBC,
  '02. centralized planning (cp)':          ProjectStage.CENTRALIZED_PLANNING,
  '03. tim verifikasi validasi (tvv)':      ProjectStage.TVV,
  '04. komite investasi (ki)':              ProjectStage.KOMITE_INVESTASI,
  '05. rkap':                               ProjectStage.RKAP,
  '06. skai':                               ProjectStage.SKAI,
  '07. procurement planning (rendan)':      ProjectStage.RENDAN,
  '08. procurement (lakdan)':               ProjectStage.LAKDAN,
  '09. konstruksi':                         ProjectStage.KONSTRUKSI,
  '10. cod':                                ProjectStage.COD,
};

// Maps Excel "TIPE PROYEK" values → ProjectType enum
const TYPE_MAP: Record<string, ProjectType> = {
  'gi':            ProjectType.GI,
  'trans':         ProjectType.TRANS,
  'kit':           ProjectType.KIT,
  'kit-ebt':       ProjectType.KIT_EBT,
  'kit-nonebt':    ProjectType.KIT_NONEBT,
  'fsru':          ProjectType.FSRU,
  'kit (relokasi)':ProjectType.KIT_RELOKASI,
};

// Maps Excel "REGION" → island grouping
const REGION_TO_ISLAND: Record<string, string> = {
  'jamali':      'Jawa',
  'sumatera':    'Sumatera',
  'sulawesi':    'Sulawesi',
  'kalimantan':  'Kalimantan',
  'mapa':        'Papua',
  'nusra':       'Nusa Tenggara',
};

// Normalize urgency values from Excel (case variations, aliases)
const URGENCY_NORMALIZE: Record<string, string> = {
  'keandalan':           'Keandalan Sistem',
  'keandalan sistem':    'Keandalan Sistem',
  'kehandalan sistem':   'Keandalan Sistem',
  'ruptl /rkap 2025':    'RUPTL',
  'ruptl/rkap 2025':     'RUPTL',
};

function normalizeUrgency(raw: string): string {
  const key = raw.trim().toLowerCase();
  return URGENCY_NORMALIZE[key] ?? raw.trim();
}

type RowError = { row: number; field: string; message: string };

@Injectable()
export class ImportService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  private parseBuffer(buffer: Buffer): Record<string, any>[] {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    // Prefer "ALL" sheet, fallback to first sheet
    const sheetName = wb.SheetNames.includes('ALL') ? 'ALL' : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];

    // Row 0 = summary counts, Row 1 = actual headers, data from Row 2
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
    range.s.r = 1; // use row index 1 as header row
    ws['!ref'] = XLSX.utils.encode_range(range);

    return XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
  }

  private validateRows(rows: Record<string, any>[]) {
    const valid: any[] = [];
    const errors: RowError[] = [];

    rows.forEach((row, i) => {
      const n = i + 3; // data starts at Excel row 3 (1-indexed, skip summary + header)
      const g = (k: string) => String(row[k] ?? '').trim();

      // Skip blank/summary rows
      const rowNum = g('NO.');
      if (!rowNum || isNaN(Number(rowNum))) return;

      const rowErrors: RowError[] = [];

      const name      = g('NAMA PROYEK');
      const ruptlCode = g('RUPTL CODE');
      const stageRaw  = g('ACTUAL STAGE').toLowerCase();
      const typeRaw   = g('TIPE PROYEK').toLowerCase();
      const status    = g('STATUS') || 'On-track';
      const province  = g('LOKASI');
      const regionRaw = g('REGION');
      const region    = regionRaw;
      const island    = REGION_TO_ISLAND[regionRaw.toLowerCase()] ?? regionRaw;
      const gridSystem = g('SISTEM KELISTRIKAN');

      const stage = STAGE_MAP[stageRaw];
      const type  = TYPE_MAP[typeRaw];

      // lat/lng from user-added columns AS (index 44) and AT (index 45)
      // XLSX sheet_to_json uses column headers; user will add headers "Latitude" and "Longitude"
      const latRaw = g('Latitude')  || g('LAT') || g('lat') || '';
      const lngRaw = g('Longitude') || g('LNG') || g('lng') || '';
      const lat    = latRaw ? parseFloat(latRaw) : null;
      const lng    = lngRaw ? parseFloat(lngRaw) : null;

      const isTransmission = typeRaw === 'trans';

      // Required field validation
      if (!name)                    rowErrors.push({ row: n, field: 'NAMA PROYEK',  message: 'Wajib diisi' });
      if (!ruptlCode)               rowErrors.push({ row: n, field: 'RUPTL CODE',   message: 'Wajib diisi' });
      if (!stage)                   rowErrors.push({ row: n, field: 'ACTUAL STAGE', message: `Nilai tidak valid: "${g('ACTUAL STAGE')}"` });
      if (!type)                    rowErrors.push({ row: n, field: 'TIPE PROYEK',  message: `Nilai tidak valid: "${g('TIPE PROYEK')}"` });
      if (!isTransmission && (lat === null || isNaN(lat))) rowErrors.push({ row: n, field: 'Latitude',  message: 'Wajib diisi untuk tipe ini' });
      if (!isTransmission && (lng === null || isNaN(lng))) rowErrors.push({ row: n, field: 'Longitude', message: 'Wajib diisi untuk tipe ini' });

      if (rowErrors.length) { errors.push(...rowErrors); return; }

      // Optional fields
      const priority       = g('Prioritas') || null;
      const urgencyRaw     = g('URGENSI');
      const urgencyCategory = urgencyRaw ? [normalizeUrgency(urgencyRaw)] : [];

      const codTargetRUPTL  = g('COD RUPTL')        ? String(g('COD RUPTL'))        : null;
      const codKontraktual  = g('COD KONTRAKTUAL')   || null;
      const codEstimasi     = g('COD ESTIMASI')      || null;
      const issueType       = g('Tipe Issue')        || 'Tidak ada Issue';
      const issueStrategic  = g('Issue Strategis')   || null;
      const notification    = g('NOTIFIKASI')        || null;
      const bpoNotes        = g('Keterangan BPO (Pembahasan Check Point)') || null;

      const bpoRaw          = row['Last Modified\nKeterangan BPO\n(Pembahasan Check point)'];
      const bpoLastModified = bpoRaw instanceof Date ? bpoRaw : (bpoRaw ? new Date(bpoRaw) : null);

      const comment         = g('Comment') || null;

      const progressPlan      = parseFloat(String(row['RENCANA PROGRESS KONSTRUKSI \n(%)']  ?? 0)) || 0;
      const progressRealisasi = parseFloat(String(row['REALISASI PROGRESS KONSTRUKSI \n(%)'] ?? 0)) || 0;
      const deviasi           = parseFloat(String(row['DEVIASI'] ?? 0)) || 0;

      // Derive subtype from type
      const subtypeMap: Record<string, string> = {
        gi: 'Gardu Induk', trans: 'Transmisi', kit: 'KIT',
        'kit-ebt': 'KIT-EBT', 'kit-nonebt': 'KIT-NONEBT',
        fsru: 'FSRU', 'kit (relokasi)': 'KIT Relokasi',
      };
      const subtype = subtypeMap[typeRaw] ?? '';

      // Capacity
      const capacityRaw  = row['KAPASITAS'];
      const capacity     = capacityRaw !== '' ? parseFloat(String(capacityRaw)) || null : null;
      const capacityUnit = g('SATUAN') || null;

      // Relationship columns (user-added): AU = relatedCodes, AV = lineFromCode, AW = lineToCode
      const relatedRaw   = g('Related Projects') || g('RELATED PROJECTS') || '';
      const lineFromCode = g('Line From') || g('LINE FROM') || g('lineFromCode') || '';
      const lineToCode   = g('Line To')   || g('LINE TO')   || g('lineToCode')   || '';
      const relatedCodes = relatedRaw ? relatedRaw.split(';').map((s: string) => s.trim()).filter(Boolean) : [];

      valid.push({
        name, type, subtype, ruptlCode, stage, status, priority,
        codTargetRUPTL, codKontraktual, codEstimasi,
        issueType, issueStrategic,
        progressPlan, progressRealisasi, deviasi,
        lat: (!isTransmission && lat !== null && !isNaN(lat)) ? lat : null,
        lng: (!isTransmission && lng !== null && !isNaN(lng)) ? lng : null,
        island, region, province, gridSystem,
        capacity, capacityUnit,
        notification, bpoNotes, bpoLastModified, comment,
        urgencyCategory,
        relatedProjects: [],
        // Temporary — resolved to IDs in Pass 2
        _lineFromCode: lineFromCode || null,
        _lineToCode:   lineToCode   || null,
        _relatedCodes: relatedCodes,
      });
    });

    return { valid, errors };
  }

  // Build a ruptlCode → id map (checks batch + DB)
  private async resolveCodeMap(
    codes: string[],
    batchByCode: Map<string, string>,
  ): Promise<Map<string, string>> {
    const unknown = codes.filter(c => !batchByCode.has(c));
    const map = new Map(batchByCode);
    if (unknown.length) {
      const found = await this.prisma.project.findMany({
        where:  { ruptlCode: { in: unknown } },
        select: { id: true, ruptlCode: true },
      });
      found.forEach(p => map.set(p.ruptlCode, p.id));
    }
    return map;
  }

  async preview(buffer: Buffer) {
    const rows = this.parseBuffer(buffer);
    if (!rows.length) throw new BadRequestException('File kosong atau format tidak dikenali');
    const { valid, errors } = this.validateRows(rows);

    const previewRows = valid.slice(0, 5).map(({ _lineFromCode, _lineToCode, _relatedCodes, ...rest }) => ({
      ...rest,
      lineFromCode: _lineFromCode  || null,
      lineToCode:   _lineToCode    || null,
      relatedCodes: _relatedCodes?.join('; ') || null,
    }));

    return {
      totalRows: rows.length,
      validRows: valid.length,
      errorRows: errors.length,
      errors:    errors.slice(0, 50),
      preview:   previewRows,
    };
  }

  async commit(buffer: Buffer, userId: string, userEmail: string, ip?: string) {
    const rows = this.parseBuffer(buffer);
    const { valid, errors } = this.validateRows(rows);
    if (errors.length) throw new BadRequestException({ message: 'Ada baris tidak valid', errors: errors.slice(0, 20) });

    // ── Pass 1: upsert all project records (without relationships) ─────────────
    let inserted = 0, skipped = 0;
    const batchByCode = new Map<string, string>();

    for (const project of valid) {
      const { _lineFromCode, _lineToCode, _relatedCodes, ...data } = project;
      try {
        const upserted = await this.prisma.project.upsert({
          where:  { ruptlCode: data.ruptlCode },
          update: { ...data, updatedById: userId },
          create: { ...data, createdById: userId },
          select: { id: true, ruptlCode: true },
        });
        batchByCode.set(upserted.ruptlCode, upserted.id);
        inserted++;
      } catch { skipped++; }
    }

    // ── Pass 2: resolve relationship codes → IDs ───────────────────────────────
    const allCodes = new Set<string>();
    for (const p of valid) {
      if (p._lineFromCode) allCodes.add(p._lineFromCode);
      if (p._lineToCode)   allCodes.add(p._lineToCode);
      p._relatedCodes.forEach((c: string) => allCodes.add(c));
    }

    let relResolved = 0;
    if (allCodes.size > 0) {
      const codeMap = await this.resolveCodeMap([...allCodes], batchByCode);

      for (const project of valid) {
        const id = batchByCode.get(project.ruptlCode);
        if (!id) continue;

        const lineFromId      = project._lineFromCode ? codeMap.get(project._lineFromCode) ?? null : null;
        const lineToId        = project._lineToCode   ? codeMap.get(project._lineToCode)   ?? null : null;
        const relatedProjects = project._relatedCodes
          .map((c: string) => codeMap.get(c))
          .filter(Boolean) as string[];

        if (!lineFromId && !lineToId && !relatedProjects.length) continue;

        await this.prisma.project.update({
          where: { id },
          data:  { lineFromId, lineToId, relatedProjects },
        }).catch(() => null);
        relResolved++;
      }
    }

    await this.audit.log({
      userId, userEmail, action: 'IMPORT', entity: 'Project',
      diff: { inserted, skipped, total: valid.length, relResolved }, ip,
    });

    await this.cache.del('analytics:summary');
    return { inserted, skipped, total: valid.length, relResolved };
  }
}
