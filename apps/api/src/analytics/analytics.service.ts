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

    const [total, byStatus, byType, byIsland, byProvince] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.project.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.project.groupBy({ by: ['type'],   _count: { _all: true } }),
      this.prisma.project.groupBy({ by: ['island'], _count: { _all: true } }),
      this.prisma.project.groupBy({ by: ['province'], _count: { _all: true }, orderBy: { _count: { province: 'desc' } } }),
    ]);

    const [trackRaw, capacityRaw] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT
          SUM(CASE WHEN status = 'ENERGIZED' THEN 1 ELSE 0 END)::int                                                AS energized,
          SUM(CASE WHEN "progressRealisasi" <= 5 AND status != 'ENERGIZED' THEN 1 ELSE 0 END)::int                  AS idle,
          SUM(CASE WHEN deviasi < -3 AND status != 'ENERGIZED' THEN 1 ELSE 0 END)::int                             AS delayed,
          SUM(CASE WHEN deviasi >= -3 AND "progressRealisasi" > 5 AND status != 'ENERGIZED' THEN 1 ELSE 0 END)::int AS on_track
        FROM "Project"
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT
          COALESCE(SUM(CASE WHEN "capacityUnit" IN ('MW','MWp') THEN capacity ELSE 0 END), 0)::float  AS total_mw,
          COALESCE(SUM(CASE WHEN "capacityUnit" = 'MVA' THEN capacity ELSE 0 END), 0)::float           AS total_mva,
          COALESCE(SUM(CASE WHEN type = 'TRANSMISSION_LINE' THEN "circuitLength" ELSE 0 END), 0)::float AS total_km
        FROM "Project"
      `,
    ]);

    const summary = {
      total,
      byStatus:   byStatus.map(s => ({ status: s.status, count: s._count._all })),
      byType:     byType.map(t => ({ type: t.type, count: t._count._all })),
      byIsland:   byIsland.map(i => ({ island: i.island, count: i._count._all })),
      byProvince: byProvince.map(p => ({ province: p.province, count: p._count._all })),
      byTrack:    trackRaw[0],
      capacity:   capacityRaw[0],
    };

    await this.cache.set('analytics:summary', summary, 300_000);
    return summary;
  }
}
