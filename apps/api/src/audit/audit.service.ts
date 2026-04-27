import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface LogPayload {
  userId: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId?: string;
  diff?: object;
  ip?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(payload: LogPayload) {
    return this.prisma.auditLog.create({ data: payload }).catch(() => null);
  }

  findAll(params: { entity?: string; userId?: string; page?: number; limit?: number }) {
    const { entity, userId, page = 1, limit = 50 } = params;
    const where: Record<string, any> = {};
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    return Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]).then(([data, total]) => ({ data, total, page, limit }));
  }
}
