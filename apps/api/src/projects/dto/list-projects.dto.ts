import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ProjectStage, ProjectType } from '@prisma/client';

export class ListProjectsDto {
  @IsOptional() @IsEnum(ProjectStage)              stage?:    ProjectStage;
  @IsOptional() @IsString()                        status?:   string;
  @IsOptional() @IsEnum(ProjectType)               type?:     ProjectType;
  @IsOptional() @IsString()                        province?: string;
  @IsOptional() @IsString()                        island?:   string;
  @IsOptional() @IsString()                        region?:   string;
  @IsOptional() @IsString()                        urgency?:  string;
  @IsOptional() @IsString()                        search?:   string;
  @IsOptional() @IsString()                        sort?:     string;
  @IsOptional() @IsString()                        order?:    string;
  @IsOptional() @Transform(({ value }) => value === 'slim' ? 'slim' : undefined)
                                                   fields?:   'slim';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)             page?:  number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) limit?: number = 50;
}
