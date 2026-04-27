import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';

const SLIM_SELECT = {
  id: true, lat: true, lng: true, status: true,
  type: true, subtype: true, issueType: true,
  name: true, island: true, province: true, urgencyCategory: true,
  lineFromId: true, lineToId: true,
};

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findAll(q: ListProjectsDto) {
    const where: Prisma.ProjectWhereInput = {};
    if (q.status)   where.status   = q.status;
    if (q.province) where.province = q.province;
    if (q.island)   where.island   = q.island;
    if (q.urgency)  where.urgencyCategory = { has: q.urgency };
    if (q.search) {
      where.OR = [
        { name:      { contains: q.search, mode: 'insensitive' } },
        { ruptlCode: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const slim  = q.fields === 'slim';
    const page  = q.page  ?? 1;
    const limit = q.limit ?? 50;

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        select:   slim ? SLIM_SELECT : undefined,
        orderBy:  { updatedAt: 'desc' },
        skip:     (page - 1) * limit,
        take:     limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Proyek tidak ditemukan');
    return project;
  }

  async create(dto: CreateProjectDto, userId: string, userEmail: string, ip?: string) {
    const project = await this.prisma.project.create({ data: { ...dto, createdById: userId } });
    await this.audit.log({ userId, userEmail, action: 'CREATE', entity: 'Project', entityId: project.id, ip });
    return project;
  }

  async update(id: string, dto: UpdateProjectDto, userId: string, userEmail: string, ip?: string) {
    await this.findOne(id);
    const project = await this.prisma.project.update({
      where: { id },
      data:  { ...dto, updatedById: userId },
    });
    await this.audit.log({ userId, userEmail, action: 'UPDATE', entity: 'Project', entityId: id, diff: dto as object, ip });
    return project;
  }

  async remove(id: string, userId: string, userEmail: string, ip?: string) {
    await this.findOne(id);
    await this.prisma.project.delete({ where: { id } });
    await this.audit.log({ userId, userEmail, action: 'DELETE', entity: 'Project', entityId: id, ip });
    return { ok: true };
  }
}
