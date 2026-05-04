import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { UpsertProgressDto } from './dto/upsert-progress.dto';

@Controller('projects')
@UseGuards(AuthGuard('access'), RolesGuard)
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Get()
  findAll(@Query() q: ListProjectsDto) {
    return this.projects.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projects.findOne(id);
  }

  @Get(':id/progress')
  getProgress(@Param('id') id: string) {
    return this.projects.getProgress(id);
  }

  @Put(':id/progress')
  @Roles(Role.ADMIN, Role.PIC)
  upsertProgress(@Param('id') id: string, @Body() dto: UpsertProgressDto) {
    return this.projects.upsertProgress(id, dto.rows);
  }

  @Post()
  @Roles(Role.ADMIN, Role.PIC)
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: any, @Req() req: Request) {
    return this.projects.create(dto, user.id, user.email, req.ip);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.PIC)
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user: any, @Req() req: Request) {
    return this.projects.update(id, dto, user.id, user.email, req.ip);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.PIC)
  remove(@Param('id') id: string, @CurrentUser() user: any, @Req() req: Request) {
    return this.projects.remove(id, user.id, user.email, req.ip);
  }
}
