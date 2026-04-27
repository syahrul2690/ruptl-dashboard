import { IsString, IsEnum, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional() @IsString()              name?:     string;
  @IsOptional() @IsEnum(Role)            role?:     Role;
  @IsOptional() @IsBoolean()             isActive?: boolean;
  @IsOptional() @IsString() @MinLength(8) password?: string;
}
