import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ProjectStatus, ProjectType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const STATUS_MAP: Record<string, ProjectStatus> = {
  'energized':        ProjectStatus.ENERGIZED,
  'construction':     ProjectStatus.CONSTRUCTION,
  'pre-construction': ProjectStatus.PRE_CONSTRUCTION,
  'pre construction': ProjectStatus.PRE_CONSTRUCTION,
};

const TYPE_MAP: Record<string, ProjectType> = {
  'power plant':     ProjectType.POWER_PLANT,
  'substation':      ProjectType.SUBSTATION,
  'transmission line': ProjectType.TRANSMISSION_LINE,
};

type RowError = { row: number; field: string; message: string };

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

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

      const name      = g('name',      'Nama Proyek');
      const type      = g('type',      'Tipe Proyek').toLowerCase();
      const status    = g('status',    'Status').toLowerCase();
      const ruptlCode = g('ruptlCode', 'Kode RUPTL');
      const province  = g('province',  'Provinsi');
      const island    = g('island',    'Pulau');
      const gridSystem = g('gridSystem', 'Sistem Grid');
      const lat       = parseFloat(g('lat', 'Latitude'));
      const lng       = parseFloat(g('lng', 'Longitude'));

      if (!name)              rowErrors.push({ row: n, field: 'name',      message: 'Wajib diisi' });
      if (!TYPE_MAP[type])    rowErrors.push({ row: n, field: 'type',      message: `Nilai tidak valid: "${type}"` });
      if (!STATUS_MAP[status]) rowErrors.push({ row: n, field: 'status',   message: `Nilai tidak valid: "${status}"` });
      if (!ruptlCode)         rowErrors.push({ row: n, field: 'ruptlCode', message: 'Wajib diisi' });
      if (!province)          rowErrors.push({ row: n, field: 'province',  message: 'Wajib diisi' });
      if (!island)            rowErrors.push({ row: n, field: 'island',    message: 'Wajib diisi' });
      if (!gridSystem)        rowErrors.push({ row: n, field: 'gridSystem', message: 'Wajib diisi' });
      if (isNaN(lat))         rowErrors.push({ row: n, field: 'lat',       message: 'Harus angka valid' });
      if (isNaN(lng))         rowErrors.push({ row: n, field: 'lng',       message: 'Harus angka valid' });

      if (rowErrors.length) {
        errors.push(...rowErrors);
        return;
      }

      const urgency = g('urgencyCategory', 'Kategori Urgensi');
      valid.push({
        name,
        type:              TYPE_MAP[type],
        subtype:           g('subtype',   'Sub-tipe'),
        ruptlCode,
        status:            STATUS_MAP[status],
        codTargetRUPTL:    g('codTargetRUPTL',   '') || null,
        codKontraktual:    g('codKontraktual',    '') || null,
        codEstimasi:       g('codEstimasi',       '') || null,
        issueType:         g('issueType', '') || 'None',
        progressPlan:      parseInt(String(row['progressPlan'] || 0)) || 0,
        progressRealisasi: parseInt(String(row['progressRealisasi'] || 0)) || 0,
        deviasi:           parseInt(String(row['deviasi'] || 0)) || 0,
        lat, lng, island, province, gridSystem,
        capacity:      parseFloat(String(row['capacity'] || '')) || null,
        capacityUnit:  g('capacityUnit', '') || null,
        circuitLength: parseFloat(String(row['circuitLength'] || '')) || null,
        voltageLevel:  g('voltageLevel', '') || null,
        detail:        g('detail', '') || null,
        urgencyCategory: urgency ? urgency.split(';').map((s: string) => s.trim()).filter(Boolean) : [],
        relatedProjects: [],
      });
    });

    return { valid, errors };
  }

  async preview(buffer: Buffer) {
    const rows = this.parseBuffer(buffer);
    if (!rows.length) throw new BadRequestException('File kosong atau format tidak dikenali');
    const { valid, errors } = this.validateRows(rows);
    return {
      totalRows: rows.length,
      validRows: valid.length,
      errorRows: errors.length,
      errors:    errors.slice(0, 50),
      preview:   valid.slice(0, 5),
    };
  }

  async commit(buffer: Buffer, userId: string, userEmail: string, ip?: string) {
    const rows = this.parseBuffer(buffer);
    const { valid, errors } = this.validateRows(rows);
    if (errors.length) throw new BadRequestException({ message: 'Ada baris tidak valid', errors: errors.slice(0, 20) });

    let inserted = 0, skipped = 0;
    for (const project of valid) {
      try {
        await this.prisma.project.upsert({
          where:  { ruptlCode: project.ruptlCode },
          update: { ...project, updatedById: userId },
          create: { ...project, createdById: userId },
        });
        inserted++;
      } catch { skipped++; }
    }

    await this.audit.log({
      userId, userEmail, action: 'IMPORT', entity: 'Project',
      diff: { inserted, skipped, total: valid.length }, ip,
    });

    return { inserted, skipped, total: valid.length };
  }
}
