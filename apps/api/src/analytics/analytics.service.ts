import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async getSummary() {
    const cached = await this.cache.get('analytics:summary');
    if (cached) return cached;

    // ── Count aggregates ────────────────────────────────────────────────────────
    const [total, byStage, byType, byState, byIsland, byProvince, byRegion, byUipRaw] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.project.groupBy({ by: ['stage'],    _count: { _all: true } }),
      this.prisma.project.groupBy({ by: ['type'],     _count: { _all: true } }),
      this.prisma.project.groupBy({ by: ['status'],   _count: { _all: true } }),
      this.prisma.project.groupBy({ by: ['island'],   _count: { _all: true } }),
      this.prisma.project.groupBy({
        by: ['province'], _count: { _all: true },
        where: { province: { not: '' } },
        orderBy: { _count: { province: 'desc' } },
      }),
      this.prisma.project.groupBy({
        by: ['region'],  _count: { _all: true },
        orderBy: { _count: { region: 'desc' } },
      }),
      this.prisma.project.groupBy({
        by: ['uip'], _count: { _all: true },
        _sum: { openIssues: true, overdueIssues: true },
        orderBy: { _sum: { openIssues: 'desc' } },
      }),
    ]);

    // ── Track + global capacity + issue/amendment totals ────────────────────────
    const [trackRaw, capacityRaw, pressureRaw] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT
          SUM(CASE WHEN stage = 'COD'        THEN 1 ELSE 0 END)::int                                               AS energized,
          SUM(CASE WHEN "progressRealisasi" <= 5 AND stage != 'COD' THEN 1 ELSE 0 END)::int                        AS idle,
          SUM(CASE WHEN deviasi < -3 AND stage != 'COD' THEN 1 ELSE 0 END)::int                                    AS delayed,
          SUM(CASE WHEN deviasi >= -3 AND "progressRealisasi" > 5 AND stage != 'COD' THEN 1 ELSE 0 END)::int       AS on_track
        FROM "Project"
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT
          COALESCE(SUM(CASE WHEN "capacityUnit" = 'MW'  THEN capacity ELSE 0 END), 0)::float  AS total_mw,
          COALESCE(SUM(CASE WHEN "capacityUnit" = 'MVA' THEN capacity ELSE 0 END), 0)::float  AS total_mva,
          COALESCE(SUM("circuitLength"), 0)::float                                            AS total_km
        FROM "Project"
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT
          COALESCE(SUM("openIssues"), 0)::int      AS open_issues,
          COALESCE(SUM("overdueIssues"), 0)::int   AS overdue_issues,
          COALESCE(SUM("amendmentCount"), 0)::int  AS amendment_count,
          COALESCE(SUM("eotCount"), 0)::int        AS eot_count,
          COALESCE(SUM("voCount"), 0)::int         AS vo_count
        FROM "Project"
      `,
    ]);

    // ── Capacity / length per province ──────────────────────────────────────────
    const [mwByProvince, kmByProvince] = await Promise.all([
      this.prisma.project.groupBy({
        by:    ['province'],
        where: { capacityUnit: 'MW', capacity: { not: null }, province: { not: '' } },
        _sum:  { capacity: true },
        orderBy: { _sum: { capacity: 'desc' } },
      }),
      this.prisma.project.groupBy({
        by:    ['province'],
        where: { circuitLength: { not: null }, province: { not: '' } },
        _sum:  { circuitLength: true },
        orderBy: { _sum: { circuitLength: 'desc' } },
      }),
    ]);

    // ── National snapshot (issue categories, amendment types, COD pipeline) ─────
    const snapshotRow = await this.prisma.analyticsSnapshot.findUnique({ where: { key: 'pmo' } });
    const snapshot = (snapshotRow?.data as any) ?? {
      issueByCategory: [], amendmentByType: [], codPipeline: [], codSlippage: [], codWithTargetOnly: 0,
    };

    const byUip = byUipRaw
      .filter(u => u.uip)
      .map(u => ({
        uip: u.uip,
        projects: u._count._all,
        openIssues: u._sum.openIssues ?? 0,
        overdueIssues: u._sum.overdueIssues ?? 0,
      }))
      .sort((a, b) => b.openIssues - a.openIssues);

    const summary = {
      total,
      byStage:    byStage.map(s    => ({ stage:     s.stage,     count: s._count._all })),
      byType:     byType.map(t     => ({ type:      t.type,      count: t._count._all })),
      byState:    byState.map(s    => ({ state:     s.status,    count: s._count._all })).sort((a, b) => b.count - a.count),
      byIsland:   byIsland.map(i   => ({ island:    i.island,    count: i._count._all })),
      byProvince: byProvince.map(p => ({ province:  p.province,  count: p._count._all })),
      byRegion:   byRegion.map(r   => ({ region:    r.region,    count: r._count._all })),
      byTrack:    trackRaw[0],
      capacity:   capacityRaw[0],
      pressure:   pressureRaw[0],
      byUip,

      mwByProvince: mwByProvince.map(r => ({ province: r.province, value: Math.round(+(r._sum.capacity ?? 0)) })),
      kmByProvince: kmByProvince.map(r => ({ province: r.province, value: Math.round(+(r._sum.circuitLength ?? 0)) })),

      issueByCategory: snapshot.issueByCategory,
      amendmentByType: snapshot.amendmentByType,
      codPipeline: snapshot.codPipeline,
      codSlippage: snapshot.codSlippage,
      codWithTargetOnly: snapshot.codWithTargetOnly,
      sourceFile: snapshot.sourceFile ?? null,
      importedAt: snapshot.importedAt ?? null,
    };

    await this.cache.set('analytics:summary', summary, 300_000);
    return summary;
  }
}
