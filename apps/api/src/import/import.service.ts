import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ProjectStatus, ProjectType } from '@prisma/client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const STATUS_MAP: Record<string, ProjectStatus> = {
  'energized':        ProjectStatus.ENERGIZED,
  'construction':     ProjectStatus.CONSTRUCTION,
  'pre-construction': ProjectStatus.PRE_CONSTRUCTION,
  'pre construction': ProjectStatus.PRE_CONSTRUCTION,
};

const TYPE_MAP: Record<string, ProjectType> = {
  'power plant':       ProjectType.POWER_PLANT,
  'substation':        ProjectType.SUBSTATION,
  'transmission line': ProjectType.TRANSMISSION_LINE,
};

type RowError = { row: number; field: string; message: string };

@Injectable()
export class ImportService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  private parseBuffer(buffer: Buffer): Record<string, any>[] {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
  }

  private validateRows(rows: Record<string, any>[]) {
    const valid: any[] = [];
    const errors: RowError[] = [];

    rows.forEach((row, i) => {
      const n = i + 2;
      const rowErrors: RowError[] = [];
      const g = (k: string, alt: string) => String(row[k] || row[alt] || '').trim();

      const name       = g('name',       'Nama Proyek');
      const type       = g('type',       'Tipe Proyek').toLowerCase();
      const status     = g('status',     'Status').toLowerCase();
      const ruptlCode  = g('ruptlCode',  'Kode RUPTL');
      const province   = g('province',   'Provinsi');
      const island     = g('island',     'Pulau');
      const gridSystem = g('gridSystem', 'Sistem Grid');
      const latRaw     = g('lat', 'Latitude');
      const lngRaw     = g('lng', 'Longitude');
      const lat        = latRaw ? parseFloat(latRaw) : null;
      const lng        = lngRaw ? parseFloat(lngRaw) : null;
      const isTransmission = type === 'transmission line';

      if (!name)               rowErrors.push({ row: n, field: 'name',       message: 'Wajib diisi' });
      if (!TYPE_MAP[type])     rowErrors.push({ row: n, field: 'type',       message: `Nilai tidak valid: "${type}"` });
      if (!STATUS_MAP[status]) rowErrors.push({ row: n, field: 'status',     message: `Nilai tidak valid: "${status}"` });
      if (!ruptlCode)          rowErrors.push({ row: n, field: 'ruptlCode',  message: 'Wajib diisi' });
      if (!province)           rowErrors.push({ row: n, field: 'province',   message: 'Wajib diisi' });
      if (!island)             rowErrors.push({ row: n, field: 'island',     message: 'Wajib diisi' });
      if (!gridSystem)         rowErrors.push({ row: n, field: 'gridSystem', message: 'Wajib diisi' });
      // lat/lng only required for Power Plant and Substation — Transmission Line derives position from endpoints
      if (!isTransmission && (lat === null || isNaN(lat))) rowErrors.push({ row: n, field: 'lat', message: 'Wajib diisi untuk tipe ini' });
      if (!isTransmission && (lng === null || isNaN(lng))) rowErrors.push({ row: n, field: 'lng', message: 'Wajib diisi untuk tipe ini' });

      if (rowErrors.length) { errors.push(...rowErrors); return; }

      const urgency      = g('urgencyCategory', 'Kategori Urgensi');
      // Relationship columns — store raw ruptlCodes, resolved to IDs at commit time
      const lineFromCode = g('lineFromCode', 'Kode Dari');
      const lineToCode   = g('lineToCode',   'Kode Ke');
      const relatedRaw   = g('relatedCodes', 'Kode Terkait');
      const relatedCodes = relatedRaw ? relatedRaw.split(';').map((s: string) => s.trim()).filter(Boolean) : [];

      valid.push({
        name,
        type:              TYPE_MAP[type],
        subtype:           g('subtype', 'Sub-tipe'),
        ruptlCode,
        status:            STATUS_MAP[status],
        codTargetRUPTL:    g('codTargetRUPTL',  '') || null,
        codKontraktual:    g('codKontraktual',   '') || null,
        codEstimasi:       g('codEstimasi',      '') || null,
        issueType:         g('issueType', '')        || 'None',
        progressPlan:      parseInt(String(row['progressPlan']      || 0)) || 0,
        progressRealisasi: parseInt(String(row['progressRealisasi'] || 0)) || 0,
        deviasi:           parseInt(String(row['deviasi']           || 0)) || 0,
        lat: (lat !== null && !isNaN(lat)) ? lat : null,
        lng: (lng !== null && !isNaN(lng)) ? lng : null,
        island, province, gridSystem,
        capacity:      parseFloat(String(row['capacity']      || '')) || null,
        capacityUnit:  g('capacityUnit', '') || null,
        circuitLength: parseFloat(String(row['circuitLength'] || '')) || null,
        voltageLevel:  g('voltageLevel', '') || null,
        detail:        g('detail', '')       || null,
        urgencyCategory: urgency ? urgency.split(';').map((s: string) => s.trim()).filter(Boolean) : [],
        relatedProjects: [],
        // Temporary fields — not sent to Prisma, resolved after upsert
        _lineFromCode: lineFromCode || null,
        _lineToCode:   lineToCode   || null,
        _relatedCodes: relatedCodes,
      });
    });

    return { valid, errors };
  }

  // Build a ruptlCode → id map for a set of codes (checks DB + batch itself)
  private async resolveCodeMap(
    codes: string[],
    batchByCode: Map<string, string>,  // ruptlCode → id (already upserted)
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

    // Strip internal fields for preview output
    const previewRows = valid.slice(0, 5).map(({ _lineFromCode, _lineToCode, _relatedCodes, ...rest }) => ({
      ...rest,
      lineFromCode:  _lineFromCode  || null,
      lineToCode:    _lineToCode    || null,
      relatedCodes:  _relatedCodes?.join('; ') || null,
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

    // ── Pass 1: upsert all project records (without relationships) ─────────
    let inserted = 0, skipped = 0;
    const batchByCode = new Map<string, string>(); // ruptlCode → id

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

    // ── Pass 2: resolve relationship codes → IDs, patch each project ──────
    // Collect all codes that need resolution
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
        if (!id) continue; // was skipped in pass 1

        const lineFromId     = project._lineFromCode ? codeMap.get(project._lineFromCode) ?? null : null;
        const lineToId       = project._lineToCode   ? codeMap.get(project._lineToCode)   ?? null : null;
        const relatedProjects= project._relatedCodes
          .map((c: string) => codeMap.get(c))
          .filter(Boolean) as string[];

        const hasRelationship = lineFromId || lineToId || relatedProjects.length > 0;
        if (!hasRelationship) continue;

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
