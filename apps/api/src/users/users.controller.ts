import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(AuthGuard('access'), RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()    findAll()                                    { return this.users.findAll(); }
  @Get(':id') findOne(@Param('id') id: string)          { return this.users.findOne(id); }
  @Post()   create(@Body() dto: CreateUserDto)           { return this.users.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.users.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string)        { return this.users.remove(id); }
}
