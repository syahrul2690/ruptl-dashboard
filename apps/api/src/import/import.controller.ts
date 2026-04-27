import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ImportService } from './import.service';

@Controller('projects/import')
@UseGuards(AuthGuard('access'), RolesGuard)
@Roles(Role.ADMIN, Role.PIC)
export class ImportController {
  constructor(private importService: ImportService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  preview(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File wajib diunggah');
    return this.importService.preview(file.buffer);
  }

  @Post('commit')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  commit(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any, @Req() req: Request) {
    if (!file) throw new BadRequestException('File wajib diunggah');
    return this.importService.commit(file.buffer, user.id, user.email, req.ip);
  }
}
