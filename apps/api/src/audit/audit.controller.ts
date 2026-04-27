import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { AuditService } from './audit.service';

@Controller('audit-log')
@UseGuards(AuthGuard('access'), RolesGuard)
@Roles(Role.ADMIN)
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  findAll(
    @Query('entity') entity?: string,
    @Query('userId') userId?: string,
    @Query('page')   page = '1',
    @Query('limit')  limit = '50',
  ) {
    return this.audit.findAll({ entity, userId, page: +page, limit: +limit });
  }
}
